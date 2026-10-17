<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\ApiKey\CreateApiKeyRequestDto;
use App\Entity\ApiKey;
use App\Entity\Farm;
use App\Entity\User;
use App\Repository\ApiKeyRepository;
use Doctrine\ORM\EntityManagerInterface;

class ApiKeyService
{
    public function __construct(
        private readonly ApiKeyRepository $apiKeyRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @return array{apiKey: ApiKey, rawKey: string}
     */
    public function createApiKey(Farm $farm, User $user, CreateApiKeyRequestDto $dto): array
    {
        $prefix = $dto->environment === 'test' ? 'lef_test_' : 'lef_live_';
        
        // 32 octets aléatoires cryptographiquement sécurisés (256 bits d'entropie)
        $randomToken = bin2hex(random_bytes(24));
        $rawKey = $prefix . $randomToken;
        
        $keyHash = hash('sha256', $rawKey);
        $lastFour = substr($rawKey, -4);

        $expiresAt = null;
        if ($dto->expiresInDays !== null && $dto->expiresInDays > 0) {
            $expiresAt = (new \DateTimeImmutable())->modify(sprintf('+%d days', $dto->expiresInDays));
        }

        $apiKey = new ApiKey(
            farm: $farm,
            createdBy: $user,
            name: $dto->name,
            keyPrefix: $prefix,
            lastFour: $lastFour,
            keyHash: $keyHash,
            scopes: $dto->scopes,
            expiresAt: $expiresAt,
        );

        $this->entityManager->persist($apiKey);
        $this->entityManager->flush();

        return [
            'apiKey' => $apiKey,
            'rawKey' => $rawKey,
        ];
    }

    public function revokeApiKey(ApiKey $apiKey): void
    {
        $apiKey->setIsActive(false);
        $this->entityManager->flush();
    }

    public function verifyAndTrack(string $rawKey): ?ApiKey
    {
        $hash = hash('sha256', $rawKey);
        $apiKey = $this->apiKeyRepository->findActiveByKeyHash($hash);

        if (!$apiKey instanceof ApiKey) {
            return null;
        }

        $apiKey->setLastUsedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $apiKey;
    }

    /**
     * @return array<ApiKey>
     */
    public function getApiKeysForFarm(Farm $farm): array
    {
        return $this->apiKeyRepository->findForFarm($farm);
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeApiKey(ApiKey $apiKey, ?string $rawKey = null): array
    {
        $data = [
            'id' => (string) $apiKey->getId(),
            'name' => $apiKey->getName(),
            'maskedKey' => $apiKey->getMaskedKey(),
            'keyPrefix' => $apiKey->getKeyPrefix(),
            'lastFour' => $apiKey->getLastFour(),
            'scopes' => $apiKey->getScopes(),
            'isActive' => $apiKey->isActive(),
            'lastUsedAt' => $apiKey->getLastUsedAt()?->format(\DateTimeInterface::ATOM),
            'expiresAt' => $apiKey->getExpiresAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $apiKey->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'createdBy' => [
                'id' => (string) $apiKey->getCreatedBy()->getId(),
                'email' => $apiKey->getCreatedBy()->getEmail(),
                'firstName' => $apiKey->getCreatedBy()->getFirstName(),
                'lastName' => $apiKey->getCreatedBy()->getLastName(),
            ],
        ];

        if ($rawKey !== null) {
            $data['rawKey'] = $rawKey;
            $data['warning'] = 'Conservez cette clé en lieu sûr. Elle ne sera plus JAMAIS affichée.';
        }

        return $data;
    }
}
