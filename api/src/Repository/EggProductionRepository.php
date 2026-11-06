<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Building;
use App\Entity\EggProduction;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Enum\EggCollectionSession;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Ulid;

/**
 * @extends ServiceEntityRepository<EggProduction>
 */
class EggProductionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EggProduction::class);
    }

    /**
     * @return EggProduction[]
     */
    public function findByFlock(
        Flock $flock,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
    ): array {
        $qb = $this->createQueryBuilder('p')
            ->andWhere('p.flock = :flock')
            ->setParameter('flock', $flock->getId(), 'ulid')
            ->leftJoin('p.recordedBy', 'u')
            ->addSelect('u')
            ->orderBy('p.productionDate', 'DESC')
            ->addOrderBy('p.createdAt', 'DESC');

        if ($startDate !== null) {
            $qb->andWhere('p.productionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('p.productionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @param array<int, Building|Ulid|string>|null $allowedBuildings
     * @return EggProduction[]
     */
    public function findByFarm(
        Farm $farm,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
        int $limit = 100,
        ?array $allowedBuildings = null,
    ): array {
        $qb = $this->createQueryBuilder('p')
            ->innerJoin('p.flock', 'f')
            ->addSelect('f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('p.recordedBy', 'u')
            ->addSelect('u')
            ->orderBy('p.productionDate', 'DESC')
            ->addOrderBy('p.createdAt', 'DESC')
            ->setMaxResults($limit);

        $this->applyBuildingRestrictions($qb, 'f', $allowedBuildings);

        if ($startDate !== null) {
            $qb->andWhere('p.productionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('p.productionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return EggProduction[]
     */
    public function findUpdatedSince(\App\Entity\Farm $farm, ?\DateTimeImmutable $since = null, int $limit = 500): array
    {
        $qb = $this->createQueryBuilder('p')
            ->innerJoin('p.flock', 'f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('p.recordedBy', 'u')
            ->addSelect('u')
            ->orderBy('p.updatedAt', 'ASC')
            ->setMaxResults($limit);

        if ($since !== null) {
            $qb->andWhere('p.updatedAt > :since')
                ->setParameter('since', $since);
        } else {
            $qb->andWhere('p.productionDate >= :thirtyDaysAgo')
                ->setParameter('thirtyDaysAgo', (new \DateTimeImmutable('-30 days'))->format('Y-m-d'));
        }

        return $qb->getQuery()->getResult();
    }

    public function findOneByFlockDateAndSession(
        Flock $flock,
        \DateTimeImmutable $date,
        EggCollectionSession $session,
    ): ?EggProduction {
        return $this->findOneBy([
            'flock' => $flock,
            'productionDate' => $date,
            'session' => $session,
        ]);
    }

    /**
     * Calcule les statistiques cumulées pour une bande sur une période optionnelle.
     *
     * @return array{
     *     totalGoodEggs: int,
     *     totalCrackedEggs: int,
     *     totalDirtyEggs: int,
     *     totalDeformedEggs: int,
     *     totalEggs: int,
     *     totalTrays: int,
     *     totalLooseEggs: int,
     *     averageLayingRate: float,
     *     collectionsCount: int
     * }
     */
    public function getSummaryStats(
        Flock $flock,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
    ): array {
        $qb = $this->createQueryBuilder('p')
            ->select(
                'COALESCE(SUM(p.goodEggs), 0) as totalGoodEggs',
                'COALESCE(SUM(p.crackedEggs), 0) as totalCrackedEggs',
                'COALESCE(SUM(p.dirtyEggs), 0) as totalDirtyEggs',
                'COALESCE(SUM(p.deformedEggs), 0) as totalDeformedEggs',
                'COALESCE(SUM(p.totalEggs), 0) as totalEggs',
                'COALESCE(AVG(p.layingRate), 0) as avgLayingRate',
                'COUNT(p.id) as collectionsCount'
            )
            ->andWhere('p.flock = :flock')
            ->setParameter('flock', $flock->getId(), 'ulid');

        if ($startDate !== null) {
            $qb->andWhere('p.productionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('p.productionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        $row = $qb->getQuery()->getSingleResult();

        $goodEggs = (int) $row['totalGoodEggs'];
        $trays = intdiv($goodEggs, 30);
        $loose = $goodEggs % 30;

        return [
            'totalGoodEggs' => $goodEggs,
            'totalCrackedEggs' => (int) $row['totalCrackedEggs'],
            'totalDirtyEggs' => (int) $row['totalDirtyEggs'],
            'totalDeformedEggs' => (int) $row['totalDeformedEggs'],
            'totalEggs' => (int) $row['totalEggs'],
            'totalTrays' => $trays,
            'totalLooseEggs' => $loose,
            'averageLayingRate' => round((float) $row['avgLayingRate'], 2),
            'collectionsCount' => (int) $row['collectionsCount'],
        ];
    }

    /**
     * Calcule les statistiques cumulées de ponte pour toute une ferme sur une période.
     *
     * @param array<int, Building|Ulid|string>|null $allowedBuildings
     * @return array{
     *     totalGoodEggs: int,
     *     totalCrackedEggs: int,
     *     totalDirtyEggs: int,
     *     totalDeformedEggs: int,
     *     totalEggs: int,
     *     totalTrays: int,
     *     totalLooseEggs: int,
     *     averageLayingRate: float,
     *     collectionsCount: int
     * }
     */
    public function getFarmSummaryStats(
        Farm $farm,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
        ?array $allowedBuildings = null,
    ): array {
        $qb = $this->createQueryBuilder('p')
            ->select(
                'COALESCE(SUM(p.goodEggs), 0) as totalGoodEggs',
                'COALESCE(SUM(p.crackedEggs), 0) as totalCrackedEggs',
                'COALESCE(SUM(p.dirtyEggs), 0) as totalDirtyEggs',
                'COALESCE(SUM(p.deformedEggs), 0) as totalDeformedEggs',
                'COALESCE(SUM(p.totalEggs), 0) as totalEggs',
                'COALESCE(AVG(p.layingRate), 0) as avgLayingRate',
                'COUNT(p.id) as collectionsCount'
            )
            ->innerJoin('p.flock', 'f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid');

        $this->applyBuildingRestrictions($qb, 'f', $allowedBuildings);

        if ($startDate !== null) {
            $qb->andWhere('p.productionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('p.productionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        $row = $qb->getQuery()->getSingleResult();

        $goodEggs = (int) $row['totalGoodEggs'];
        $trays = intdiv($goodEggs, 30);
        $loose = $goodEggs % 30;

        return [
            'totalGoodEggs' => $goodEggs,
            'totalCrackedEggs' => (int) $row['totalCrackedEggs'],
            'totalDirtyEggs' => (int) $row['totalDirtyEggs'],
            'totalDeformedEggs' => (int) $row['totalDeformedEggs'],
            'totalEggs' => (int) $row['totalEggs'],
            'totalTrays' => $trays,
            'totalLooseEggs' => $loose,
            'averageLayingRate' => round((float) $row['avgLayingRate'], 2),
            'collectionsCount' => (int) $row['collectionsCount'],
        ];
    }

    /**
     * Retourne la série chronologique des ramassages d'œufs pour tracer les courbes de ponte.
     *
     * @param array<int, Building|Ulid|string>|null $allowedBuildings
     * @return array<int, array{
     *     date: string,
     *     goodEggs: int,
     *     crackedEggs: int,
     *     dirtyEggs: int,
     *     deformedEggs: int,
     *     totalEggs: int,
     *     traysCount: int,
     *     layingRate: float
     * }>
     */
    public function getFarmDailyProductionChart(
        Farm $farm,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate,
        ?array $allowedBuildings = null,
    ): array {
        $qb = $this->createQueryBuilder('p')
            ->select(
                'p.productionDate as pDate',
                'COALESCE(SUM(p.goodEggs), 0) as goodEggs',
                'COALESCE(SUM(p.crackedEggs), 0) as crackedEggs',
                'COALESCE(SUM(p.dirtyEggs), 0) as dirtyEggs',
                'COALESCE(SUM(p.deformedEggs), 0) as deformedEggs',
                'COALESCE(SUM(p.totalEggs), 0) as totalEggs',
                'COALESCE(AVG(p.layingRate), 0) as layingRate'
            )
            ->innerJoin('p.flock', 'f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->andWhere('p.productionDate >= :startDate')
            ->andWhere('p.productionDate <= :endDate')
            ->setParameter('startDate', $startDate->format('Y-m-d'))
            ->setParameter('endDate', $endDate->format('Y-m-d'))
            ->groupBy('p.productionDate')
            ->orderBy('p.productionDate', 'ASC');

        $this->applyBuildingRestrictions($qb, 'f', $allowedBuildings);

        $rows = $qb->getQuery()->getResult();

        $chart = [];
        foreach ($rows as $r) {
            $dateStr = $r['pDate'] instanceof \DateTimeInterface ? $r['pDate']->format('Y-m-d') : (string) $r['pDate'];
            $good = (int) $r['goodEggs'];
            $chart[] = [
                'date' => $dateStr,
                'goodEggs' => $good,
                'crackedEggs' => (int) $r['crackedEggs'],
                'dirtyEggs' => (int) $r['dirtyEggs'],
                'deformedEggs' => (int) $r['deformedEggs'],
                'totalEggs' => (int) $r['totalEggs'],
                'traysCount' => intdiv($good, 30),
                'layingRate' => round((float) $r['layingRate'], 2),
            ];
        }

        return $chart;
    }

    /**
     * Applique au niveau DQL la restriction d'accès aux bâtiments attribués au membre.
     *
     * @param array<int, Building|Ulid|string>|null $allowedBuildings
     */
    private function applyBuildingRestrictions(
        QueryBuilder $qb,
        string $flockAlias,
        ?array $allowedBuildings,
    ): void {
        if ($allowedBuildings === null) {
            return;
        }

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
            return;
        }

        $qb->andWhere(sprintf('IDENTITY(%s.building) IN (:allowedBuildingIds)', $flockAlias))
            ->setParameter('allowedBuildingIds', $buildingIds);
    }
}
