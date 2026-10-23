<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\AdminAuditLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AdminAuditLog>
 */
class AdminAuditLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AdminAuditLog::class);
    }

    /**
     * @return array{data: array<AdminAuditLog>, total: int, page: int, limit: int}
     */
    public function findPaginated(
        int $page = 1,
        int $limit = 50,
        ?string $action = null,
        ?string $search = null
    ): array {
        $qb = $this->createQueryBuilder('a')
            ->orderBy('a.createdAt', 'DESC');

        if ($action !== null && $action !== '') {
            $qb->andWhere('a.action = :action')
                ->setParameter('action', $action);
        }

        if ($search !== null && $search !== '') {
            $qb->andWhere('a.targetName LIKE :search OR a.actorName LIKE :search OR a.actorEmail LIKE :search OR a.details LIKE :search OR a.targetId LIKE :search')
                ->setParameter('search', '%' . $search . '%');
        }

        $total = (int) (clone $qb)->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();

        $data = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }
}
