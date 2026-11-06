<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Repository\EggProductionRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\SyncTombstoneRepository;
use App\Repository\TransactionRepository;
use App\Security\Permission;

class SyncPullService
{
    public function __construct(
        private readonly FarmService $farmService,
        private readonly FlockService $flockService,
        private readonly EggProductionService $eggProductionService,
        private readonly InventoryService $inventoryService,
        private readonly HealthService $healthService,
        private readonly TransactionService $transactionService,
        private readonly FlockRepository $flockRepository,
        private readonly EggProductionRepository $eggProductionRepository,
        private readonly InventoryItemRepository $inventoryItemRepository,
        private readonly HealthTreatmentRepository $treatmentRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly SyncTombstoneRepository $tombstoneRepository,
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getDeltaForFarm(
        Farm $farm,
        User $user,
        ?\DateTimeImmutable $since = null
    ): array {
        $membership = $this->membershipRepository->findOneBy([
            'farm' => $farm,
            'user' => $user,
            'isActive' => true,
        ]);

        $canViewFinance = $membership instanceof FarmMembership
            ? $membership->hasPermission(Permission::FINANCE_VIEW)
            : in_array('ROLE_ADMIN', $user->getRoles(), true);

        $canViewHealth = $membership instanceof FarmMembership
            ? $membership->hasPermission(Permission::HEALTH_VIEW)
            : in_array('ROLE_ADMIN', $user->getRoles(), true);

        $canViewFlocks = $membership instanceof FarmMembership
            ? $membership->hasPermission(Permission::FLOCK_VIEW)
            : in_array('ROLE_ADMIN', $user->getRoles(), true);

        $canViewEggs = $membership instanceof FarmMembership
            ? $membership->hasPermission(Permission::EGG_VIEW)
            : in_array('ROLE_ADMIN', $user->getRoles(), true);

        $canViewInventory = $membership instanceof FarmMembership
            ? $membership->hasPermission(Permission::INVENTORY_VIEW)
            : in_array('ROLE_ADMIN', $user->getRoles(), true);

        $hasBuildingRestrictions = $membership instanceof FarmMembership && $membership->hasBuildingRestrictions();

        // 1. Lots (Flocks)
        $serializedFlocks = [];
        if ($canViewFlocks) {
            $flocks = $this->flockRepository->findUpdatedSince($farm, $since);
            if ($hasBuildingRestrictions) {
                $flocks = array_values(array_filter($flocks, fn ($f) => $membership->isBuildingAssigned($f->getBuilding())));
            }
            $serializedFlocks = array_map(
                fn ($f) => $this->flockService->serializeFlock($f),
                $flocks
            );
        }

        // 2. Pontes d'œufs (EggProductions)
        $serializedEggProductions = [];
        if ($canViewEggs) {
            $eggProductions = $this->eggProductionRepository->findUpdatedSince($farm, $since);
            if ($hasBuildingRestrictions) {
                $eggProductions = array_values(array_filter($eggProductions, fn ($p) => $membership->isBuildingAssigned($p->getFlock()->getBuilding())));
            }
            $serializedEggProductions = array_map(
                fn ($p) => $this->eggProductionService->serializeEggProduction($p),
                $eggProductions
            );
        }

        // 3. Bâtiments
        $buildings = $this->farmService->getBuildingsForFarm($farm, onlyActive: false);
        if ($hasBuildingRestrictions) {
            $allowedBuildingIds = array_map(
                fn ($ab) => $ab->getId()?->toBase32(),
                $membership->getAssignedBuildings()->toArray()
            );
            $buildings = array_values(array_filter($buildings, fn (array $b) => in_array($b['id'], $allowedBuildingIds, true)));
        }

        // 4. Articles d'inventaire
        $serializedInventory = [];
        if ($canViewInventory) {
            $inventoryItems = $this->inventoryItemRepository->findUpdatedSince($farm, $since);
            $serializedInventory = array_map(
                fn ($i) => $this->inventoryService->serializeItem($i),
                $inventoryItems
            );
        }

        // 5. Calendrier sanitaire & soins
        $serializedHealth = [];
        if ($canViewHealth) {
            $treatments = $this->treatmentRepository->findUpdatedSince($farm, $since);
            if ($hasBuildingRestrictions) {
                $treatments = array_values(array_filter(
                    $treatments,
                    fn ($t) => $t->getFlock() === null || $membership->isBuildingAssigned($t->getFlock()->getBuilding())
                ));
            }
            $serializedHealth = array_map(
                fn ($t) => $this->healthService->serializeTreatment($t),
                $treatments
            );
        }

        // 6. Finances (Ventes / Dépenses - filtré strictement selon les droits du rôle)
        $serializedTransactions = [];
        if ($canViewFinance) {
            $transactions = $this->transactionRepository->findUpdatedSince($farm, $since);
            $serializedTransactions = array_map(
                fn ($t) => $this->transactionService->serializeTransaction($t),
                $transactions
            );
        }

        // 7. Tombstones (Suppressions survenues depuis la dernière synchronisation)
        $tombstones = $since !== null
            ? $this->tombstoneRepository->findAllDeletedSince($farm, $since)
            : [];

        return [
            'serverTime' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'farm' => $this->farmService->serializeFarm($farm),
            'flocks' => $serializedFlocks,
            'eggProductions' => $serializedEggProductions,
            'buildings' => $buildings,
            'inventory' => $serializedInventory,
            'healthTreatments' => $serializedHealth,
            'transactions' => $serializedTransactions,
            'tombstones' => $tombstones,
        ];
    }
}
