<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\HealthTreatment;
use App\Enum\HealthTreatmentStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Ulid;

/**
 * @extends ServiceEntityRepository<HealthTreatment>
 */
class HealthTreatmentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, HealthTreatment::class);
    }

    /**
     * @return HealthTreatment[]
     */
    public function findByFarm(
        Farm $farm,
        ?Flock $flock = null,
        ?HealthTreatmentStatus $status = null,
        ?\DateTimeImmutable $from = null,
        ?\DateTimeImmutable $to = null,
        ?array $allowedBuildings = null
    ): array {
        $qb = $this->createQueryBuilder('h')
            ->andWhere('h.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('h.flock', 'fl')
            ->addSelect('fl')
            ->leftJoin('h.inventoryItem', 'i')
            ->addSelect('i')
            ->leftJoin('h.recordedBy', 'u')
            ->addSelect('u');

        if ($flock !== null) {
            $qb->andWhere('h.flock = :flock')
                ->setParameter('flock', $flock->getId(), 'ulid');
        }

        if ($status !== null) {
            $qb->andWhere('h.status = :status')
                ->setParameter('status', $status->value);
        }

        if ($from !== null) {
            $qb->andWhere('h.scheduledDate >= :from')
                ->setParameter('from', $from->format('Y-m-d'));
        }

        if ($to !== null) {
            $qb->andWhere('h.scheduledDate <= :to')
                ->setParameter('to', $to->format('Y-m-d'));
        }

        if ($allowedBuildings !== null) {
            $this->applyAllowedBuildingsFilter($qb, $allowedBuildings);
        }

        return $qb->orderBy('h.scheduledDate', 'ASC')
            ->addOrderBy('h.targetAgeDays', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return HealthTreatment[]
     */
    public function findUpdatedSince(Farm $farm, ?\DateTimeImmutable $since = null): array
    {
        $qb = $this->createQueryBuilder('h')
            ->andWhere('h.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('h.flock', 'fl')
            ->addSelect('fl')
            ->leftJoin('h.inventoryItem', 'i')
            ->addSelect('i')
            ->leftJoin('h.recordedBy', 'u')
            ->addSelect('u')
            ->orderBy('h.updatedAt', 'ASC');

        if ($since !== null) {
            $qb->andWhere('h.updatedAt > :since')
                ->setParameter('since', $since);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return HealthTreatment[]
     */
    public function findUpcomingTreatments(Farm $farm, int $limit = 5, ?array $allowedBuildings = null): array
    {
        $today = new \DateTimeImmutable('today');

        $qb = $this->createQueryBuilder('h')
            ->andWhere('h.farm = :farm')
            ->andWhere('h.status = :status')
            ->andWhere('h.scheduledDate >= :today')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('status', HealthTreatmentStatus::SCHEDULED->value)
            ->setParameter('today', $today->format('Y-m-d'))
            ->leftJoin('h.flock', 'fl')
            ->addSelect('fl')
            ->orderBy('h.scheduledDate', 'ASC');

        if ($allowedBuildings !== null) {
            $this->applyAllowedBuildingsFilter($qb, $allowedBuildings);
        }

        return $qb->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return HealthTreatment[]
     */
    public function findOverdueTreatments(Farm $farm, ?array $allowedBuildings = null): array
    {
        $today = new \DateTimeImmutable('today');

        $qb = $this->createQueryBuilder('h')
            ->andWhere('h.farm = :farm')
            ->andWhere('h.status = :status')
            ->andWhere('h.scheduledDate < :today')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('status', HealthTreatmentStatus::SCHEDULED->value)
            ->setParameter('today', $today->format('Y-m-d'))
            ->leftJoin('h.flock', 'fl')
            ->addSelect('fl')
            ->orderBy('h.scheduledDate', 'ASC');

        if ($allowedBuildings !== null) {
            $this->applyAllowedBuildingsFilter($qb, $allowedBuildings);
        }

        return $qb->getQuery()->getResult();
    }

    public function countPendingByFarm(Farm $farm, ?array $allowedBuildings = null): int
    {
        $qb = $this->createQueryBuilder('h')
            ->select('COUNT(h.id)')
            ->andWhere('h.farm = :farm')
            ->andWhere('h.status = :status')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('status', HealthTreatmentStatus::SCHEDULED->value);

        if ($allowedBuildings !== null) {
            $qb->leftJoin('h.flock', 'fl');
            $this->applyAllowedBuildingsFilter($qb, $allowedBuildings);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function applyAllowedBuildingsFilter(QueryBuilder $qb, array $allowedBuildings): void
    {
        $buildingIds = [];
        foreach ($allowedBuildings as $building) {
            if ($building instanceof Building && $building->getId() !== null) {
                $buildingIds[] = $building->getId()->toBinary();
            } elseif ($building instanceof Ulid) {
                $buildingIds[] = $building->toBinary();
            } elseif (is_string($building)) {
                $buildingIds[] = Ulid::isValid($building) ? Ulid::fromString($building)->toBinary() : $building;
            }
        }

        if ($buildingIds === []) {
            $qb->andWhere('1 = 0');
        } else {
            $qb->andWhere('IDENTITY(fl.building) IN (:allowedBuildingIds)')
                ->setParameter('allowedBuildingIds', $buildingIds);
        }
    }
}
