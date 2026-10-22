<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Entity\Organization;
use App\Enum\OrganizationStatus;
use App\Repository\OrganizationRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service de gestion administrative des organisations et fermes clientes.
 */
class AdminOrganizationService
{
    public function __construct(
        private readonly OrganizationRepository $organizationRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Recherche une organisation par son identifiant ULID avec ses fermes associées.
     */
    public function findOrganization(string $id): ?Organization
    {
        $organizations = $this->organizationRepository->createQueryBuilder('o')
            ->leftJoin('o.farms', 'f')
            ->addSelect('f')
            ->where('o.id = :id')
            ->setParameter('id', $id, 'ulid')
            ->getQuery()
            ->getResult();

        return $organizations[0] ?? null;
    }

    /**
     * Liste paginée des organisations avec filtres de statut et recherche textuelle.
     *
     * @return array{data: array<int, array<string, mixed>>, total: int, page: int, limit: int}
     */
    public function listOrganizations(int $page = 1, int $limit = 25, ?string $status = null, ?string $search = null): array
    {
        $qb = $this->organizationRepository->createQueryBuilder('o')
            ->leftJoin('o.farms', 'f')
            ->addSelect('f')
            ->orderBy('o.createdAt', 'DESC');

        if ($status !== null) {
            $enumStatus = OrganizationStatus::from($status);
            $qb->andWhere('o.status = :status')
               ->setParameter('status', $enumStatus);
        }

        if ($search !== null && $search !== '') {
            $qb->andWhere('o.name LIKE :search OR o.slug LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        $total = (clone $qb)->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();

        $organizations = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return [
            'data' => array_map(fn (Organization $org) => $this->serializeOrganization($org), $organizations),
            'total' => (int) $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }

    /**
     * Détail complet d'une organisation avec fermes et membres associés.
     *
     * @return array<string, mixed>
     */
    public function getOrganizationDetail(Organization $organization): array
    {
        $data = $this->serializeOrganization($organization);

        $members = [];
        foreach ($organization->getFarms() as $farm) {
            foreach ($farm->getFarmMemberships() as $membership) {
                $user = $membership->getUser();
                $userId = $user->getId()?->toBase32();
                if ($userId !== null && !isset($members[$userId])) {
                    $members[$userId] = [
                        'id' => $userId,
                        'fullName' => $user->getFullName(),
                        'email' => $user->getEmail(),
                        'phone' => $user->getPhone(),
                        'isActive' => $user->isActive(),
                        'farms' => [],
                    ];
                }
                if ($userId !== null) {
                    $members[$userId]['farms'][] = [
                        'id' => $farm->getId()?->toBase32(),
                        'name' => $farm->getName(),
                        'role' => $membership->getRole()->value,
                        'isActive' => $membership->isActive(),
                    ];
                }
            }
        }

        $data['members'] = array_values($members);

        return $data;
    }

    /**
     * Met à jour le statut opérationnel d'une organisation (ACTIVE, SUSPENDED, TRIAL).
     */
    public function setOrganizationStatus(Organization $organization, OrganizationStatus $status): Organization
    {
        $organization->setStatus($status);
        $this->entityManager->flush();

        return $organization;
    }

    /**
     * Met à jour le plan d'abonnement d'une organisation.
     */
    public function updateSubscriptionPlan(Organization $organization, string $plan): Organization
    {
        $organization->setSubscriptionPlan($plan);
        $this->entityManager->flush();

        return $organization;
    }

    /**
     * Sérialise une organisation pour l'affichage dans le back-office.
     *
     * @return array<string, mixed>
     */
    public function serializeOrganization(Organization $organization): array
    {
        $farms = [];
        foreach ($organization->getFarms() as $farm) {
            $membersCount = $farm->getFarmMemberships()->count();
            $farms[] = [
                'id' => $farm->getId()?->toBase32(),
                'name' => $farm->getName(),
                'code' => $farm->getCode(),
                'productionType' => $farm->getProductionType()->value,
                'currency' => $farm->getCurrency(),
                'locationCity' => $farm->getLocationCity(),
                'locationCountry' => $farm->getLocationCountry(),
                'membersCount' => $membersCount,
                'createdAt' => $farm->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return [
            'id' => $organization->getId()?->toBase32(),
            'name' => $organization->getName(),
            'slug' => $organization->getSlug(),
            'subscriptionPlan' => $organization->getSubscriptionPlan(),
            'status' => $organization->getStatus()->value,
            'farmsCount' => count($farms),
            'farms' => $farms,
            'createdAt' => $organization->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $organization->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
