<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Health\CompleteHealthTreatmentRequestDto;
use App\Dto\Health\CreateHealthTreatmentRequestDto;
use App\Dto\Health\UpdateHealthTreatmentRequestDto;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\HealthTreatment;
use App\Entity\InventoryItem;
use App\Entity\StockMovement;
use App\Entity\User;
use App\Enum\AdministrationMethod;
use App\Enum\HealthTreatmentStatus;
use App\Enum\HealthTreatmentType;
use App\Enum\PoultryType;
use App\Enum\StockMovementType;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Repository\InventoryItemRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Ulid;

class HealthService
{
    public function __construct(
        private readonly HealthTreatmentRepository $treatmentRepository,
        private readonly FlockRepository $flockRepository,
        private readonly InventoryItemRepository $itemRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function createTreatment(Farm $farm, CreateHealthTreatmentRequestDto $dto, User $user): HealthTreatment
    {
        $flock = $this->flockRepository->find(Ulid::fromString($dto->flockId));
        if ($flock === null || $flock->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
            throw new NotFoundHttpException("La bande spécifiée n'existe pas dans cette exploitation.");
        }

        $scheduledDate = new \DateTimeImmutable($dto->scheduledDate);

        // Si l'âge cible n'est pas spécifié, on le calcule par rapport à la date de mise en place de la bande
        $targetAgeDays = $dto->targetAgeDays;
        if ($targetAgeDays === null) {
            $diffDays = (int) $flock->getStartDate()->diff($scheduledDate)->format('%r%a');
            $targetAgeDays = max(1, $flock->getInitialAgeDays() + $diffDays);
        }

        $inventoryItem = null;
        if ($dto->inventoryItemId !== null) {
            $inventoryItem = $this->itemRepository->find(Ulid::fromString($dto->inventoryItemId));
            if ($inventoryItem === null || $inventoryItem->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("L'article de stock spécifié n'existe pas dans cette exploitation.");
            }
        }

        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: $dto->title,
            type: $dto->type,
            administrationMethod: $dto->administrationMethod,
            targetAgeDays: $targetAgeDays,
            scheduledDate: $scheduledDate,
            status: HealthTreatmentStatus::SCHEDULED,
            costFcfa: $dto->costFcfa,
            quantityUsed: $dto->quantityUsed,
            veterinarian: $dto->veterinarian,
            notes: $dto->notes,
            inventoryItem: $inventoryItem,
            recordedBy: $user
        );

        $this->entityManager->persist($treatment);
        $this->entityManager->flush();

        return $treatment;
    }

    public function completeTreatment(
        HealthTreatment $treatment,
        CompleteHealthTreatmentRequestDto $dto,
        User $user
    ): HealthTreatment {
        $administeredDate = $dto->administeredDate !== null
            ? new \DateTimeImmutable($dto->administeredDate)
            : new \DateTimeImmutable('today');

        $treatment->setStatus(HealthTreatmentStatus::COMPLETED);
        $treatment->setAdministeredDate($administeredDate);

        if ($dto->quantityUsed !== null) {
            $treatment->setQuantityUsed($dto->quantityUsed);
        }

        if ($dto->costFcfa !== null) {
            $treatment->setCostFcfa($dto->costFcfa);
        }

        if ($dto->veterinarian !== null) {
            $treatment->setVeterinarian($dto->veterinarian);
        }

        if ($dto->notes !== null) {
            $treatment->setNotes($dto->notes);
        }

        $treatment->setRecordedBy($user);

        // Déduction de stock si un article est lié et qu'une quantité est précisée
        if ($dto->inventoryItemId !== null) {
            $item = $this->itemRepository->find(Ulid::fromString($dto->inventoryItemId));
            if ($item !== null && $item->getFarm()->getId()?->toBase32() === $treatment->getFarm()->getId()?->toBase32()) {
                $treatment->setInventoryItem($item);
            }
        }

        $item = $treatment->getInventoryItem();
        if ($item !== null && $dto->deductFromStock && $treatment->getQuantityUsed() !== null) {
            $qty = (float) $treatment->getQuantityUsed();
            if ($qty > 0.0) {
                $currentStock = $item->getCurrentStock();
                $newStock = max(0.0, $currentStock - $qty);
                $item->setCurrentStock($newStock);

                $movement = new StockMovement(
                    item: $item,
                    type: StockMovementType::FEEDING,
                    quantity: $qty,
                    unit: $item->getUnit(),
                    movementDate: $administeredDate,
                    flock: $treatment->getFlock(),
                    reason: 'Traitement sanitaire / vaccin : ' . $treatment->getTitle(),
                    recordedBy: $user
                );
                $this->entityManager->persist($movement);
            }
        }

        $this->entityManager->flush();

        return $treatment;
    }

