<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Enum\FlockStatus;
use App\Enum\PoultryType;
use App\Repository\BuildingRepository;
use App\Repository\EggProductionRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\TransactionRepository;
use App\Security\Permission;
use App\Service\Admin\CommercialPlanService;

class DashboardService
{
    public function __construct(
        private readonly FlockRepository $flockRepository,
        private readonly EggProductionRepository $eggProductionRepository,
        private readonly InventoryItemRepository $inventoryItemRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly TransactionService $transactionService,
        private readonly FarmMembershipRepository $membershipRepository,
        private readonly BuildingRepository $buildingRepository,
        private readonly HealthTreatmentRepository $healthTreatmentRepository,
        private readonly CommercialPlanService $commercialPlanService,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getDashboardData(
        Farm $farm,
        User $user,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
    ): array {
        // Période par défaut : les 7 derniers jours
        $endDate = $endDate ?? new \DateTimeImmutable();
        $startDate = $startDate ?? $endDate->modify('-6 days');

        // Formule d'abonnement & Quotas organisationnels
        $org = $farm->getOrganization();
        $planSku = strtoupper($org->getSubscriptionPlan());
        $plan = $this->commercialPlanService->getPlan($planSku) ?? $this->commercialPlanService->getPlan('STANDARD');
        $planModules = $plan['modules'] ?? [];
        $planQuotas = $plan['quotas'] ?? [];

        $maxFarms = (int) ($planQuotas['maxFarms'] ?? 1);
        $maxFlocks = (int) ($planQuotas['maxFlocks'] ?? 2);
        $maxBuildings = (int) ($planQuotas['maxBuildings'] ?? 2);
        $maxMembers = (int) ($planQuotas['maxMembers'] ?? 2);

        $farmsCount = count($org->getFarms());
        $activeFlocks = $this->flockRepository->findByFarm($farm, FlockStatus::ACTIVE);
        $totalFlocksCount = $this->flockRepository->count(['farm' => $farm]);
        $buildingsCount = $this->buildingRepository->count(['farm' => $farm]);

        $membersSet = [];
        foreach ($org->getFarms() as $f) {
            foreach ($f->getFarmMemberships() as $m) {
                if ($m->isActive() && $m->getUser()) {
                    $membersSet[(string) $m->getUser()->getId()] = true;
                }
            }
        }
        $membersCount = count($membersSet);

        $calcQuota = static function (int $current, int $max): array {
            $isUnlimited = $max >= 9999;
            $percent = $isUnlimited ? 0 : ($max > 0 ? min(100, (int) round(($current / $max) * 100)) : 100);
            $isExceeded = !$isUnlimited && $current > $max;
            return [
                'current' => $current,
                'max' => $max,
                'percent' => $percent,
                'isExceeded' => $isExceeded,
                'isUnlimited' => $isUnlimited,
            ];
        };

        $quotasData = [
            'farms' => $calcQuota($farmsCount, $maxFarms),
            'flocks' => $calcQuota($totalFlocksCount, $maxFlocks),
            'buildings' => $calcQuota($buildingsCount, $maxBuildings),
            'members' => $calcQuota($membersCount, $maxMembers),
        ];

        $isOverQuota = $quotasData['farms']['isExceeded']
            || $quotasData['flocks']['isExceeded']
            || $quotasData['buildings']['isExceeded']
            || $quotasData['members']['isExceeded'];

        $subscriptionData = [
            'plan' => $planSku,
            'planName' => $plan['name'] ?? $planSku,
            'tier' => $plan['tier'] ?? 'Standard',
            'badge' => $plan['badge'] ?? null,
            'status' => $org->getStatus()->value,
            'modules' => $planModules,
            'quotas' => $quotasData,
            'isOverQuota' => $isOverQuota,
        ];

        // 1. Cheptel & Bandes actives
        $totalBirds = 0;
        $broilerBirds = 0;
        $layerBirds = 0;
        $mortalityRates = [];

        foreach ($activeFlocks as $flock) {
            $qty = $flock->getCurrentQuantity();
            $totalBirds += $qty;

            if ($flock->getPoultryType() === PoultryType::BROILER) {
                $broilerBirds += $qty;
            } elseif ($flock->getPoultryType() === PoultryType::LAYER) {
                $layerBirds += $qty;
            }

            $mortalityRates[] = $flock->getMortalityRate();
        }

        $avgMortality = count($mortalityRates) > 0
            ? round(array_sum($mortalityRates) / count($mortalityRates), 2)
            : 0.0;

        // 2. Production d'œufs (conditionnée par le module 'eggs')
        $hasEggModule = in_array('eggs', $planModules, true);
        if ($hasEggModule) {
            $eggSummary = $this->eggProductionRepository->getFarmSummaryStats($farm, $startDate, $endDate);
            $eggChart = $this->eggProductionRepository->getFarmDailyProductionChart($farm, $startDate, $endDate);
            $todayDate = new \DateTimeImmutable(date('Y-m-d'));
            $todayEggStats = $this->eggProductionRepository->getFarmSummaryStats($farm, $todayDate, $todayDate);

            $eggData = [
                'hasAccess' => true,
                'today' => [
                    'totalEggs' => $todayEggStats['totalEggs'],
                    'goodEggs' => $todayEggStats['totalGoodEggs'],
                    'traysCount' => $todayEggStats['totalTrays'],
                    'looseEggsCount' => $todayEggStats['totalLooseEggs'],
                    'layingRate' => $todayEggStats['averageLayingRate'],
                ],
                'summary' => $eggSummary,
                'chart' => $eggChart,
            ];
        } else {
            $eggData = [
                'hasAccess' => false,
                'today' => [
                    'totalEggs' => 0,
                    'goodEggs' => 0,
                    'traysCount' => 0,
                    'looseEggsCount' => 0,
                    'layingRate' => 0,
                ],
                'summary' => [
                    'totalEggs' => 0,
                    'totalGoodEggs' => 0,
                    'totalDamagedEggs' => 0,
                    'totalTrays' => 0,
                    'totalLooseEggs' => 0,
                    'averageLayingRate' => 0,
                ],
                'chart' => [],
            ];
        }

        // 3. Stocks & Alertes (conditionnée par le module 'inventory')
        $hasInventoryModule = in_array('inventory', $planModules, true);
        if ($hasInventoryModule) {
            $allItems = $this->inventoryItemRepository->findByFarm($farm);
            $lowStockItems = $this->inventoryItemRepository->findLowStockItems($farm);
            $stockValuation = $this->inventoryItemRepository->getInventoryValuation($farm);

            $inventoryData = [
                'hasAccess' => true,
                'totalItemsCount' => count($allItems),
                'lowStockCount' => count($lowStockItems),
                'estimatedValuation' => $stockValuation,
                'currency' => $farm->getCurrency(),
                'lowStockAlerts' => array_map(fn ($item) => [
                    'id' => $item->getId()?->toBase32(),
                    'name' => $item->getName(),
                    'category' => $item->getCategory()->value,
                    'currentStock' => (float) $item->getCurrentStock(),
                    'alertThreshold' => $item->getAlertThreshold() !== null ? (float) $item->getAlertThreshold() : null,
                    'unit' => $item->getUnit()->value,
                ], $lowStockItems),
            ];
        } else {
            $inventoryData = [
                'hasAccess' => false,
                'totalItemsCount' => 0,
                'lowStockCount' => 0,
                'estimatedValuation' => 0,
                'currency' => $farm->getCurrency(),
                'lowStockAlerts' => [],
            ];
        }

        // 4. Santé Animale & Soins (conditionnée par le module 'health')
        $hasHealthModule = in_array('health', $planModules, true);
        if ($hasHealthModule) {
            $upcoming = $this->healthTreatmentRepository->findUpcomingTreatments($farm, 5);
            $pendingCount = $this->healthTreatmentRepository->countPendingByFarm($farm);
            $overdue = $this->healthTreatmentRepository->findOverdueTreatments($farm);

            $healthData = [
                'hasAccess' => true,
                'pendingCount' => $pendingCount,
                'overdueCount' => count($overdue),
                'upcomingTreatments' => array_map(fn ($t) => [
                    'id' => $t->getId()?->toBase32(),
                    'title' => $t->getTitle(),
                    'flockName' => $t->getFlock()->getName(),
                    'type' => $t->getType()->value,
                    'scheduledDate' => $t->getScheduledDate()->format('Y-m-d'),
                    'status' => $t->getStatus()->value,
                ], $upcoming),
            ];
        } else {
            $healthData = [
                'hasAccess' => false,
                'pendingCount' => 0,
                'overdueCount' => 0,
                'upcomingTreatments' => [],
            ];
        }

        // 5. Finances (conditionnée par le module 'finance' et les permissions)
        $hasFinanceModule = in_array('finance', $planModules, true);
        $canViewFinances = false;

        if ($hasFinanceModule) {
            $membership = $this->membershipRepository->findOneBy([
                'farm' => $farm,
                'user' => $user,
                'isActive' => true,
            ]);

            if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
                $canViewFinances = true;
            } elseif ($membership instanceof FarmMembership) {
                $canViewFinances = $membership->hasPermission(Permission::DASHBOARD_FINANCIALS)
                    || $membership->hasPermission(Permission::FINANCE_VIEW)
                    || $membership->getRole() === \App\Enum\FarmRole::OWNER;
            }
        }

        if ($canViewFinances) {
            $currentMonthStart = new \DateTimeImmutable(date('Y-m-01'));
            $currentMonthEnd = new \DateTimeImmutable(date('Y-m-t'));

            $monthFinances = $this->transactionRepository->getFinancialSummary(
                $farm,
                $currentMonthStart,
                $currentMonthEnd
            );

            $periodFinances = $this->transactionRepository->getFinancialSummary(
                $farm,
                $startDate,
                $endDate
            );

            $recentTransactions = $this->transactionRepository->findByFarm($farm, limit: 5);
            $serializedRecent = array_map(
                fn ($t) => $this->transactionService->serializeTransaction($t),
                $recentTransactions
            );

            $financesData = [
                'hasAccess' => true,
                'currentMonth' => [
                    'income' => $monthFinances['totalIncome'],
                    'expense' => $monthFinances['totalExpense'],
                    'netBalance' => $monthFinances['netBalance'],
                    'transactionsCount' => $monthFinances['transactionsCount'],
                    'currency' => $farm->getCurrency(),
                ],
                'period' => [
                    'income' => $periodFinances['totalIncome'],
                    'expense' => $periodFinances['totalExpense'],
                    'netBalance' => $periodFinances['netBalance'],
                    'transactionsCount' => $periodFinances['transactionsCount'],
                    'currency' => $farm->getCurrency(),
                ],
                'recentTransactions' => $serializedRecent,
            ];
        } else {
            $financesData = [
                'hasAccess' => false,
            ];
        }

        return [
            'farm' => [
                'id' => $farm->getId()?->toBase32(),
                'name' => $farm->getName(),
                'productionType' => $farm->getProductionType()->value,
                'currency' => $farm->getCurrency(),
                'city' => $farm->getLocationCity(),
            ],
            'period' => [
                'startDate' => $startDate->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ],
            'subscription' => $subscriptionData,
            'flocks' => [
                'activeFlocksCount' => count($activeFlocks),
                'totalBirds' => $totalBirds,
                'broilerBirds' => $broilerBirds,
                'layerBirds' => $layerBirds,
                'otherBirds' => max(0, $totalBirds - $broilerBirds - $layerBirds),
                'averageMortalityRate' => $avgMortality,
            ],
            'eggProduction' => $eggData,
            'inventory' => $inventoryData,
            'health' => $healthData,
            'finances' => $financesData,
            'generatedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }
}