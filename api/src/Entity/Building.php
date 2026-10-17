<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\BuildingType;
use App\Repository\BuildingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: BuildingRepository::class)]
#[ORM\Table(name: 'buildings')]
#[ORM\HasLifecycleCallbacks]
class Building
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class, inversedBy: 'buildings')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: BuildingType::class)]
    private BuildingType $type = BuildingType::POULTRY_HOUSE;

    #[ORM\Column(type: Types::INTEGER)]
    private int $capacity = 0;

    #[ORM\Column(type: Types::DECIMAL, precision: 8, scale: 2, nullable: true)]
    private ?string $surfaceArea = null;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(Farm $farm, string $name, BuildingType $type = BuildingType::POULTRY_HOUSE, int $capacity = 0)
    {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->name = $name;
        $this->type = $type;
        $this->capacity = $capacity;
        $this->createdAt = new \DateTimeImmutable();
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

    public function getType(): BuildingType
    {
        return $this->type;
    }

    public function setType(BuildingType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getCapacity(): int
    {
        return $this->capacity;
    }

    public function setCapacity(int $capacity): self
    {
        $this->capacity = $capacity;
        return $this;
    }

    public function getSurfaceArea(): ?string
    {
        return $this->surfaceArea;
    }

    public function setSurfaceArea(?string $surfaceArea): self
    {
        $this->surfaceArea = $surfaceArea;
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
}
