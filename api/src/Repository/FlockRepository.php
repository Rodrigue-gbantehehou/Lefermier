<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\Flock;
use App\Enum\FlockStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Flock>
 */
class FlockRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Flock::class);
    }

    /**
     * @return Flock[]
     */
    public function findByFarm(Farm $farm, ?FlockStatus $status = null): array
    {
        $qb = $this->createQueryBuilder('f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('f.building', 'b')
            ->addSelect('b')
            ->orderBy('f.startDate', 'DESC');

        if ($status !== null) {
            $qb->andWhere('f.status = :status')
               ->setParameter('status', $status);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return Flock[]
     */
    public function findUpdatedSince(Farm $farm, ?\DateTimeImmutable $since = null): array
    {
        $qb = $this->createQueryBuilder('f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('f.building', 'b')
            ->addSelect('b')
            ->orderBy('f.updatedAt', 'ASC');

        if ($since !== null) {
            $qb->andWhere('f.updatedAt > :since')
               ->setParameter('since', $since);
        }

        return $qb->getQuery()->getResult();
    }
}
