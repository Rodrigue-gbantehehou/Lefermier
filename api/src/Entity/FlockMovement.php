<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\FlockMovementType;
use App\Repository\FlockMovementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: FlockMovementRepository::class)]
#[ORM\Table(name: 'flock_movements')]
class FlockMovement
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Flock::class, inversedBy: 'movements')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Flock $flock;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: FlockMovementType::class)]
    private FlockMovementType $type;

    #[ORM\Column(type: Types::INTEGER)]
    private int $quantity;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $movementDate;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Flock $flock,
        FlockMovementType $type,
        int $quantity,
        \DateTimeImmutable $movementDate,
        ?string $reason = null,
        ?User $recordedBy = null,
    ) {
        $this->id = new Ulid();
        $this->flock = $flock;
        $this->type = $type;
        $this->quantity = $quantity;
        $this->movementDate = $movementDate;
        $this->reason = $reason;
        $this->recordedBy = $recordedBy;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFlock(): Flock
    {
        return $this->flock;
    }

    public function setFlock(Flock $flock): self
    {
        $this->flock = $flock;
        return $this;
    }

    public function getType(): FlockMovementType
    {
        return $this->type;
    }

    public function setType(FlockMovementType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): self
    {
        $this->quantity = $quantity;
        return $this;
    }

    public function getMovementDate(): \DateTimeImmutable
    {
        return $this->movementDate;
    }

    public function setMovementDate(\DateTimeImmutable $movementDate): self
    {
        $this->movementDate = $movementDate;
        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): self
    {
        $this->reason = $reason;
        return $this;
    }

    public function getRecordedBy(): ?User
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?User $recordedBy): self
    {
        $this->recordedBy = $recordedBy;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