    public function updateTreatment(HealthTreatment $treatment, UpdateHealthTreatmentRequestDto $dto): HealthTreatment
    {
        if ($dto->title !== null) {
            $treatment->setTitle($dto->title);
        }

        if ($dto->type !== null) {
            $treatment->setType($dto->type);
        }

        if ($dto->administrationMethod !== null) {
            $treatment->setAdministrationMethod($dto->administrationMethod);
        }

        if ($dto->targetAgeDays !== null) {
            $treatment->setTargetAgeDays($dto->targetAgeDays);
        }

        if ($dto->scheduledDate !== null) {
            $treatment->setScheduledDate(new \DateTimeImmutable($dto->scheduledDate));
        }

        if ($dto->administeredDate !== null) {
            $treatment->setAdministeredDate(new \DateTimeImmutable($dto->administeredDate));
        }

        if ($dto->status !== null) {
            $treatment->setStatus($dto->status);
        }

        if ($dto->quantityUsed !== null) {
            $treatment->setQuantityUsed($dto->quantityUsed);
        }

        if ($dto->costFcfa !== null) {
            $treatment->setCostFcfa($dto->costFcfa);
        }

        if ($dto->veterinarian !== null) {
            $treatment->setVeterinarian($dto->veterinarian);
        }

        if ($dto->notes !== null) {
            $treatment->setNotes($dto->notes);
        }

        if ($dto->inventoryItemId !== null) {
            $item = $this->itemRepository->find(Ulid::fromString($dto->inventoryItemId));
            if ($item !== null && $item->getFarm()->getId()?->toBase32() === $treatment->getFarm()->getId()?->toBase32()) {
                $treatment->setInventoryItem($item);
            }
        }

        $this->entityManager->flush();

        return $treatment;
    }

    public function deleteTreatment(HealthTreatment $treatment): void
    {
        $this->entityManager->remove($treatment);
        $this->entityManager->flush();
    }

    /**
     * Génère automatiquement le calendrier vaccinal standard pour une bande selon son type (chair ou pondeuse).
     *
     * @return HealthTreatment[]
     */
    public function generateStandardProgram(
        Farm $farm,
        Flock $flock,
        User $user,
        ?string $programType = null
    ): array {
        $isLayer = ($programType === 'STANDARD_LAYER') || ($flock->getPoultryType() === PoultryType::LAYER);
        $startDate = $flock->getStartDate();
        $initialAge = $flock->getInitialAgeDays();

        $scheduleTemplates = $isLayer ? $this->getLayerSchedule() : $this->getBroilerSchedule();

        $createdTreatments = [];

        foreach ($scheduleTemplates as $tpl) {
            $targetAge = $tpl['age'];
            $daysToAdd = max(0, $targetAge - $initialAge);
            $scheduledDate = $startDate->modify('+' . $daysToAdd . ' days');

            $treatment = new HealthTreatment(
                farm: $farm,
                flock: $flock,
                title: $tpl['title'],
                type: $tpl['type'],
                administrationMethod: $tpl['method'],
                targetAgeDays: $targetAge,
                scheduledDate: $scheduledDate,
                status: HealthTreatmentStatus::SCHEDULED,
                notes: $tpl['notes'] ?? null,
                recordedBy: $user
            );

            $this->entityManager->persist($treatment);
            $createdTreatments[] = $treatment;
        }

        $this->entityManager->flush();

        return $createdTreatments;
    }

