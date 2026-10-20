<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\AdministrationMethod;
use App\Enum\HealthTreatmentStatus;
use App\Enum\HealthTreatmentType;
use App\Repository\HealthTreatmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: HealthTreatmentRepository::class)]
#[ORM\Table(name: 'health_treatments')]
#[ORM\Index(name: 'idx_health_farm', columns: ['farm_id'])]
#[ORM\Index(name: 'idx_health_flock', columns: ['flock_id'])]
#[ORM\Index(name: 'idx_health_scheduled_date', columns: ['scheduled_date'])]
#[ORM\Index(name: 'idx_health_status', columns: ['status'])]
#[ORM\HasLifecycleCallbacks]
class HealthTreatment
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(name: 'farm_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\ManyToOne(targetEntity: Flock::class)]
    #[ORM\JoinColumn(name: 'flock_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Flock $flock;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $title;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: HealthTreatmentType::class)]
    private HealthTreatmentType $type = HealthTreatmentType::VACCINATION;

    #[ORM\Column(name: 'administration_method', type: Types::STRING, length: 30, enumType: AdministrationMethod::class)]
    private AdministrationMethod $administrationMethod = AdministrationMethod::DRINKING_WATER;

    #[ORM\Column(name: 'target_age_days', type: Types::INTEGER)]
    private int $targetAgeDays;

    #[ORM\Column(name: 'scheduled_date', type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $scheduledDate;

    #[ORM\Column(name: 'administered_date', type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $administeredDate = null;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: HealthTreatmentStatus::class)]
    private HealthTreatmentStatus $status = HealthTreatmentStatus::SCHEDULED;

    #[ORM\Column(name: 'quantity_used', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $quantityUsed = null;

    #[ORM\Column(name: 'cost_fcfa', type: Types::INTEGER, nullable: true)]
    private ?int $costFcfa = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $veterinarian = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\ManyToOne(targetEntity: InventoryItem::class)]
    #[ORM\JoinColumn(name: 'inventory_item_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?InventoryItem $inventoryItem = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'recorded_by_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        Farm $farm,
        Flock $flock,
        string $title,
        HealthTreatmentType $type,
        AdministrationMethod $administrationMethod,
        int $targetAgeDays,
        \DateTimeImmutable $scheduledDate,
        HealthTreatmentStatus $status = HealthTreatmentStatus::SCHEDULED,
        ?int $costFcfa = null,
        ?string $quantityUsed = null,
        ?string $veterinarian = null,
        ?string $notes = null,
        ?InventoryItem $inventoryItem = null,
        ?User $recordedBy = null
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->flock = $flock;
        $this->title = $title;
        $this->type = $type;
        $this->administrationMethod = $administrationMethod;
        $this->targetAgeDays = $targetAgeDays;
        $this->scheduledDate = $scheduledDate;
        $this->status = $status;
        $this->costFcfa = $costFcfa;
        $this->quantityUsed = $quantityUsed;
        $this->veterinarian = $veterinarian;
        $this->notes = $notes;
        $this->inventoryItem = $inventoryItem;
        $this->recordedBy = $recordedBy;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function setFarm(Farm $farm): static
    {
        $this->farm = $farm;
        return $this;
    }

    public function getFlock(): Flock
    {
        return $this->flock;
    }

    public function setFlock(Flock $flock): static
    {
        $this->flock = $flock;
        return $this;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getType(): HealthTreatmentType
    {
        return $this->type;
    }

    public function setType(HealthTreatmentType $type): static
    {
        $this->type = $type;
        return $this;
    }

    public function getAdministrationMethod(): AdministrationMethod
    {
        return $this->administrationMethod;
    }

    public function setAdministrationMethod(AdministrationMethod $administrationMethod): static
    {
        $this->administrationMethod = $administrationMethod;
        return $this;
    }

    public function getTargetAgeDays(): int
    {
        return $this->targetAgeDays;
    }

    public function setTargetAgeDays(int $targetAgeDays): static
    {
        $this->targetAgeDays = $targetAgeDays;
        return $this;
    }

    public function getScheduledDate(): \DateTimeImmutable
    {
        return $this->scheduledDate;
    }

    public function setScheduledDate(\DateTimeImmutable $scheduledDate): static
    {
        $this->scheduledDate = $scheduledDate;
        return $this;
    }

    public function getAdministeredDate(): ?\DateTimeImmutable
    {
        return $this->administeredDate;
    }

    public function setAdministeredDate(?\DateTimeImmutable $administeredDate): static
    {
        $this->administeredDate = $administeredDate;
        return $this;
    }

    public function getStatus(): HealthTreatmentStatus
    {
        return $this->status;
    }

    public function setStatus(HealthTreatmentStatus $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getQuantityUsed(): ?string
    {
        return $this->quantityUsed;
    }

    public function setQuantityUsed(?string $quantityUsed): static
    {
        $this->quantityUsed = $quantityUsed;
        return $this;
    }

    public function getCostFcfa(): ?int
    {
        return $this->costFcfa;
    }

    public function setCostFcfa(?int $costFcfa): static
    {
        $this->costFcfa = $costFcfa;
        return $this;
    }

    public function getVeterinarian(): ?string
    {
        return $this->veterinarian;
    }

    public function setVeterinarian(?string $veterinarian): static
    {
        $this->veterinarian = $veterinarian;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;
        return $this;
    }

    public function getInventoryItem(): ?InventoryItem
    {
        return $this->inventoryItem;
    }

    public function setInventoryItem(?InventoryItem $inventoryItem): static
    {
        $this->inventoryItem = $inventoryItem;
        return $this;
    }

    public function getRecordedBy(): ?User
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?User $recordedBy): static
    {
        $this->recordedBy = $recordedBy;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
