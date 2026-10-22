<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SubscriptionPlan;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SubscriptionPlan>
 */
class SubscriptionPlanRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SubscriptionPlan::class);
    }

    public function findBySku(string $sku): ?SubscriptionPlan
    {
        return $this->findOneBy(['sku' => strtoupper(trim($sku))]);
    }

    /**
     * @return array<SubscriptionPlan>
     */
    public function findActivePlans(): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.isActive = true')
            ->orderBy('p.priceMonthly', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
