<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ProductionType;
use App\Repository\FarmRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: FarmRepository::class)]
#[ORM\Table(name: 'farms')]
#[ORM\HasLifecycleCallbacks]
class Farm
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Organization::class, inversedBy: 'farms')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Organization $organization;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $code = null;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: ProductionType::class)]
    private ProductionType $productionType = ProductionType::MIXED;

    #[ORM\Column(type: Types::STRING, length: 3)]
    private string $currency = 'XOF';

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $locationCity = null;

    #[ORM\Column(type: Types::STRING, length: 2)]
    private string $locationCountry = 'BJ';

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, FarmMembership>
     */
    #[ORM\OneToMany(targetEntity: FarmMembership::class, mappedBy: 'farm', cascade: ['persist', 'remove'])]
    private Collection $farmMemberships;

    /**
     * @var Collection<int, Building>
     */
    #[ORM\OneToMany(targetEntity: Building::class, mappedBy: 'farm', cascade: ['persist', 'remove'])]
    private Collection $buildings;

    public function __construct(Organization $organization, string $name, ProductionType $productionType = ProductionType::MIXED)
    {
        $this->id = new Ulid();
        $this->organization = $organization;
        $this->name = $name;
        $this->productionType = $productionType;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->farmMemberships = new ArrayCollection();
        $this->buildings = new ArrayCollection();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getOrganization(): Organization
    {
        return $this->organization;
    }

    public function setOrganization(Organization $organization): self
    {
        $this->organization = $organization;
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

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(?string $code): self
    {
        $this->code = $code;
        return $this;
    }

    public function getProductionType(): ProductionType
    {
        return $this->productionType;
    }

    public function setProductionType(ProductionType $productionType): self
    {
        $this->productionType = $productionType;
        return $this;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): self
    {
        $this->currency = $currency;
        return $this;
    }

    public function getLocationCity(): ?string
    {
        return $this->locationCity;
    }

    public function setLocationCity(?string $locationCity): self
    {
        $this->locationCity = $locationCity;
        return $this;
    }

    public function getLocationCountry(): string
    {
        return $this->locationCountry;
    }

    public function setLocationCountry(string $locationCountry): self
    {
        $this->locationCountry = $locationCountry;
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
     * @return Collection<int, FarmMembership>
     */
    public function getFarmMemberships(): Collection
    {
        return $this->farmMemberships;
    }

    /**
     * @return Collection<int, Building>
     */
    public function getBuildings(): Collection
    {
        return $this->buildings;
    }

    public function addBuilding(Building $building): self
    {
        if (!$this->buildings->contains($building)) {
            $this->buildings->add($building);
            $building->setFarm($this);
        }

        return $this;
    }

    public function removeBuilding(Building $building): self
    {
        if ($this->buildings->removeElement($building)) {
            // Building removal
        }

        return $this;
    }
}
