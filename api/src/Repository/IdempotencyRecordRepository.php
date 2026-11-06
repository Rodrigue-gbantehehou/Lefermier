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

        return (int) $this->createQueryBuilder('r')
            ->delete()
            ->andWhere('r.createdAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

    /**
     * Tente d'acquérir ou renouveler le verrou atomiquement au niveau SQL avec un jeton de fencing.
     * Réussit uniquement si le verrou est expiré (ou null) et que l'opération n'est pas déjà complétée.
     * Élimine toute course concurrente lors des reprises après expiration.
     */
    public function tryAcquireOrRenewLock(string $key, \DateTimeImmutable $newLockedUntil, string $newLockToken): bool
    {
        $now = new \DateTimeImmutable();
        $updated = $this->createQueryBuilder('r')
            ->update()
            ->set('r.lockedUntil', ':newLockedUntil')
            ->set('r.lockToken', ':newLockToken')
            ->set('r.status', ':pendingStatus')
            ->andWhere('r.idempotencyKey = :key')
            ->andWhere('(r.lockedUntil IS NULL OR r.lockedUntil <= :now)')
            ->andWhere('r.status != :completedStatus')
            ->setParameter('newLockedUntil', $newLockedUntil)
            ->setParameter('newLockToken', $newLockToken)
            ->setParameter('pendingStatus', IdempotencyRecord::STATUS_PENDING)
            ->setParameter('completedStatus', IdempotencyRecord::STATUS_COMPLETED)
            ->setParameter('key', $key)
            ->setParameter('now', $now)
            ->getQuery()
            ->execute();

        return $updated > 0;
    }

    /**
     * Enregistre l'échec de l'opération et libère le verrou immédiatement via DQL direct,
     * sous réserve stricte que le jeton de fencing corresponde toujours et que l'opération ne soit pas complétée.
     */
    public function markFailed(mixed $id, ?string $lockToken = null, ?string $errorMessage = null): int
    {
        $qb = $this->createQueryBuilder('r')
            ->update()
            ->set('r.status', ':status')
            ->set('r.lockedUntil', ':now')
            ->andWhere('r.id = :id')
            ->andWhere('r.status != :completedStatus')
            ->setParameter('status', IdempotencyRecord::STATUS_FAILED)
            ->setParameter('completedStatus', IdempotencyRecord::STATUS_COMPLETED)
            ->setParameter('now', new \DateTimeImmutable())
            ->setParameter('id', $id);

        if ($lockToken !== null) {
            $qb->andWhere('r.lockToken = :token')
               ->setParameter('token', $lockToken);
        }

        return $qb->getQuery()->execute();
    }
}
