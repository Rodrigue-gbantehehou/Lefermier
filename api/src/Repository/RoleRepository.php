<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Farm;
use App\Entity\Role;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Role>
 */
class RoleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Role::class);
    }

    /**
     * @return array<Role>
     */
    public function findForFarm(Farm $farm): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('r.isSystem', 'DESC')
            ->addOrderBy('r.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByFarmAndCode(Farm $farm, string $code): ?Role
    {
        return $this->findOneBy([
            'farm' => $farm,
            'code' => strtoupper(trim($code)),
        ]);
    }
}
