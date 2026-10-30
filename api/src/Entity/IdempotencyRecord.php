<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\IdempotencyRecordRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: IdempotencyRecordRepository::class)]
#[ORM\Table(name: 'idempotency_records')]
#[ORM\UniqueConstraint(name: 'uniq_idempotency_key', columns: ['idempotency_key'])]
#[ORM\Index(name: 'idx_idem_user_farm', columns: ['user_id', 'farm_id'])]
#[ORM\Index(name: 'idx_idem_created_at', columns: ['created_at'])]
class IdempotencyRecord
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_FAILED = 'FAILED';

    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\Column(type: Types::STRING, length: 64, unique: true)]
    private string $idempotencyKey;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Farm $farm = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $requestPath;

    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $requestMethod;

    #[ORM\Column(type: Types::STRING, length: 64)]
    private string $requestHash;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $responseStatusCode = null;

    /**
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $responseHeaders = null;

    #[ORM\Column(type: Types::TEXT, length: 16777215, nullable: true)]
    private ?string $responseBody = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $lockedUntil;

    public function __construct(
        string $idempotencyKey,
        User $user,
        string $requestPath,
        string $requestMethod,
        string $requestHash,
        ?Farm $farm = null,
        int $lockDurationSeconds = 30
    ) {
        $this->id = new Ulid();
        $this->idempotencyKey = $idempotencyKey;
        $this->user = $user;
        $this->farm = $farm;
        $this->requestPath = $requestPath;
        $this->requestMethod = strtoupper($requestMethod);
        $this->requestHash = $requestHash;
        $this->status = self::STATUS_PENDING;
        $this->createdAt = new \DateTimeImmutable();
        $this->lockedUntil = $this->createdAt->modify(sprintf('+%d seconds', $lockDurationSeconds));
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getIdempotencyKey(): string
    {
        return $this->idempotencyKey;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getFarm(): ?Farm
    {
        return $this->farm;
    }

    public function getRequestPath(): string
    {
        return $this->requestPath;
    }

    public function getRequestMethod(): string
    {
        return $this->requestMethod;
    }

    public function getRequestHash(): string
    {
        return $this->requestHash;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getResponseStatusCode(): ?int
    {
        return $this->responseStatusCode;
    }

    public function setResponseStatusCode(?int $responseStatusCode): self
    {
        $this->responseStatusCode = $responseStatusCode;
        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getResponseHeaders(): ?array
    {
        return $this->responseHeaders;
    }

    /**
     * @param array<string, mixed>|null $responseHeaders
     */
    public function setResponseHeaders(?array $responseHeaders): self
    {
        $this->responseHeaders = $responseHeaders;
        return $this;
    }

    public function getResponseBody(): ?string
    {
        return $this->responseBody;
    }

    public function setResponseBody(?string $responseBody): self
    {
        $this->responseBody = $responseBody;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getLockedUntil(): \DateTimeImmutable
    {
        return $this->lockedUntil;
    }

    public function isLocked(): bool
    {
        return $this->status === self::STATUS_PENDING && $this->lockedUntil > new \DateTimeImmutable();
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }
}
