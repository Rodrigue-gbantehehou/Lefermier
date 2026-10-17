<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Flock\CreateFlockMovementRequestDto;
use App\Dto\Flock\CreateFlockRequestDto;
use App\Dto\Flock\UpdateFlockRequestDto;
use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\FlockMovement;
use App\Entity\User;
use App\Enum\FlockMovementType;
use App\Enum\FlockStatus;
use App\Exception\DuplicateFlockCodeException;
use App\Exception\InsufficientFlockQuantityException;
use App\Repository\BuildingRepository;
use App\Repository\FlockMovementRepository;
use App\Repository\FlockRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Ulid;

class FlockService
{
    public function __construct(
        private readonly FlockRepository $flockRepository,
        private readonly FlockMovementRepository $movementRepository,
        private readonly BuildingRepository $buildingRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function createFlock(Farm $farm, CreateFlockRequestDto $dto): Flock
    {
        // 1. Vérification de l'unicité du code de bande dans la ferme
        $existing = $this->flockRepository->findOneBy(['farm' => $farm, 'code' => $dto->code]);
        if ($existing !== null) {
            throw new DuplicateFlockCodeException($dto->code);
        }

        // 2. Vérification du bâtiment s'il est spécifié
        $building = null;
        if ($dto->buildingId !== null) {
            $building = $this->buildingRepository->find(Ulid::fromString($dto->buildingId));
            if ($building === null || $building->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("Le bâtiment spécifié n'existe pas dans cette exploitation.");
            }
        }

        $startDate = new \DateTimeImmutable($dto->startDate);
        $flock = new Flock(
            $farm,
            $dto->code,
            $dto->name,
            $dto->initialQuantity,
            $startDate,
            $dto->poultryType,
        );

        $flock->setStrain($dto->strain);
        $flock->setInitialAgeDays($dto->initialAgeDays);
        $flock->setBuilding($building);
        $flock->setNotes($dto->notes);

        if ($dto->estimatedEndDate !== null) {
            $flock->setEstimatedEndDate(new \DateTimeImmutable($dto->estimatedEndDate));
        }

        $this->entityManager->persist($flock);
        $this->entityManager->flush();

        return $flock;
    }

    public function updateFlock(Flock $flock, UpdateFlockRequestDto $dto): Flock
    {
        $flock->setName($dto->name);
        $flock->setStrain($dto->strain);
        $flock->setStatus($dto->status);
        $flock->setNotes($dto->notes);

        if ($dto->buildingId !== null) {
            $building = $this->buildingRepository->find(Ulid::fromString($dto->buildingId));
            if ($building === null || $building->getFarm()->getId()?->toBase32() !== $flock->getFarm()->getId()?->toBase32()) {
                throw new NotFoundHttpException("Le bâtiment spécifié n'appartient pas à cette exploitation.");
            }
            $flock->setBuilding($building);
        } else {
            $flock->setBuilding(null);
        }

        if ($dto->estimatedEndDate !== null) {
            $flock->setEstimatedEndDate(new \DateTimeImmutable($dto->estimatedEndDate));
        }
        if ($dto->actualEndDate !== null) {
            $flock->setActualEndDate(new \DateTimeImmutable($dto->actualEndDate));
        }

        $this->entityManager->flush();

        return $flock;
    }

    public function recordMovement(Flock $flock, CreateFlockMovementRequestDto $dto, ?User $recordedBy = null): FlockMovement
    {
        return $this->entityManager->wrapInTransaction(function () use ($flock, $dto, $recordedBy): FlockMovement {
            $movementDate = new \DateTimeImmutable($dto->movementDate);
            $qty = $dto->quantity;
            $currentQty = $flock->getCurrentQuantity();

            // Règle métier : décompte de l'effectif vivant
            if (in_array($dto->type, [FlockMovementType::MORTALITY, FlockMovementType::CULLING, FlockMovementType::SALE], true)) {
                if ($qty > $currentQty) {
                    throw new InsufficientFlockQuantityException($qty, $currentQty);
                }

                $flock->setCurrentQuantity($currentQty - $qty);
            } elseif ($dto->type === FlockMovementType::ADJUSTMENT) {
                // Ajustement d'inventaire : réalignement direct
                $flock->setCurrentQuantity($qty);
            }

            // Si l'effectif tombe à zéro, clôture automatique de la bande
            if ($flock->getCurrentQuantity() === 0 && $flock->getStatus() === FlockStatus::ACTIVE) {
                $flock->setStatus(FlockStatus::COMPLETED);
                if ($flock->getActualEndDate() === null) {
                    $flock->setActualEndDate($movementDate);
                }
            }

            $movement = new FlockMovement(
                $flock,
                $dto->type,
                $qty,
                $movementDate,
                $dto->reason,
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
    public function serializeFlock(Flock $flock, bool $includeMovements = false): array
    {
        $data = [
            'id' => $flock->getId()?->toBase32(),
            'farmId' => $flock->getFarm()->getId()?->toBase32(),
            'building' => $flock->getBuilding() !== null ? [
                'id' => $flock->getBuilding()->getId()?->toBase32(),
                'name' => $flock->getBuilding()->getName(),
            ] : null,
            'code' => $flock->getCode(),
            'name' => $flock->getName(),
            'poultryType' => $flock->getPoultryType()->value,
            'strain' => $flock->getStrain(),
            'initialQuantity' => $flock->getInitialQuantity(),
            'currentQuantity' => $flock->getCurrentQuantity(),
            'initialAgeDays' => $flock->getInitialAgeDays(),
            'ageInDays' => $flock->getAgeInDays(),
            'ageInWeeks' => $flock->getAgeInWeeks(),
            'mortalityRate' => $flock->getMortalityRate(),
            'startDate' => $flock->getStartDate()->format('Y-m-d'),
            'estimatedEndDate' => $flock->getEstimatedEndDate()?->format('Y-m-d'),
            'actualEndDate' => $flock->getActualEndDate()?->format('Y-m-d'),
            'status' => $flock->getStatus()->value,
            'notes' => $flock->getNotes(),
            'createdAt' => $flock->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $flock->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];

        if ($includeMovements) {
            $data['movements'] = array_map([$this, 'serializeMovement'], $flock->getMovements()->toArray());
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMovement(FlockMovement $movement): array
    {
        return [
            'id' => $movement->getId()?->toBase32(),
            'flockId' => $movement->getFlock()->getId()?->toBase32(),
            'type' => $movement->getType()->value,
            'quantity' => $movement->getQuantity(),
            'movementDate' => $movement->getMovementDate()->format('Y-m-d'),
            'reason' => $movement->getReason(),
            'recordedBy' => $movement->getRecordedBy() !== null ? [
                'id' => $movement->getRecordedBy()->getId()?->toBase32(),
                'name' => $movement->getRecordedBy()->getFullName(),
            ] : null,
            'createdAt' => $movement->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
