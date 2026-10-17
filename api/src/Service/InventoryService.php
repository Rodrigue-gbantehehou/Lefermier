<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Inventory\CreateInventoryItemRequestDto;
use App\Dto\Inventory\CreateStockMovementRequestDto;
use App\Dto\Inventory\UpdateInventoryItemRequestDto;
use App\Entity\Farm;
use App\Entity\InventoryItem;
use App\Entity\StockMovement;
use App\Entity\User;
use App\Enum\StockMovementType;
use App\Exception\DuplicateInventoryItemException;
use App\Exception\InsufficientStockException;
use App\Repository\FlockRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\StockMovementRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Ulid;

class InventoryService
{
    public function __construct(
        private readonly InventoryItemRepository $itemRepository,
        private readonly StockMovementRepository $movementRepository,
        private readonly FlockRepository $flockRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function createItem(Farm $farm, CreateInventoryItemRequestDto $dto, ?User $recordedBy = null): InventoryItem
    {
        $existing = $this->itemRepository->findOneBy([
            'farm' => $farm,
            'name' => $dto->name,
            'category' => $dto->category,
        ]);

        if ($existing !== null) {
            throw new DuplicateInventoryItemException($dto->name, $dto->category->value);
        }

        return $this->entityManager->wrapInTransaction(function () use ($farm, $dto, $recordedBy): InventoryItem {
            $item = new InventoryItem($farm, $dto->name, $dto->category, $dto->unit);
            $item->setAlertThreshold($dto->alertThreshold);
            $item->setUnitPrice($dto->unitPrice);
            $item->setNotes($dto->notes);

            $this->entityManager->persist($item);

            if ($dto->initialStock > 0.0) {
                $item->setCurrentStock($dto->initialStock);

                $movement = new StockMovement(
                    $item,
                    StockMovementType::INCOMING,
                    $dto->initialStock,
                    $dto->unit,
                    new \DateTimeImmutable(),
                    'Stock initial au démarrage',
                    null,
                    $dto->unitPrice,
                    $recordedBy,
                );
                $this->entityManager->persist($movement);
            }

            $this->entityManager->flush();

            return $item;
        });
    }

    public function updateItem(InventoryItem $item, UpdateInventoryItemRequestDto $dto): InventoryItem
    {
        $item->setName($dto->name);
        $item->setUnit($dto->unit);
        $item->setAlertThreshold($dto->alertThreshold);
        $item->setUnitPrice($dto->unitPrice);
        $item->setNotes($dto->notes);
        $item->setIsActive($dto->isActive);

        $this->entityManager->flush();

        return $item;
    }

    public function recordMovement(InventoryItem $item, CreateStockMovementRequestDto $dto, ?User $recordedBy = null): StockMovement
    {
        return $this->entityManager->wrapInTransaction(function () use ($item, $dto, $recordedBy): StockMovement {
            $movementDate = new \DateTimeImmutable($dto->movementDate);
            $qty = $dto->quantity;
            $currentStock = $item->getCurrentStock();
            $movementUnit = $dto->unit ?? $item->getUnit();
            $itemUnit = $item->getUnit();

            // Conversion automatique vers l'unité de stockage de l'article (ex: KG <-> BAG_50KG)
            $effectiveQtyInItemUnit = $movementUnit->convertTo($qty, $itemUnit);

            // Règle métier : décompte ou ajout
            if (in_array($dto->type, [StockMovementType::FEEDING, StockMovementType::LOSS], true)) {
                if ($effectiveQtyInItemUnit > $currentStock) {
                    throw new InsufficientStockException(
                        $qty,
                        $itemUnit->convertTo($currentStock, $movementUnit),
                        $movementUnit->getShortLabel()
                    );
                }
                $item->setCurrentStock($currentStock - $effectiveQtyInItemUnit);
            } elseif ($dto->type === StockMovementType::INCOMING) {
                $item->setCurrentStock($currentStock + $effectiveQtyInItemUnit);
                if ($dto->unitPrice !== null) {
                    // Calculer le prix unitaire ramené à l'unité de stockage de l'article
                    $costPerItemUnit = ($effectiveQtyInItemUnit > 0.0)
                        ? (int) round(($dto->unitPrice * $qty) / $effectiveQtyInItemUnit)
                        : $dto->unitPrice;
                    $item->setUnitPrice($costPerItemUnit);
                }
            } elseif ($dto->type === StockMovementType::ADJUSTMENT) {
                $item->setCurrentStock($effectiveQtyInItemUnit);
            }

            // Bande destinataire (si distribution d'aliment)
            $flock = null;
            if ($dto->flockId !== null) {
                $flock = $this->flockRepository->find(Ulid::fromString($dto->flockId));
                if ($flock === null || $flock->getFarm()->getId()?->toBase32() !== $item->getFarm()->getId()?->toBase32()) {
                    throw new NotFoundHttpException("La bande spécifiée n'appartient pas à cette exploitation.");
                }
            }

            $movement = new StockMovement(
                $item,
                $dto->type,
                $qty,
                $movementUnit,
                $movementDate,
                $dto->reason,
                $flock,
                $dto->unitPrice,
                $recordedBy,
            );

            $this->entityManager->persist($movement);
            $this->entityManager->flush();

            return $movement;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeItem(InventoryItem $item, bool $includeMovements = false): array
    {
        $unit = $item->getUnit();
        $data = [
            'id' => $item->getId()?->toBase32(),
            'farmId' => $item->getFarm()->getId()?->toBase32(),
            'name' => $item->getName(),
            'category' => $item->getCategory()->value,
            'unit' => $unit->value,
            'unitLabel' => $unit->getLabel(),
            'unitShortLabel' => $unit->getShortLabel(),
            'unitFamily' => $unit->getFamily(),
            'currentStock' => $item->getCurrentStock(),
            'alertThreshold' => $item->getAlertThreshold(),
            'isLowStock' => $item->isLowStock(),
            'unitPrice' => $item->getUnitPrice(),
            'estimatedTotalValue' => $item->getUnitPrice() !== null
                ? (int) round($item->getUnitPrice() * $item->getCurrentStock())
                : null,
            'currency' => $item->getFarm()->getCurrency(),
            'notes' => $item->getNotes(),
            'isActive' => $item->isActive(),
            'createdAt' => $item->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $item->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];

        if ($includeMovements) {
            $data['movements'] = array_map([$this, 'serializeMovement'], $item->getMovements()->toArray());
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMovement(StockMovement $movement): array
    {
        $unit = $movement->getUnit();
        return [
            'id' => $movement->getId()?->toBase32(),
            'itemId' => $movement->getItem()->getId()?->toBase32(),
            'type' => $movement->getType()->value,
            'quantity' => $movement->getQuantity(),
            'unit' => $unit->value,
            'unitLabel' => $unit->getLabel(),
            'unitShortLabel' => $unit->getShortLabel(),
            'unitPrice' => $movement->getUnitPrice(),
            'totalCost' => $movement->getTotalCost(),
            'movementDate' => $movement->getMovementDate()->format('Y-m-d'),
            'reason' => $movement->getReason(),
            'flock' => $movement->getFlock() !== null ? [
                'id' => $movement->getFlock()->getId()?->toBase32(),
                'code' => $movement->getFlock()->getCode(),
                'name' => $movement->getFlock()->getName(),
            ] : null,
            'recordedBy' => $movement->getRecordedBy() !== null ? [
                'id' => $movement->getRecordedBy()->getId()?->toBase32(),
                'name' => $movement->getRecordedBy()->getFullName(),
            ] : null,
            'createdAt' => $movement->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
