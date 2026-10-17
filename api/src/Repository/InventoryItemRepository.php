<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\InventoryItem;
use App\Enum\InventoryCategory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<InventoryItem>
 */
class InventoryItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, InventoryItem::class);
    }

    /**
     * @return InventoryItem[]
     */
    public function findByFarm(Farm $farm, ?InventoryCategory $category = null, bool $onlyActive = true): array
    {
        $qb = $this->createQueryBuilder('i')
            ->andWhere('i.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('i.category', 'ASC')
            ->addOrderBy('i.name', 'ASC');

        if ($onlyActive) {
            $qb->andWhere('i.isActive = true');
        }

        if ($category !== null) {
            $qb->andWhere('i.category = :category')
               ->setParameter('category', $category);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Retourne les articles dont le stock actuel est inférieur ou égal au seuil d'alerte.
     *
     * @return InventoryItem[]
     */
    public function findLowStockItems(Farm $farm): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.farm = :farm')
            ->andWhere('i.isActive = true')
            ->andWhere('i.alertThreshold IS NOT NULL')
            ->andWhere('i.currentStock <= i.alertThreshold')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('i.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Calcule la valeur estimée totale du stock en FCFA.
     */
    public function getInventoryValuation(Farm $farm): int
    {
        $res = $this->createQueryBuilder('i')
            ->select('COALESCE(SUM(i.currentStock * COALESCE(i.unitPrice, 0)), 0)')
            ->andWhere('i.farm = :farm')
            ->andWhere('i.isActive = true')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->getQuery()
            ->getSingleScalarResult();

        return (int) round((float) $res);
    }
}
