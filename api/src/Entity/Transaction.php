<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\PaymentMethod;
use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use App\Repository\TransactionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: TransactionRepository::class)]
#[ORM\Table(name: 'transactions')]
#[ORM\Index(name: 'idx_farm_transaction_date', columns: ['farm_id', 'transaction_date'])]
#[ORM\Index(name: 'idx_farm_transaction_type', columns: ['farm_id', 'type'])]
#[ORM\Index(name: 'idx_flock_transaction', columns: ['flock_id'])]
#[ORM\HasLifecycleCallbacks]
class Transaction
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: TransactionType::class)]
    private TransactionType $type;

    #[ORM\Column(type: Types::STRING, length: 40, enumType: TransactionCategory::class)]
    private TransactionCategory $category;

    #[ORM\Column(type: Types::BIGINT)]
    private string $amount;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: PaymentMethod::class)]
    private PaymentMethod $paymentMethod = PaymentMethod::CASH;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $transactionDate;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $reference = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\ManyToOne(targetEntity: Contact::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Contact $contact = null;

    #[ORM\ManyToOne(targetEntity: Flock::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Flock $flock = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        Farm $farm,
        TransactionType $type,
        TransactionCategory $category,
        int $amount,
        \DateTimeImmutable $transactionDate,
        PaymentMethod $paymentMethod = PaymentMethod::CASH,
        ?string $reference = null,
        ?string $description = null,
        ?Contact $contact = null,
        ?Flock $flock = null,
        ?User $recordedBy = null,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->type = $type;
        $this->category = $category;
        $this->amount = (string) max(1, $amount);
        $this->transactionDate = $transactionDate;
        $this->paymentMethod = $paymentMethod;
        $this->reference = $reference;
        $this->description = $description;
        $this->contact = $contact;
        $this->flock = $flock;
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

    public function setFarm(Farm $farm): self
    {
        $this->farm = $farm;
        return $this;
    }

    public function getType(): TransactionType
    {
        return $this->type;
    }

    public function setType(TransactionType $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getCategory(): TransactionCategory
    {
        return $this->category;
    }

    public function setCategory(TransactionCategory $category): self
    {
        $this->category = $category;
        return $this;
    }

    public function getAmount(): int
    {
        return (int) $this->amount;
    }

    public function setAmount(int $amount): self
    {
        $this->amount = (string) max(1, $amount);
        return $this;
    }

    public function getPaymentMethod(): PaymentMethod
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(PaymentMethod $paymentMethod): self
    {
        $this->paymentMethod = $paymentMethod;
        return $this;
    }

    public function getTransactionDate(): \DateTimeImmutable
    {
        return $this->transactionDate;
    }

    public function setTransactionDate(\DateTimeImmutable $transactionDate): self
    {
        $this->transactionDate = $transactionDate;
        return $this;
    }

    public function getReference(): ?string
    {
        return $this->reference;
    }

    public function setReference(?string $reference): self
    {
        $this->reference = $reference;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    public function getContact(): ?Contact
    {
        return $this->contact;
    }

    public function setContact(?Contact $contact): self
    {
        $this->contact = $contact;
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

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
