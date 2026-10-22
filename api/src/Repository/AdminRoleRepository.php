<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\AdminRole;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AdminRole>
 */
class AdminRoleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AdminRole::class);
    }

    public function findByCode(string $code): ?AdminRole
    {
        return $this->findOneBy(['code' => strtoupper(trim($code))]);
    }

    /**
     * @return array<AdminRole>
     */
    public function findAllOrdered(): array
    {
        return $this->createQueryBuilder('r')
            ->orderBy('r.isSystem', 'DESC')
            ->addOrderBy('r.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
