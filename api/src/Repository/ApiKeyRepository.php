<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ApiKey;
use App\Entity\Farm;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ApiKey>
 */
class ApiKeyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ApiKey::class);
    }

    public function findActiveByKeyHash(string $keyHash): ?ApiKey
    {
        $apiKey = $this->findOneBy(['keyHash' => $keyHash]);
        if (!$apiKey instanceof ApiKey) {
            return null;
        }

        return $apiKey->isActive() ? $apiKey : null;
    }

    /**
     * @return array<ApiKey>
     */
    public function findForFarm(Farm $farm): array
    {
        return $this->createQueryBuilder('k')
            ->where('k.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('k.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
