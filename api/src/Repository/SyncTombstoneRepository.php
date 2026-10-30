<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\SyncTombstone;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SyncTombstone>
 */
class SyncTombstoneRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SyncTombstone::class);
    }

    /**
     * @return array<string> Liste des IDs supprimés pour une ressource depuis une date
     */
    public function findDeletedIdsSince(Farm $farm, string $resourceType, \DateTimeImmutable $since): array
    {
        $qb = $this->createQueryBuilder('t')
            ->select('t.resourceId')
            ->andWhere('t.farm = :farm')
            ->andWhere('t.resourceType = :resourceType')
            ->andWhere('t.deletedAt > :since')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('resourceType', $resourceType)
            ->setParameter('since', $since);

        $results = $qb->getQuery()->getSingleColumnResult();

        return array_map('strval', $results);
    }

    /**
     * @return array<array{resourceType: string, resourceId: string, deletedAt: string}>
     */
    public function findAllDeletedSince(Farm $farm, \DateTimeImmutable $since): array
    {
        $qb = $this->createQueryBuilder('t')
            ->select('t.resourceType', 't.resourceId', 't.deletedAt')
            ->andWhere('t.farm = :farm')
            ->andWhere('t.deletedAt > :since')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('since', $since)
            ->orderBy('t.deletedAt', 'ASC');

        $rows = $qb->getQuery()->getResult();

        return array_map(function ($r) {
            return [
                'resourceType' => (string) $r['resourceType'],
                'resourceId' => (string) $r['resourceId'],
                'deletedAt' => $r['deletedAt'] instanceof \DateTimeInterface ? $r['deletedAt']->format(\DateTimeInterface::ATOM) : (string) $r['deletedAt'],
            ];
        }, $rows);
    }
}
