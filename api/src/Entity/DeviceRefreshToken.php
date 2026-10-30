<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DeviceRefreshTokenRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: DeviceRefreshTokenRepository::class)]
#[ORM\Table(name: 'device_refresh_tokens')]
#[ORM\Index(name: 'idx_device_token_user_device', columns: ['user_id', 'device_id'])]
#[ORM\Index(name: 'idx_device_token_family', columns: ['family_id'])]
#[ORM\Index(name: 'idx_device_token_hash', columns: ['refresh_token_hash'])]
class DeviceRefreshToken
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 64, unique: true)]
    private string $refreshTokenHash;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $deviceId;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $deviceName = null;

    #[ORM\Column(type: Types::STRING, length: 64)]
    private string $familyId;

    #[ORM\Column(type: Types::INTEGER)]
    private int $generation = 0;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isRevoked = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastUsedAt = null;

    public function __construct(
        User $user,
        string $refreshTokenHash,
        string $deviceId,
        string $familyId,
        \DateTimeImmutable $expiresAt,
        ?string $deviceName = null,
        int $generation = 0
    ) {
        $this->id = new Ulid();
        $this->user = $user;
        $this->refreshTokenHash = $refreshTokenHash;
        $this->deviceId = $deviceId;
        $this->familyId = $familyId;
        $this->expiresAt = $expiresAt;
        $this->deviceName = $deviceName;
        $this->generation = $generation;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getRefreshTokenHash(): string
    {
        return $this->refreshTokenHash;
    }

    public function getDeviceId(): string
    {
        return $this->deviceId;
    }

    public function getDeviceName(): ?string
    {
        return $this->deviceName;
    }

    public function setDeviceName(?string $deviceName): self
    {
        $this->deviceName = $deviceName;
        return $this;
    }

    public function getFamilyId(): string
    {
        return $this->familyId;
    }

    public function getGeneration(): int
    {
        return $this->generation;
    }

    public function isRevoked(): bool
    {
        return $this->isRevoked;
    }

    public function setRevoked(bool $isRevoked): self
    {
        $this->isRevoked = $isRevoked;
        return $this;
    }

    public function getExpiresAt(): \DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isValid(): bool
    {
        return !$this->isRevoked && !$this->isExpired();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLastUsedAt(): ?\DateTimeImmutable
    {
        return $this->lastUsedAt;
    }

    public function markAsUsed(): self
    {
        $this->lastUsedAt = new \DateTimeImmutable();
        return $this;
    }
}
