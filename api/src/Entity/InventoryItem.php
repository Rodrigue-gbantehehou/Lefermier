<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\InventoryCategory;
use App\Enum\InventoryUnit;
use App\Repository\InventoryItemRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: InventoryItemRepository::class)]
#[ORM\Table(name: 'inventory_items')]
#[ORM\UniqueConstraint(name: 'uniq_farm_inventory_item', columns: ['farm_id', 'name', 'category'])]
#[ORM\HasLifecycleCallbacks]
class InventoryItem
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: InventoryCategory::class)]
    private InventoryCategory $category = InventoryCategory::FEED;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $customCategory = null;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: InventoryUnit::class)]
    private InventoryUnit $unit = InventoryUnit::BAG_50KG;

    #[ORM\Column(type: Types::DECIMAL, precision: 8, scale: 2, nullable: true)]
    private ?string $packageWeightKg = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $currentStock = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $alertThreshold = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $unitPrice = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, StockMovement>
     */
    #[ORM\OneToMany(targetEntity: StockMovement::class, mappedBy: 'item', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['movementDate' => 'DESC', 'createdAt' => 'DESC'])]
    private Collection $movements;

    public function __construct(
        Farm $farm,
        string $name,
        InventoryCategory $category = InventoryCategory::FEED,
        InventoryUnit $unit = InventoryUnit::BAG_50KG,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->name = $name;
        $this->category = $category;
        $this->unit = $unit;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->movements = new ArrayCollection();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function setFarm(Farm $farm): self
    {
        $this->farm = $farm;
        return $this;
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

    public function getCategory(): InventoryCategory
    {
        return $this->category;
    }

    public function setCategory(InventoryCategory $category): self
    {
        $this->category = $category;
        return $this;
    }

    public function getCustomCategory(): ?string
    {
        return $this->customCategory;
    }

    public function setCustomCategory(?string $customCategory): self
    {
        $this->customCategory = $customCategory;
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

    public function getPackageWeightKg(): ?float
    {
        return $this->packageWeightKg !== null ? (float) $this->packageWeightKg : null;
    }

    public function setPackageWeightKg(?float $packageWeightKg): self
    {
        $this->packageWeightKg = $packageWeightKg !== null && $packageWeightKg > 0.0
            ? number_format($packageWeightKg, 2, '.', '')
            : null;
        return $this;
    }

    public function getCurrentStock(): float
    {
        return (float) $this->currentStock;
    }

    public function setCurrentStock(float $currentStock): self
    {
        $this->currentStock = number_format(max(0.0, $currentStock), 2, '.', '');
        return $this;
    }

    public function getAlertThreshold(): ?float
    {
        return $this->alertThreshold !== null ? (float) $this->alertThreshold : null;
    }

    public function setAlertThreshold(?float $alertThreshold): self
    {
        $this->alertThreshold = $alertThreshold !== null
            ? number_format(max(0.0, $alertThreshold), 2, '.', '')
            : null;
        return $this;
    }

    public function getUnitPrice(): ?int
    {
        return $this->unitPrice;
    }

    public function setUnitPrice(?int $unitPrice): self
    {
        $this->unitPrice = $unitPrice !== null ? max(0, $unitPrice) : null;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function isLowStock(): bool
    {
        if ($this->alertThreshold === null) {
            return false;
        }

        return $this->getCurrentStock() <= (float) $this->alertThreshold;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function updateTimestamp(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /**
     * @return Collection<int, StockMovement>
     */
    public function getMovements(): Collection
    {
        return $this->movements;
    }
}
