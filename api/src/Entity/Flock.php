<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\FlockMovementType;
use App\Enum\FlockStatus;
use App\Enum\PoultryType;
use App\Repository\FlockRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: FlockRepository::class)]
#[ORM\Table(name: 'flocks')]
#[ORM\UniqueConstraint(name: 'uniq_farm_flock_code', columns: ['farm_id', 'code'])]
#[ORM\HasLifecycleCallbacks]
class Flock
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\ManyToOne(targetEntity: Building::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Building $building = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $code;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: PoultryType::class)]
    private PoultryType $poultryType = PoultryType::BROILER;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $strain = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $initialQuantity;

    #[ORM\Column(type: Types::INTEGER)]
    private int $currentQuantity;

    #[ORM\Column(type: Types::INTEGER)]
    private int $initialAgeDays = 1;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $startDate;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $estimatedEndDate = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $actualEndDate = null;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: FlockStatus::class)]
    private FlockStatus $status = FlockStatus::ACTIVE;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, FlockMovement>
     */
    #[ORM\OneToMany(targetEntity: FlockMovement::class, mappedBy: 'flock', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['movementDate' => 'DESC', 'createdAt' => 'DESC'])]
    private Collection $movements;

    /**
     * @var Collection<int, EggProduction>
     */
    #[ORM\OneToMany(targetEntity: EggProduction::class, mappedBy: 'flock', cascade: ['persist', 'remove'])]
    #[ORM\OrderBy(['productionDate' => 'DESC', 'createdAt' => 'DESC'])]
    private Collection $eggProductions;

    public function __construct(
        Farm $farm,
        string $code,
        string $name,
        int $initialQuantity,
        \DateTimeImmutable $startDate,
        PoultryType $poultryType = PoultryType::BROILER,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->code = $code;
        $this->name = $name;
        $this->initialQuantity = $initialQuantity;
        $this->currentQuantity = $initialQuantity;
        $this->startDate = $startDate;
        $this->poultryType = $poultryType;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->movements = new ArrayCollection();
        $this->eggProductions = new ArrayCollection();
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

    public function getBuilding(): ?Building
    {
        return $this->building;
    }

    public function setBuilding(?Building $building): self
    {
        $this->building = $building;
        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = $code;
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

    public function getPoultryType(): PoultryType
    {
        return $this->poultryType;
    }

    public function setPoultryType(PoultryType $poultryType): self
    {
        $this->poultryType = $poultryType;
        return $this;
    }

    public function getStrain(): ?string
    {
        return $this->strain;
    }

    public function setStrain(?string $strain): self
    {
        $this->strain = $strain;
        return $this;
    }

    public function getInitialQuantity(): int
    {
        return $this->initialQuantity;
    }

    public function setInitialQuantity(int $initialQuantity): self
    {
        $this->initialQuantity = $initialQuantity;
        return $this;
    }

    public function getCurrentQuantity(): int
    {
        return $this->currentQuantity;
    }

    public function setCurrentQuantity(int $currentQuantity): self
    {
        $this->currentQuantity = max(0, $currentQuantity);
        return $this;
    }

    public function getInitialAgeDays(): int
    {
        return $this->initialAgeDays;
    }

    public function setInitialAgeDays(int $initialAgeDays): self
    {
        $this->initialAgeDays = max(0, $initialAgeDays);
        return $this;
    }

    public function getStartDate(): \DateTimeImmutable
    {
        return $this->startDate;
    }

    public function setStartDate(\DateTimeImmutable $startDate): self
    {
        $this->startDate = $startDate;
        return $this;
    }

    public function getEstimatedEndDate(): ?\DateTimeImmutable
    {
        return $this->estimatedEndDate;
    }

    public function setEstimatedEndDate(?\DateTimeImmutable $estimatedEndDate): self
    {
        $this->estimatedEndDate = $estimatedEndDate;
        return $this;
    }

    public function getActualEndDate(): ?\DateTimeImmutable
    {
        return $this->actualEndDate;
    }

    public function setActualEndDate(?\DateTimeImmutable $actualEndDate): self
    {
        $this->actualEndDate = $actualEndDate;
        return $this;
    }

    public function getStatus(): FlockStatus
    {
        return $this->status;
    }

    public function setStatus(FlockStatus $status): self
    {
        $this->status = $status;
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
     * @return Collection<int, FlockMovement>
     */
    public function getMovements(): Collection
    {
        return $this->movements;
    }

    public function addMovement(FlockMovement $movement): self
    {
        if (!$this->movements->contains($movement)) {
            $this->movements->add($movement);
            $movement->setFlock($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, EggProduction>
     */
    public function getEggProductions(): Collection
    {
        return $this->eggProductions;
    }

    public function addEggProduction(EggProduction $eggProduction): self
    {
        if (!$this->eggProductions->contains($eggProduction)) {
            $this->eggProductions->add($eggProduction);
            $eggProduction->setFlock($this);
        }

        return $this;
    }

    /**
     * Calcule l'âge courant de la bande en jours à une date donnée (aujourd'hui par défaut).
     */
    public function getAgeInDays(?\DateTimeImmutable $asOf = null): int
    {
        $asOf = $asOf ?? new \DateTimeImmutable();
        if ($asOf < $this->startDate) {
            return $this->initialAgeDays;
        }

        $diff = $this->startDate->diff($asOf);
        return (int) $diff->days + $this->initialAgeDays;
    }

    /**
     * Calcule l'âge en semaines d'élevage.
     */
    public function getAgeInWeeks(?\DateTimeImmutable $asOf = null): int
    {
        return (int) floor($this->getAgeInDays($asOf) / 7);
    }

    /**
     * Calcule le taux de mortalité/perte cumulé en pourcentage.
     */
    public function getMortalityRate(): float
    {
        if ($this->initialQuantity <= 0) {
            return 0.0;
        }

        $losses = $this->initialQuantity - $this->currentQuantity;
        return round(($losses / $this->initialQuantity) * 100, 2);
    }
}
