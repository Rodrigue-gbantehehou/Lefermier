<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Enum\OrganizationStatus;
use App\Repository\FarmRepository;
use App\Repository\FlockRepository;
use App\Repository\OrganizationRepository;
use App\Repository\UserRepository;

/**
 * Service de calcul des statistiques globales de la plateforme Lefermier.
 */
class AdminStatsService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly OrganizationRepository $organizationRepository,
        private readonly FarmRepository $farmRepository,
        private readonly FlockRepository $flockRepository,
    ) {
    }

    /**
     * Statistiques globales de la plateforme (comptes, organisations, fermes, bandes).
     *
     * @return array<string, mixed>
     */
    public function getPlatformStats(): array
    {
        $totalUsers = $this->userRepository->count([]);
        $totalOrganizations = $this->organizationRepository->count([]);
        $totalFarms = $this->farmRepository->count([]);
        $totalFlocks = $this->flockRepository->count([]);

        $activeOrgs = $this->organizationRepository->count(['status' => OrganizationStatus::ACTIVE]);
        $suspendedOrgs = $this->organizationRepository->count(['status' => OrganizationStatus::SUSPENDED]);
        $trialOrgs = $this->organizationRepository->count(['status' => OrganizationStatus::TRIAL]);

        $activeUsers = $this->userRepository->count(['isActive' => true]);
        $inactiveUsers = $totalUsers - $activeUsers;

        return [
            'users' => [
                'total' => $totalUsers,
                'active' => $activeUsers,
                'inactive' => $inactiveUsers,
            ],
            'organizations' => [
                'total' => $totalOrganizations,
                'active' => $activeOrgs,
                'suspended' => $suspendedOrgs,
                'trial' => $trialOrgs,
            ],
            'farms' => [
                'total' => $totalFarms,
            ],
            'flocks' => [
                'total' => $totalFlocks,
            ],
        ];
    }
}
