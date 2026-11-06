<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\DeviceRefreshToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DeviceRefreshToken>
 */
class DeviceRefreshTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DeviceRefreshToken::class);
    }

    public function findValidToken(string $hash, string $deviceId): ?DeviceRefreshToken
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.refreshTokenHash = :hash')
            ->andWhere('t.deviceId = :deviceId')
            ->andWhere('t.isRevoked = false')
            ->andWhere('t.expiresAt > :now')
            ->setParameter('hash', $hash)
            ->setParameter('deviceId', $deviceId)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findByHash(string $hash): ?DeviceRefreshToken
    {
        return $this->findOneBy(['refreshTokenHash' => $hash]);
    }

    /**
     * Recherche un jeton par son empreinte avec un verrouillage pessimiste d'écriture (SELECT ... FOR UPDATE).
     */
    public function findByHashWithLock(string $hash): ?DeviceRefreshToken
    {
        return $this->createQueryBuilder('t')
            ->andWhere('t.refreshTokenHash = :hash')
            ->setParameter('hash', $hash)
            ->getQuery()
            ->setLockMode(\Doctrine\DBAL\LockMode::PESSIMISTIC_WRITE)
            ->getOneOrNullResult();
    }

    /**
     * Révoque toute la famille d'un jeton suite à une détection de réutilisation
     */
    public function revokeFamily(string $familyId): int
    {
        return $this->createQueryBuilder('t')
            ->update()
            ->set('t.isRevoked', 'true')
            ->andWhere('t.familyId = :familyId')
            ->setParameter('familyId', $familyId)
            ->getQuery()
            ->execute();
    }

    /**
     * Révoque les jetons d'un utilisateur pour un terminal spécifique
     */
    public function revokeDeviceTokens(User $user, string $deviceId): int
    {
        return $this->createQueryBuilder('t')
            ->update()
            ->set('t.isRevoked', 'true')
            ->andWhere('t.user = :user')
            ->andWhere('t.deviceId = :deviceId')
            ->setParameter('user', $user)
            ->setParameter('deviceId', $deviceId)
            ->getQuery()
            ->execute();
    }

    /**
     * Révoque TOUTES les sessions d'un utilisateur (utilisé lors de la désactivation du compte).
     * Garantit qu'aucun terminal ne peut plus renouveler une session après désactivation.
     */
    public function revokeAllUserTokens(User $user): int
    {
        return $this->createQueryBuilder('t')
            ->update()
            ->set('t.isRevoked', 'true')
            ->andWhere('t.user = :user')
            ->andWhere('t.isRevoked = false')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
