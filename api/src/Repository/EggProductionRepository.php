<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\EggProduction;
use App\Entity\Flock;
use App\Enum\EggCollectionSession;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

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
        \App\Entity\Farm $farm,
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
            ->innerJoin('p.flock', 'f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid');

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
        \App\Entity\Farm $farm,
        \DateTimeImmutable $startDate,
        \DateTimeImmutable $endDate,
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
}
