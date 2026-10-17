<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\InventoryItem;
use App\Entity\StockMovement;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

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
}
