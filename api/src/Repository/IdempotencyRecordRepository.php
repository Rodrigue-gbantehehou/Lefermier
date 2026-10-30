<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\IdempotencyRecord;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<IdempotencyRecord>
 */
class IdempotencyRecordRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, IdempotencyRecord::class);
    }

    public function findByKey(string $key): ?IdempotencyRecord
    {
        return $this->findOneBy(['idempotencyKey' => $key]);
    }

    /**
     * Supprime les clés expirées depuis plus de N jours
     */
    public function purgeOldRecords(int $daysOld = 30): int
    {
        $cutoff = (new \DateTimeImmutable())->modify(sprintf('-%d days', $daysOld));

        return $this->createQueryBuilder('r')
            ->delete()
            ->andWhere('r.createdAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }
}
