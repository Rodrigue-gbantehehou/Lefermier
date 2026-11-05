<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\InventoryItem;
use App\Entity\StockMovement;
use App\Enum\StockMovementType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Ulid;

/**
 * @extends ServiceEntityRepository<StockMovement>
 */
class StockMovementRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StockMovement::class);
    }

    /**
     * @return StockMovement[]
     */
    public function findByItem(InventoryItem $item): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.item = :item')
            ->setParameter('item', $item->getId(), 'ulid')
            ->leftJoin('m.flock', 'f')
            ->leftJoin('m.recordedBy', 'u')
            ->addSelect('f', 'u')
            ->orderBy('m.movementDate', 'DESC')
            ->addOrderBy('m.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return StockMovement[]
     */
    public function findByFarm(
        Farm $farm,
        ?StockMovementType $type = null,
        ?Ulid $itemId = null,
        ?Ulid $flockId = null,
        int $limit = 200,
        string $sortOrder = 'DESC'
    ): array {
        $qb = $this->createQueryBuilder('m')
            ->join('m.item', 'i')
            ->andWhere('i.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('m.flock', 'f')
            ->leftJoin('m.recordedBy', 'u')
            ->addSelect('i', 'f', 'u');

        if ($type !== null) {
            $qb->andWhere('m.type = :type')
                ->setParameter('type', $type);
        }

        if ($itemId !== null) {
            $qb->andWhere('i.id = :itemId')
                ->setParameter('itemId', $itemId, 'ulid');
        }

        if ($flockId !== null) {
            $qb->andWhere('f.id = :flockId')
                ->setParameter('flockId', $flockId, 'ulid');
        }

        $order = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
        $qb->orderBy('m.movementDate', $order)
            ->addOrderBy('m.createdAt', $order)
            ->setMaxResults($limit);

        return $qb->getQuery()->getResult();
    }
}
