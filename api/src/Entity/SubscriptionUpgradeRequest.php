<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SubscriptionUpgradeRequestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: SubscriptionUpgradeRequestRepository::class)]
#[ORM\Table(name: 'subscription_upgrade_requests')]
#[ORM\Index(columns: ['status'], name: 'idx_sub_req_status')]
#[ORM\Index(columns: ['created_at'], name: 'idx_sub_req_created_at')]
class SubscriptionUpgradeRequest
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private Ulid $id;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\ManyToOne(targetEntity: Organization::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Organization $organization;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $currentPlan;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $targetPlan;

    #[ORM\Column(type: Types::STRING, length: 150)]
    private string $targetPlanName;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $billingCycle = 'MONTHLY';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $message = null;

    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $status = 'PENDING'; // PENDING, APPROVED, REJECTED

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $adminNotes = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $processedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $processedAt = null;

    public function __construct(
        Farm $farm,
        Organization $organization,
        User $user,
        string $currentPlan,
        string $targetPlan,
        string $targetPlanName,
        string $billingCycle = 'MONTHLY',
        ?string $message = null,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->organization = $organization;
        $this->user = $user;
        $this->currentPlan = strtoupper(trim($currentPlan));
        $this->targetPlan = strtoupper(trim($targetPlan));
        $this->targetPlanName = trim($targetPlanName);
        $this->billingCycle = in_array(strtoupper($billingCycle), ['MONTHLY', 'ANNUALLY'], true)
            ? strtoupper($billingCycle)
            : 'MONTHLY';
        $this->message = $message !== null && trim($message) !== '' ? trim($message) : null;
        $this->status = 'PENDING';
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function getOrganization(): Organization
    {
        return $this->organization;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getCurrentPlan(): string
    {
        return $this->currentPlan;
    }

    public function getTargetPlan(): string
    {
        return $this->targetPlan;
    }

    public function getTargetPlanName(): string
    {
        return $this->targetPlanName;
    }

    public function getBillingCycle(): string
    {
        return $this->billingCycle;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getAdminNotes(): ?string
    {
        return $this->adminNotes;
    }

    public function getProcessedBy(): ?User
    {
        return $this->processedBy;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getProcessedAt(): ?\DateTimeImmutable
    {
        return $this->processedAt;
    }

    public function approve(User $admin, ?string $adminNotes = null): self
    {
        $this->status = 'APPROVED';
        $this->processedBy = $admin;
        $this->adminNotes = $adminNotes;
        $this->processedAt = new \DateTimeImmutable();

        return $this;
    }

    public function reject(User $admin, ?string $adminNotes = null): self
    {
        $this->status = 'REJECTED';
        $this->processedBy = $admin;
        $this->adminNotes = $adminNotes;
        $this->processedAt = new \DateTimeImmutable();

        return $this;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id->toBase32(),
            'farmId' => $this->farm->getId()?->toBase32(),
            'farmName' => $this->farm->getName(),
            'organizationId' => $this->organization->getId()?->toBase32(),
            'organizationName' => $this->organization->getName(),
            'userId' => $this->user->getId()?->toBase32(),
            'userName' => $this->user->getFullName(),
            'userEmail' => $this->user->getEmail(),
            'currentPlan' => $this->currentPlan,
            'targetPlan' => $this->targetPlan,
            'targetPlanName' => $this->targetPlanName,
            'billingCycle' => $this->billingCycle,
            'message' => $this->message,
            'status' => $this->status,
            'adminNotes' => $this->adminNotes,
            'processedByName' => $this->processedBy?->getFullName(),
            'createdAt' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'processedAt' => $this->processedAt?->format(\DateTimeInterface::ATOM),
        ];
    }
}
