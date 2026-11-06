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
use App\Service\Admin\CommercialPlanService;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Uid\Ulid;

class FlockService
{
    public function __construct(
        private readonly FlockRepository $flockRepository,
        private readonly FlockMovementRepository $movementRepository,
        private readonly BuildingRepository $buildingRepository,
        private readonly CommercialPlanService $commercialPlanService,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function createFlock(Farm $farm, CreateFlockRequestDto $dto): Flock
    {
        // 0. Contrôle d'accès et des quotas de la formule commerciale
        $this->commercialPlanService->assertCanCreateFlock($farm);

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
            if (!$building->isActive()) {
                throw new UnprocessableEntityHttpException("Le bâtiment sélectionné est inactif.");
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
        return $this->entityManager->wrapInTransaction(function () use ($flock, $dto): Flock {
            $this->entityManager->lock($flock, LockMode::PESSIMISTIC_WRITE);
            if ($this->entityManager->contains($flock)) {
                $this->entityManager->refresh($flock, LockMode::PESSIMISTIC_WRITE);
            }

            $flock->setName($dto->name);
            if ($dto->strain !== null) {
                $flock->setStrain($dto->strain);
            }
            if ($dto->status !== null) {
                $flock->setStatus($dto->status);
            }
            if ($dto->notes !== null) {
                $flock->setNotes($dto->notes);
            }

            if ($dto->buildingId !== null) {
                $building = $this->buildingRepository->find(Ulid::fromString($dto->buildingId));
                if ($building === null || $building->getFarm()->getId()?->toBase32() !== $flock->getFarm()->getId()?->toBase32()) {
                    throw new NotFoundHttpException("Le bâtiment spécifié n'appartient pas à cette exploitation.");
                }
                if (!$building->isActive()) {
                    throw new UnprocessableEntityHttpException("Le bâtiment sélectionné est inactif.");
                }
                $flock->setBuilding($building);
            }

            if ($dto->estimatedEndDate !== null) {
                $flock->setEstimatedEndDate(new \DateTimeImmutable($dto->estimatedEndDate));
            }
            if ($dto->actualEndDate !== null) {
                $flock->setActualEndDate(new \DateTimeImmutable($dto->actualEndDate));
            }

            $this->entityManager->flush();

            return $flock;
        });
    }

    public function recordMovement(Flock $flock, CreateFlockMovementRequestDto $dto, ?User $recordedBy = null): FlockMovement
    {
        return $this->entityManager->wrapInTransaction(function () use ($flock, $dto, $recordedBy): FlockMovement {
            // Verrouillage pessimiste exclusif (SELECT ... FOR UPDATE) et rafraîchissement de la bande
            // pour empêcher que deux mortalités/ventes simultanées ne contournent le contrôle d'effectif disponible.
            $this->entityManager->lock($flock, LockMode::PESSIMISTIC_WRITE);
            if ($this->entityManager->contains($flock)) {
                $this->entityManager->refresh($flock, LockMode::PESSIMISTIC_WRITE);
            }

            $movementDate = new \DateTimeImmutable($dto->movementDate);
            $qty = $dto->quantity;
            $currentQty = $flock->getCurrentQuantity();
            $quantityBefore = $currentQty;

            $sourceBuilding = null;
            $targetBuilding = null;

            // Règle métier : décompte de l'effectif vivant, transfert ou ajustement
            if (in_array($dto->type, [FlockMovementType::MORTALITY, FlockMovementType::CULLING, FlockMovementType::SALE], true)) {
                if ($qty > $currentQty) {
                    throw new InsufficientFlockQuantityException($qty, $currentQty);
                }

                $flock->setCurrentQuantity($currentQty - $qty);
            } elseif ($dto->type === FlockMovementType::TRANSFER) {
                if ($qty > $currentQty) {
                    throw new InsufficientFlockQuantityException($qty, $currentQty);
                }

                $targetBuildingId = $dto->targetBuildingId ?? $dto->destinationBuildingId;
                if ($targetBuildingId === null) {
                    throw new UnprocessableEntityHttpException("Le bâtiment de destination est obligatoire pour un mouvement de transfert.");
                }

                $targetBuilding = $this->buildingRepository->find(Ulid::fromString($targetBuildingId));
                if ($targetBuilding === null || $targetBuilding->getFarm()->getId()?->toBase32() !== $flock->getFarm()->getId()?->toBase32()) {
                    throw new NotFoundHttpException("Le bâtiment de destination n'appartient pas à cette exploitation.");
                }

                if (!$targetBuilding->isActive()) {
                    throw new UnprocessableEntityHttpException("Le bâtiment de destination est inactif.");
                }

                $sourceBuilding = $flock->getBuilding();
                if ($sourceBuilding !== null && $sourceBuilding->getId()?->toBase32() === $targetBuilding->getId()?->toBase32()) {
                    throw new UnprocessableEntityHttpException("Le bâtiment de destination doit être différent du bâtiment actuel de la bande.");
                }

                if ($qty === $currentQty) {
                    // Transfert total : la bande entière déménage vers le nouveau bâtiment
                    $flock->setBuilding($targetBuilding);
                } else {
                    // Transfert partiel : scission d'effectif
                    // 1. L'effectif de la bande source est réduit (les volailles non transférées restent dans le bâtiment source)
                    $flock->setCurrentQuantity($currentQty - $qty);

                    // 2. Création d'une bande scindée dans le bâtiment cible
                    // Vérification préalable stricte des quotas du forfait d'abonnement
                    $this->commercialPlanService->assertCanCreateFlock($flock->getFarm());

                    $suffix = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
                    $splitCode = sprintf('%s-S%s', substr($flock->getCode(), 0, 40), $suffix);
                    $splitName = $flock->getName() . ' (' . $targetBuilding->getName() . ')';
                    $splitFlock = new Flock(
                        $flock->getFarm(),
                        $splitCode,
                        $splitName,
                        $qty,
                        $flock->getStartDate(),
                        $flock->getPoultryType()
                    );
                    $splitFlock->setCurrentQuantity($qty);
                    $splitFlock->setStrain($flock->getStrain());
                    $splitFlock->setBuilding($targetBuilding);
                    $splitFlock->setInitialAgeDays($flock->getInitialAgeDays());
                    $splitFlock->setNotes("Issu du transfert partiel de {$qty} volailles depuis la bande {$flock->getName()} (Bât. " . ($sourceBuilding?->getName() ?? 'Inconnu') . ").");

                    $this->entityManager->persist($splitFlock);

                    $splitMovement = new FlockMovement(
                        flock: $splitFlock,
                        type: FlockMovementType::TRANSFER,
                        quantity: $qty,
                        movementDate: $movementDate,
                        reason: "Transfert partiel depuis " . $flock->getName(),
                        recordedBy: $recordedBy,
                        sourceBuilding: $sourceBuilding,
                        targetBuilding: $targetBuilding,
                        quantityBefore: 0,
                        quantityAfter: $qty,
                    );
                    $splitFlock->addMovement($splitMovement);
                    $this->entityManager->persist($splitMovement);
                }
            } elseif ($dto->type === FlockMovementType::ADJUSTMENT) {
                if ($dto->reason === null || trim($dto->reason) === '') {
                    throw new UnprocessableEntityHttpException("Un motif explicite est obligatoire pour un ajustement d'effectif.");
                }
                $flock->setCurrentQuantity($qty);
            }

            $quantityAfter = $flock->getCurrentQuantity();

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
                $sourceBuilding,
                $targetBuilding,
                $quantityBefore,
                $quantityAfter,
            );

            $flock->addMovement($movement);
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
            'cullingRate' => $flock->getCullingRate(),
            'salesRate' => $flock->getSalesRate(),
            'lossRate' => $flock->getLossRate(),
            'movementsSummary' => [
                'mortality' => $flock->getTotalMortality(),
                'culling' => $flock->getTotalCulling(),
                'sales' => $flock->getTotalSales(),
                'losses' => $flock->getTotalLosses(),
                'netAdjustment' => $flock->getNetAdjustmentDelta(),
                'adjustmentsCount' => $flock->getAdjustmentsCount(),
            ],
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
            'quantityBefore' => $movement->getQuantityBefore(),
            'quantityAfter' => $movement->getQuantityAfter(),
            'movementDate' => $movement->getMovementDate()->format('Y-m-d'),
            'reason' => $movement->getReason(),
            'sourceBuilding' => $movement->getSourceBuilding() !== null ? [
                'id' => $movement->getSourceBuilding()->getId()?->toBase32(),
                'name' => $movement->getSourceBuilding()->getName(),
            ] : null,
            'targetBuilding' => $movement->getTargetBuilding() !== null ? [
                'id' => $movement->getTargetBuilding()->getId()?->toBase32(),
                'name' => $movement->getTargetBuilding()->getName(),
            ] : null,
            'recordedBy' => $movement->getRecordedBy() !== null ? [
                'id' => $movement->getRecordedBy()->getId()?->toBase32(),
                'name' => $movement->getRecordedBy()->getFullName(),
            ] : null,
            'createdAt' => $movement->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
