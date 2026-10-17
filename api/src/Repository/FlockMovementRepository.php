<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Flock;
use App\Entity\FlockMovement;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<FlockMovement>
 */
class FlockMovementRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FlockMovement::class);
    }

    /**
     * @return FlockMovement[]
     */
    public function findByFlock(Flock $flock): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.flock = :flock')
            ->setParameter('flock', $flock->getId(), 'ulid')
            ->leftJoin('m.recordedBy', 'u')
            ->addSelect('u')
            ->orderBy('m.movementDate', 'DESC')
            ->addOrderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