    /**
     * @return array<int, array{age: int, title: string, type: HealthTreatmentType, method: AdministrationMethod, notes?: string}>
     */
    private function getBroilerSchedule(): array
    {
        return [
            [
                'age' => 1,
                'title' => 'Réception des poussins : Solution réhydratante & Anti-stress',
                'type' => HealthTreatmentType::VITAMIN,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Eau tiède légèrement sucrée + complexe polyvitaminé pour récupérer du transport.',
            ],
            [
                'age' => 4,
                'title' => 'Complexe multivitaminé & Minéraux de démarrage',
                'type' => HealthTreatmentType::VITAMIN,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Renforcement de l\'immunité naturelle et soutien de croissance.',
            ],
            [
                'age' => 7,
                'title' => 'Vaccin Gumboro 1ère dose (IBD)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'À administrer le matin à la fraîche. Assoiffer les poussins 1h30 avant.',
            ],
            [
                'age' => 10,
                'title' => 'Vaccin Newcastle (HB1 / Clone 30)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::OCULAR_NASAL,
                'notes' => '1 goutte dans l\'œil ou le nez, ou eau de boisson avec lait écrémé.',
            ],
            [
                'age' => 14,
                'title' => 'Vaccin Gumboro 2ème dose (Rappel IBD)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Rappel fondamental contre la maladie de Gumboro.',
            ],
            [
                'age' => 18,
                'title' => 'Traitement préventif Anticoccidien',
                'type' => HealthTreatmentType::TREATMENT,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Amprolium ou Toltrazuril pendant 3 à 5 jours. Surveiller les litières.',
            ],
            [
                'age' => 21,
                'title' => 'Vaccin Newcastle 2ème dose (LaSota)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Rappel de protection Newcastle pour la phase de finition.',
            ],
            [
                'age' => 28,
                'title' => 'Vermifugation / Déparasitage interne',
                'type' => HealthTreatmentType::DEWORMING,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Lévamisole ou Pipérazine pour éliminer les vers intestinaux.',
            ],
            [
                'age' => 35,
                'title' => 'Vitamines de finition & Anti-stress pré-abattage',
                'type' => HealthTreatmentType::VITAMIN,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Préparation des poulets à la vente et réduction des pertes de poids.',
            ],
        ];
    }

    /**
     * @return array<int, array{age: int, title: string, type: HealthTreatmentType, method: AdministrationMethod, notes?: string}>
     */
    private function getLayerSchedule(): array
    {
        return [
            [
                'age' => 1,
                'title' => 'Réception des poussines : Solution réhydratante & Anti-stress',
                'type' => HealthTreatmentType::VITAMIN,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Eau tiède réhydratante + anti-stress.',
            ],
            [
                'age' => 7,
                'title' => 'Vaccin Gumboro 1ère dose (IBD)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Assoiffer les poussines avant distribution.',
            ],
            [
                'age' => 10,
                'title' => 'Vaccin Newcastle (HB1) + Bronchite Infectieuse (H120)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::OCULAR_NASAL,
                'notes' => 'Goutte oculaire ou nasale.',
            ],
            [
                'age' => 14,
                'title' => 'Vaccin Gumboro 2ème dose',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Rappel Gumboro intermédiaire.',
            ],
            [
                'age' => 18,
                'title' => 'Traitement préventif Anticoccidien',
                'type' => HealthTreatmentType::TREATMENT,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Cure de 3 jours.',
            ],
            [
                'age' => 21,
                'title' => 'Vaccin Newcastle (LaSota)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Rappel dans l\'eau de boisson.',
            ],
            [
                'age' => 28,
                'title' => 'Vaccin Gumboro 3ème dose (Renfort pondeuses)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Protection renforcée pour souches pondeuses longue durée.',
            ],
            [
                'age' => 35,
                'title' => 'Vaccin Variole Aviaire (Fowl Pox)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::TOPICAL,
                'notes' => 'Transfixion de la membrane alaire avec aiguille double cannelée.',
            ],
            [
                'age' => 49,
                'title' => 'Déparasitage interne (Vermifugation 1)',
                'type' => HealthTreatmentType::DEWORMING,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Vermifuge polyvalent.',
            ],
            [
                'age' => 56,
                'title' => 'Vaccin Coryza Infectieux 1ère dose',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::INJECTION,
                'notes' => 'Injection sous-cutanée dans le bas du cou.',
            ],
            [
                'age' => 70,
                'title' => 'Vaccin Newcastle + Bronchite Infectieuse rappel',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Renforcement avant le pic de croissance.',
            ],
            [
                'age' => 84,
                'title' => 'Vaccin Coryza Infectieux rappel (2ème dose)',
                'type' => HealthTreatmentType::VACCINATION,
                'method' => AdministrationMethod::INJECTION,
                'notes' => 'Injection de rappel pour immunité complète en ponte.',
            ],
            [
                'age' => 105,
                'title' => 'Déparasitage complet pré-ponte',
                'type' => HealthTreatmentType::DEWORMING,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Purge des vers ronds et plats avant entrée en ponte.',
            ],
            [
                'age' => 119,
                'title' => 'Complément Calcium & Vitamine D3 démarrage ponte',
                'type' => HealthTreatmentType::VITAMIN,
                'method' => AdministrationMethod::DRINKING_WATER,
                'notes' => 'Préparation de la coquille et minéralisation du squelette.',
            ],
        ];
    }

