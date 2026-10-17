<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ApiKeyRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: ApiKeyRepository::class)]
#[ORM\Table(name: 'api_keys')]
#[ORM\Index(columns: ['key_hash'], name: 'idx_api_keys_hash')]
#[ORM\Index(columns: ['farm_id'], name: 'idx_api_keys_farm')]
class ApiKey
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private Ulid $id;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(name: 'farm_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $createdBy;

    #[ORM\Column(type: Types::STRING, length: 120)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 16)]
    private string $keyPrefix;

    #[ORM\Column(type: Types::STRING, length: 8)]
    private string $lastFour;

    #[ORM\Column(type: Types::STRING, length: 64, unique: true)]
    private string $keyHash;

    /**
     * @var array<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $scopes = [];

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastUsedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Farm $farm,
        User $createdBy,
        string $name,
        string $keyPrefix,
        string $lastFour,
        string $keyHash,
        array $scopes = ['*'],
        ?\DateTimeImmutable $expiresAt = null,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->createdBy = $createdBy;
        $this->name = $name;
        $this->keyPrefix = $keyPrefix;
        $this->lastFour = $lastFour;
        $this->keyHash = $keyHash;
        $this->scopes = $scopes;
        $this->expiresAt = $expiresAt;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function getCreatedBy(): User
    {
        return $this->createdBy;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getKeyPrefix(): string
    {
        return $this->keyPrefix;
    }

    public function getLastFour(): string
    {
        return $this->lastFour;
    }

    public function getKeyHash(): string
    {
        return $this->keyHash;
    }

    /**
     * @return array<string>
     */
    public function getScopes(): array
    {
        return $this->scopes;
    }

    /**
     * @param array<string> $scopes
     */
    public function setScopes(array $scopes): self
    {
        $this->scopes = $scopes;
        return $this;
    }

    public function isActive(): bool
    {
        if (!$this->isActive) {
            return false;
        }

        if ($this->expiresAt !== null && $this->expiresAt < new \DateTimeImmutable()) {
            return false;
        }

        return true;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getLastUsedAt(): ?\DateTimeImmutable
    {
        return $this->lastUsedAt;
    }

    public function setLastUsedAt(?\DateTimeImmutable $lastUsedAt): self
    {
        $this->lastUsedAt = $lastUsedAt;
        return $this;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /**
     * Retourne la clé masquée pour affichage sécurisé (ex: lef_live_...9f2a).
     */
    public function getMaskedKey(): string
    {
        return $this->keyPrefix . '...' . $this->lastFour;
    }
}
