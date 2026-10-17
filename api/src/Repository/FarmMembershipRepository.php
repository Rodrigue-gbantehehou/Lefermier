<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<FarmMembership>
 */
class FarmMembershipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FarmMembership::class);
    }

    /**
     * @return array<FarmMembership>
     */
    public function findByFarm(Farm $farm): array
    {
        return $this->createQueryBuilder('m')
            ->join('m.user', 'u')
            ->addSelect('u')
            ->leftJoin('m.roleDefinition', 'r')
            ->addSelect('r')
            ->where('m.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('m.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
