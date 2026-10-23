<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\OrganizationStatus;
use App\Repository\OrganizationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: OrganizationRepository::class)]
#[ORM\Table(name: 'organizations')]
#[ORM\HasLifecycleCallbacks]
class Organization
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 160, unique: true)]
    private string $slug;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $subscriptionPlan = 'STANDARD';

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $subscriptionBillingCycle = 'MONTHLY'; // 'MONTHLY', 'ANNUALLY'

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $subscriptionRenewalDate = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $subscriptionTrialEndsAt = null;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: OrganizationStatus::class)]
    private OrganizationStatus $status = OrganizationStatus::ACTIVE;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, Farm>
     */
    #[ORM\OneToMany(targetEntity: Farm::class, mappedBy: 'organization', cascade: ['persist', 'remove'])]
    private Collection $farms;

    public function __construct(string $name, string $slug)
    {
        $this->id = new Ulid();
        $this->name = $name;
        $this->slug = $slug;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->farms = new ArrayCollection();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
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

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): self
    {
        $this->slug = $slug;
        return $this;
    }

    public function getSubscriptionPlan(): string
    {
        return $this->subscriptionPlan;
    }

    public function setSubscriptionPlan(string $subscriptionPlan): self
    {
        $this->subscriptionPlan = strtoupper(trim($subscriptionPlan));
        return $this;
    }

    public function getSubscriptionBillingCycle(): string
    {
        return $this->subscriptionBillingCycle;
    }

    public function setSubscriptionBillingCycle(string $billingCycle): self
    {
        $upper = strtoupper(trim($billingCycle));
        if (in_array($upper, ['MONTHLY', 'ANNUALLY'], true)) {
            $this->subscriptionBillingCycle = $upper;
        }
        return $this;
    }

    public function getSubscriptionRenewalDate(): ?\DateTimeImmutable
    {
        return $this->subscriptionRenewalDate;
    }

    public function setSubscriptionRenewalDate(?\DateTimeImmutable $date): self
    {
        $this->subscriptionRenewalDate = $date;
        return $this;
    }

    public function getSubscriptionTrialEndsAt(): ?\DateTimeImmutable
    {
        return $this->subscriptionTrialEndsAt;
    }

    public function setSubscriptionTrialEndsAt(?\DateTimeImmutable $date): self
    {
        $this->subscriptionTrialEndsAt = $date;
        return $this;
    }

    public function getStatus(): OrganizationStatus
    {
        return $this->status;
    }

    public function setStatus(OrganizationStatus $status): self
    {
        $this->status = $status;
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
     * @return Collection<int, Farm>
     */
    public function getFarms(): Collection
    {
        return $this->farms;
    }

    public function addFarm(Farm $farm): self
    {
        if (!$this->farms->contains($farm)) {
            $this->farms->add($farm);
            $farm->setOrganization($this);
        }

        return $this;
    }

    public function removeFarm(Farm $farm): self
    {
        if ($this->farms->removeElement($farm)) {
            if ($farm->getOrganization() === $this) {
                // Orphan removal handled or nullified
            }
        }

        return $this;
    }
}