    public function serializeTreatment(HealthTreatment $treatment): array
    {
        $today = new \DateTimeImmutable('today');
        $isOverdue = $treatment->getStatus() === HealthTreatmentStatus::SCHEDULED
            && $treatment->getScheduledDate() < $today;

        $flock = $treatment->getFlock();
        $flockCurrentAge = max(1, $flock->getInitialAgeDays() + (int) $flock->getStartDate()->diff($today)->format('%r%a'));

        $typeLabels = [
            HealthTreatmentType::VACCINATION->value => 'Vaccination',
            HealthTreatmentType::TREATMENT->value => 'Traitement curatif',
            HealthTreatmentType::DEWORMING->value => 'Déparasitage',
            HealthTreatmentType::VITAMIN->value => 'Vitamines & Fortifiants',
            HealthTreatmentType::DISINFECTION->value => 'Désinfection',
            HealthTreatmentType::OTHER->value => 'Autre soin',
        ];

        $methodLabels = [
            AdministrationMethod::DRINKING_WATER->value => 'Eau de boisson',
            AdministrationMethod::INJECTION->value => 'Injection',
            AdministrationMethod::OCULAR_NASAL->value => 'Goutte oculaire/nasale',
            AdministrationMethod::SPRAY->value => 'Nébulisation / Spray',
            AdministrationMethod::FEED->value => 'Mélange aliment',
            AdministrationMethod::TOPICAL->value => 'Application cutanée / alaire',
            AdministrationMethod::OTHER->value => 'Autre',
        ];

        $statusLabels = [
            HealthTreatmentStatus::SCHEDULED->value => 'Planifié',
            HealthTreatmentStatus::COMPLETED->value => 'Administré',
            HealthTreatmentStatus::CANCELLED->value => 'Annulé',
            HealthTreatmentStatus::MISSED->value => 'En retard',
        ];

        return [
            'id' => $treatment->getId()?->toBase32(),
            'title' => $treatment->getTitle(),
            'type' => $treatment->getType()->value,
            'typeLabel' => $typeLabels[$treatment->getType()->value] ?? $treatment->getType()->value,
            'administrationMethod' => $treatment->getAdministrationMethod()->value,
            'administrationMethodLabel' => $methodLabels[$treatment->getAdministrationMethod()->value] ?? $treatment->getAdministrationMethod()->value,
            'targetAgeDays' => $treatment->getTargetAgeDays(),
            'scheduledDate' => $treatment->getScheduledDate()->format('Y-m-d'),
            'administeredDate' => $treatment->getAdministeredDate()?->format('Y-m-d'),
            'status' => $treatment->getStatus()->value,
            'statusLabel' => $statusLabels[$treatment->getStatus()->value] ?? $treatment->getStatus()->value,
            'isOverdue' => $isOverdue,
            'quantityUsed' => $treatment->getQuantityUsed(),
            'costFcfa' => $treatment->getCostFcfa(),
            'veterinarian' => $treatment->getVeterinarian(),
            'notes' => $treatment->getNotes(),
            'createdAt' => $treatment->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $treatment->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'flock' => [
                'id' => $flock->getId()?->toBase32(),
                'code' => $flock->getCode(),
                'name' => $flock->getName(),
                'poultryType' => $flock->getPoultryType()->value,
                'currentQuantity' => $flock->getCurrentQuantity(),
                'currentAgeDays' => $flockCurrentAge,
            ],
            'inventoryItem' => $treatment->getInventoryItem() !== null ? [
                'id' => $treatment->getInventoryItem()->getId()?->toBase32(),
                'name' => $treatment->getInventoryItem()->getName(),
                'category' => $treatment->getInventoryItem()->getCategory()->value,
                'unit' => $treatment->getInventoryItem()->getUnit()->value,
                'unitPrice' => $treatment->getInventoryItem()->getUnitPrice(),
            ] : null,
            'recordedBy' => $treatment->getRecordedBy() !== null ? [
                'id' => $treatment->getRecordedBy()->getId()?->toBase32(),
                'fullName' => $treatment->getRecordedBy()->getFullName(),
            ] : null,
        ];
    }
}
