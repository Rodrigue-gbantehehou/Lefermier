<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\InventoryUnit;
use App\Enum\StockMovementType;
use App\Repository\StockMovementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: StockMovementRepository::class)]
#[ORM\Table(name: 'stock_movements')]
class StockMovement
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: InventoryItem::class, inversedBy: 'movements')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private InventoryItem $item;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: StockMovementType::class)]
    private StockMovementType $type;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $quantity;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: InventoryUnit::class)]
    private InventoryUnit $unit;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $unitPrice = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $movementDate;

    #[ORM\ManyToOne(targetEntity: Flock::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Flock $flock = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        InventoryItem $item,
        StockMovementType $type,
        float $quantity,
        InventoryUnit $unit,
        \DateTimeImmutable $movementDate,
        ?string $reason = null,
        ?Flock $flock = null,
        ?int $unitPrice = null,
        ?User $recordedBy = null,
    ) {
        $this->id = new Ulid();
        $this->item = $item;
        $this->type = $type;
        $this->quantity = number_format(max(0.01, $quantity), 2, '.', '');
        $this->unit = $unit;
        $this->movementDate = $movementDate;
        $this->reason = $reason;
        $this->flock = $flock;
        $this->unitPrice = $unitPrice;
        $this->recordedBy = $recordedBy;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getItem(): InventoryItem
    {
        return $this->item;
    }

    public function setItem(InventoryItem $item): self
    {
        $this->item = $item;
        return $this;
    }

    public function getType(): StockMovementType
    {
        return $this->type;
    }

    public function setType(StockMovementType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getQuantity(): float
    {
        return (float) $this->quantity;
    }

    public function setQuantity(float $quantity): self
    {
        $this->quantity = number_format(max(0.01, $quantity), 2, '.', '');
        return $this;
    }

    public function getUnit(): InventoryUnit
    {
        return $this->unit;
    }

    public function setUnit(InventoryUnit $unit): self
    {
        $this->unit = $unit;
        return $this;
    }

    public function getUnitPrice(): ?int
    {
        return $this->unitPrice;
    }

    public function setUnitPrice(?int $unitPrice): self
    {
        $this->unitPrice = $unitPrice;
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

    public function getFlock(): ?Flock
    {
        return $this->flock;
    }

    public function setFlock(?Flock $flock): self
    {
        $this->flock = $flock;
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

    public function getTotalCost(): ?int
    {
        if ($this->unitPrice === null) {
            return null;
        }

        return (int) round($this->unitPrice * $this->getQuantity());
    }
}
