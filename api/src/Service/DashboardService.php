<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Enum\FlockStatus;
use App\Enum\PoultryType;
use App\Security\Permission;
use App\Repository\EggProductionRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\FlockRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\TransactionRepository;

class DashboardService
{
    public function __construct(
        private readonly FlockRepository $flockRepository,
        private readonly EggProductionRepository $eggProductionRepository,
        private readonly InventoryItemRepository $inventoryItemRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly TransactionService $transactionService,
        private readonly FarmMembershipRepository $membershipRepository,
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

        // 1. Cheptel & Bandes actives
        $activeFlocks = $this->flockRepository->findByFarm($farm, FlockStatus::ACTIVE);
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

        // 2. Production d'œufs & Graphique 7 jours
        $eggSummary = $this->eggProductionRepository->getFarmSummaryStats($farm, $startDate, $endDate);
        $eggChart = $this->eggProductionRepository->getFarmDailyProductionChart($farm, $startDate, $endDate);

        $todayDate = new \DateTimeImmutable(date('Y-m-d'));
        $todayEggStats = $this->eggProductionRepository->getFarmSummaryStats($farm, $todayDate, $todayDate);

        // 3. Stocks & Alertes
        $allItems = $this->inventoryItemRepository->findByFarm($farm);
        $lowStockItems = $this->inventoryItemRepository->findLowStockItems($farm);
        $stockValuation = $this->inventoryItemRepository->getInventoryValuation($farm);

        // 4. Finances (contrôle du rôle utilisateur)
        $membership = $this->membershipRepository->findOneBy([
            'farm' => $farm,
            'user' => $user,
            'isActive' => true,
        ]);

        $canViewFinances = false;
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $canViewFinances = true;
        } elseif ($membership instanceof FarmMembership) {
            $canViewFinances = $membership->hasPermission(Permission::DASHBOARD_FINANCIALS)
                || $membership->hasPermission(Permission::FINANCE_VIEW)
                || $membership->getRole() === \App\Enum\FarmRole::OWNER;
        }

        $financesData = [
            'hasAccess' => $canViewFinances,
        ];

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
            'flocks' => [
                'activeFlocksCount' => count($activeFlocks),
                'totalBirds' => $totalBirds,
                'broilerBirds' => $broilerBirds,
                'layerBirds' => $layerBirds,
                'otherBirds' => max(0, $totalBirds - $broilerBirds - $layerBirds),
                'averageMortalityRate' => $avgMortality,
            ],
            'eggProduction' => [
                'today' => [
                    'totalEggs' => $todayEggStats['totalEggs'],
                    'goodEggs' => $todayEggStats['totalGoodEggs'],
                    'traysCount' => $todayEggStats['totalTrays'],
                    'looseEggsCount' => $todayEggStats['totalLooseEggs'],
                    'layingRate' => $todayEggStats['averageLayingRate'],
                ],
                'summary' => $eggSummary,
                'chart' => $eggChart,
            ],
            'inventory' => [
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
            ],
            'finances' => $financesData,
            'generatedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }
}
