<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\DeviceRefreshToken;
use App\Entity\User;
use App\Repository\DeviceRefreshTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Uid\Uuid;

class DeviceAuthService
{
    private const REFRESH_TOKEN_TTL_DAYS = 30;

    public function __construct(
        private readonly DeviceRefreshTokenRepository $tokenRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
    ) {
    }

    /**
     * Crée une nouvelle session mobile pour un terminal identifié.
     *
     * @return array{token: string, refreshToken: string, expiresAt: string}
     */
    public function createDeviceSession(User $user, string $deviceId, ?string $deviceName = null): array
    {
        $rawToken = bin2hex(random_bytes(32));
        $hash = hash('sha256', $rawToken);
        $familyId = Uuid::v4()->toRfc4122();
        $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::REFRESH_TOKEN_TTL_DAYS));

        // Révocation préventive des anciens jetons pour ce terminal
        $this->tokenRepository->revokeDeviceTokens($user, $deviceId);

        $deviceToken = new DeviceRefreshToken(
            user: $user,
            refreshTokenHash: $hash,
            deviceId: $deviceId,
            familyId: $familyId,
            expiresAt: $expiresAt,
            deviceName: $deviceName,
            generation: 0
        );

        $this->entityManager->persist($deviceToken);
        $this->entityManager->flush();

        $jwt = $this->jwtManager->create($user);

        return [
            'token' => $jwt,
            'refreshToken' => $rawToken,
            'expiresAt' => $expiresAt->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * Effectue la rotation du Refresh Token (RTR) et renvoie un nouveau JWT + nouveau Refresh Token.
     * En cas de détection de réutilisation, révoque l'intégralité de la famille de jetons.
     *
     * @return array{token: string, refreshToken: string, user: User, expiresAt: string}
     */
    public function rotateRefreshToken(string $rawToken, string $deviceId): array
    {
        $hash = hash('sha256', $rawToken);

        return $this->entityManager->wrapInTransaction(function () use ($hash, $deviceId): array {
            $existing = $this->tokenRepository->findByHashWithLock($hash);

            if ($existing === null) {
                throw new AuthenticationException("Jeton de rafraîchissement non reconnu.");
            }

            if ($existing->getDeviceId() !== $deviceId) {
                throw new AuthenticationException("Incohérence d'identifiant de terminal.");
            }

            // Détection de réutilisation (Jeton déjà révoqué / consommé) -> Attaque potentielle
            if ($existing->isRevoked()) {
                $this->tokenRepository->revokeFamily($existing->getFamilyId());
                throw new AuthenticationException("Alerte de sécurité : réutilisation de jeton détectée. Session révoquée.");
            }

            if ($existing->isExpired()) {
                throw new AuthenticationException("Le jeton de rafraîchissement a expiré. Veuillez vous reconnecter.");
            }

            // 1. Invalidation du jeton courant
            $existing->setRevoked(true);
            $existing->markAsUsed();

            // 2. Génération du jeton successeur dans la même famille
            $newRawToken = bin2hex(random_bytes(32));
            $newHash = hash('sha256', $newRawToken);
            $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', self::REFRESH_TOKEN_TTL_DAYS));

            $newToken = new DeviceRefreshToken(
                user: $existing->getUser(),
                refreshTokenHash: $newHash,
                deviceId: $deviceId,
                familyId: $existing->getFamilyId(),
                expiresAt: $expiresAt,
                deviceName: $existing->getDeviceName(),
                generation: $existing->getGeneration() + 1
            );

            $this->entityManager->persist($newToken);
            $this->entityManager->flush();

            $user = $existing->getUser();
            $jwt = $this->jwtManager->create($user);

            return [
                'token' => $jwt,
                'refreshToken' => $newRawToken,
                'user' => $user,
                'expiresAt' => $expiresAt->format(\DateTimeInterface::ATOM),
            ];
        });
    }

    /**
     * Déconnexion sécurisée d'un terminal spécifique.
     */
    public function revokeDeviceSession(User $user, string $deviceId): void
    {
        $this->tokenRepository->revokeDeviceTokens($user, $deviceId);
    }
}
