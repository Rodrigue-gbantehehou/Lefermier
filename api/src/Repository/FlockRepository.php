<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Enum\FlockStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Ulid;

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
     * @param array<int, Building|Ulid|string>|null $allowedBuildings
     * @return Flock[]
     */
    public function findByFarm(Farm $farm, ?FlockStatus $status = null, ?array $allowedBuildings = null): array
    {
        $qb = $this->createQueryBuilder('f')
            ->andWhere('f.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('f.building', 'b')
            ->leftJoin('f.movements', 'm')
            ->addSelect('b', 'm')
            ->orderBy('f.startDate', 'DESC');

        if ($status !== null) {
            $qb->andWhere('f.status = :status')
               ->setParameter('status', $status);
        }

        if ($allowedBuildings !== null) {
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
                $qb->andWhere('IDENTITY(f.building) IN (:allowedBuildingIds)')
                   ->setParameter('allowedBuildingIds', $buildingIds);
            }
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
