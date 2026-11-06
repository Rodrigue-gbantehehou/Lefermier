<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\EggProduction\CreateEggProductionRequestDto;
use App\Dto\EggProduction\UpdateEggProductionRequestDto;
use App\Entity\EggProduction;
use App\Entity\Flock;
use App\Entity\User;
use App\Enum\FlockStatus;
use App\Enum\PoultryType;
use App\Exception\DuplicateEggProductionSessionException;
use App\Exception\InactiveFlockEggProductionException;
use App\Exception\InvalidFlockTypeForEggProductionException;
use App\Repository\EggProductionRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;

class EggProductionService
{
    public function __construct(
        private readonly EggProductionRepository $eggProductionRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function recordEggProduction(
        Flock $flock,
        CreateEggProductionRequestDto $dto,
        ?User $recordedBy = null,
    ): EggProduction {
        // Pré-vérification rapide hors transaction (état visible au moment de la requête).
        // Ces contrôles sont refaits sous verrou après le refresh pour éviter d'agir sur un état obsolète.
        if ($flock->getPoultryType() === PoultryType::BROILER) {
            throw new InvalidFlockTypeForEggProductionException($flock->getPoultryType());
        }
        if ($flock->getStatus() !== FlockStatus::ACTIVE) {
            throw new InactiveFlockEggProductionException($flock->getStatus());
        }

        $productionDate = new \DateTimeImmutable($dto->productionDate);

        // Envelopper dans une transaction avec verrouillage pessimiste de la bande
        // pour sérialiser les créations concurrentes (double enregistrement sur la même séance).
        return $this->entityManager->wrapInTransaction(function () use ($flock, $dto, $productionDate, $recordedBy): EggProduction {
            // Verrouiller la bande en écriture exclusive pour sérialiser les accès concurrents
            $this->entityManager->lock($flock, LockMode::PESSIMISTIC_WRITE);
            if ($this->entityManager->contains($flock)) {
                $this->entityManager->refresh($flock, LockMode::PESSIMISTIC_WRITE);
            }

            // Refaire les contrôles métier sur l'état rafraîchi sous verrou :
            // la bande peut avoir été modifiée entre la pré-vérification et le verrouillage.
            if ($flock->getPoultryType() === PoultryType::BROILER) {
                throw new InvalidFlockTypeForEggProductionException($flock->getPoultryType());
            }
            if ($flock->getStatus() !== FlockStatus::ACTIVE) {
                throw new InactiveFlockEggProductionException($flock->getStatus());
            }

            // Unicité par bande + date + séance (sous verrou)
            $existing = $this->eggProductionRepository->findOneByFlockDateAndSession(
                $flock,
                $productionDate,
                $dto->session
            );

            if ($existing !== null) {
                if ($dto->allowUpdate) {
                    // Verrouiller aussi la collecte existante avant modification
                    $this->entityManager->lock($existing, LockMode::PESSIMISTIC_WRITE);
                    $existing->setGoodEggs($dto->goodEggs);
                    $existing->setCrackedEggs($dto->crackedEggs);
                    $existing->setDirtyEggs($dto->dirtyEggs);
                    $existing->setDeformedEggs($dto->deformedEggs);
                    if ($dto->notes !== null) {
                        $existing->setNotes($dto->notes);
                    }
                    $this->entityManager->flush();
                    return $existing;
                }
                throw new DuplicateEggProductionSessionException($dto->productionDate, $dto->session);
            }

            $production = new EggProduction(
                $flock,
                $productionDate,
                $dto->session,
                $dto->goodEggs,
                $dto->crackedEggs,
                $dto->dirtyEggs,
                $dto->deformedEggs,
                $flock->getCurrentQuantity(),
                $dto->notes,
                $recordedBy
            );

            $this->entityManager->persist($production);
            $this->entityManager->flush();

            return $production;
        });
    }

    public function updateEggProduction(
        EggProduction $production,
        UpdateEggProductionRequestDto $dto,
    ): EggProduction {
        return $this->entityManager->wrapInTransaction(function () use ($production, $dto): EggProduction {
            // Verrouiller la collecte en écriture exclusive avant modification directe
            $this->entityManager->lock($production, LockMode::PESSIMISTIC_WRITE);

            $production->setGoodEggs($dto->goodEggs);
            $production->setCrackedEggs($dto->crackedEggs);
            $production->setDirtyEggs($dto->dirtyEggs);
            $production->setDeformedEggs($dto->deformedEggs);
            $production->setNotes($dto->notes);

            $this->entityManager->flush();

            return $production;
        });
    }

    public function deleteEggProduction(EggProduction $production): void
    {
        $this->entityManager->remove($production);
        $this->entityManager->flush();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeEggProduction(EggProduction $p): array
    {
        return [
            'id' => $p->getId()?->toBase32(),
            'flockId' => $p->getFlock()->getId()?->toBase32(),
            'flockCode' => $p->getFlock()->getCode(),
            'flockName' => $p->getFlock()->getName(),
            'productionDate' => $p->getProductionDate()->format('Y-m-d'),
            'session' => $p->getSession()->value,
            'goodEggs' => $p->getGoodEggs(),
            'crackedEggs' => $p->getCrackedEggs(),
            'dirtyEggs' => $p->getDirtyEggs(),
            'deformedEggs' => $p->getDeformedEggs(),
            'totalEggs' => $p->getTotalEggs(),
            'traysCount' => $p->getTraysCount(),
            'looseEggsCount' => $p->getLooseEggsCount(),
            'flockQuantityAtDate' => $p->getFlockQuantityAtDate(),
            'layingRate' => $p->getLayingRateFloat(),
            'notes' => $p->getNotes(),
            'recordedBy' => $p->getRecordedBy() !== null ? [
                'id' => $p->getRecordedBy()->getId()?->toBase32(),
                'fullName' => $p->getRecordedBy()->getFullName(),
                'email' => $p->getRecordedBy()->getEmail(),
            ] : null,
            'createdAt' => $p->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $p->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
