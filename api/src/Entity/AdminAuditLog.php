<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AdminAuditLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: AdminAuditLogRepository::class)]
#[ORM\Table(name: 'admin_audit_logs')]
#[ORM\Index(columns: ['action'], name: 'idx_admin_audit_action')]
#[ORM\Index(columns: ['created_at'], name: 'idx_admin_audit_created_at')]
#[ORM\Index(columns: ['target_id'], name: 'idx_admin_audit_target')]
class AdminAuditLog
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private Ulid $id;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $actorId = null;

    #[ORM\Column(type: Types::STRING, length: 180)]
    private string $actorEmail;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $actorName;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $actorRole;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $action;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $label;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $targetType;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $targetId;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $targetName;

    #[ORM\Column(type: Types::TEXT)]
    private string $details;

    #[ORM\Column(type: Types::STRING, length: 45, nullable: true)]
    private ?string $clientIp = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $actorEmail,
        string $actorName,
        string $actorRole,
        string $action,
        string $label,
        string $targetType,
        string $targetId,
        string $targetName,
        string $details,
        ?string $actorId = null,
        ?string $clientIp = null,
        string $status = 'SUCCESS',
        ?\DateTimeImmutable $createdAt = null,
    ) {
        $this->id = new Ulid();
        $this->actorEmail = $actorEmail;
        $this->actorName = $actorName;
        $this->actorRole = $actorRole;
        $this->action = $action;
        $this->label = $label;
        $this->targetType = $targetType;
        $this->targetId = $targetId;
        $this->targetName = $targetName;
        $this->details = $details;
        $this->actorId = $actorId;
        $this->clientIp = $clientIp ?? '127.0.0.1';
        $this->status = $status;
        $this->createdAt = $createdAt ?? new \DateTimeImmutable();
    }

    public function getId(): Ulid
    {
        return $this->id;
    }

    public function getActorId(): ?string
    {
        return $this->actorId;
    }

    public function getActorEmail(): string
    {
        return $this->actorEmail;
    }

    public function getActorName(): string
    {
        return $this->actorName;
    }

    public function getActorRole(): string
    {
        return $this->actorRole;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function getTargetType(): string
    {
        return $this->targetType;
    }

    public function getTargetId(): string
    {
        return $this->targetId;
    }

    public function getTargetName(): string
    {
        return $this->targetName;
    }

    public function getDetails(): string
    {
        return $this->details;
    }

    public function getClientIp(): ?string
    {
        return $this->clientIp;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id->toBase32(),
            'timestamp' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'actor' => [
                'id' => $this->actorId,
                'fullName' => $this->actorName,
                'email' => $this->actorEmail,
                'role' => $this->actorRole,
            ],
            'action' => $this->action,
            'label' => $this->label,
            'targetType' => $this->targetType,
            'targetId' => $this->targetId,
            'targetName' => $this->targetName,
            'clientIp' => $this->clientIp ?? '127.0.0.1',
            'status' => $this->status,
            'details' => $this->details,
        ];
    }
}
