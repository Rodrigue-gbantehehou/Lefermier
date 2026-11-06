<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\PaymentMethod;
use App\Enum\PaymentStatus;
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

    #[ORM\Column(type: Types::STRING, length: 20, enumType: PaymentStatus::class)]
    private PaymentStatus $paymentStatus = PaymentStatus::PAID;

    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $paidAmount = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $dueDate = null;

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
        PaymentStatus $paymentStatus = PaymentStatus::PAID,
        ?int $paidAmount = null,
        ?\DateTimeImmutable $dueDate = null,
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
        $this->paymentStatus = $paymentStatus;
        $this->dueDate = $dueDate;
        if ($paidAmount !== null) {
            $this->setPaidAmount($paidAmount);
        } else {
            $this->paidAmount = $paymentStatus === PaymentStatus::UNPAID ? '0' : $this->amount;
            $this->syncPaymentState();
        }
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getPaymentStatus(): PaymentStatus
    {
        return $this->paymentStatus ?? PaymentStatus::PAID;
    }

    public function setPaymentStatus(PaymentStatus $paymentStatus): self
    {
        $this->paymentStatus = $paymentStatus;
        if ($paymentStatus === PaymentStatus::PAID) {
            $this->paidAmount = $this->amount;
            $this->dueDate = null;
        } elseif ($paymentStatus === PaymentStatus::UNPAID) {
            $this->paidAmount = '0';
        }

        return $this;
    }

    public function getPaidAmount(): int
    {
        if ($this->paidAmount !== null) {
            return min($this->getAmount(), max(0, (int) $this->paidAmount));
        }

        return $this->paymentStatus === PaymentStatus::UNPAID ? 0 : $this->getAmount();
    }

    public function setPaidAmount(?int $paidAmount): self
    {
        if ($paidAmount === null) {
            $this->paidAmount = $this->paymentStatus === PaymentStatus::UNPAID ? '0' : $this->amount;
            return $this;
        }

        $clamped = min($this->getAmount(), max(0, $paidAmount));
        $this->paidAmount = (string) $clamped;

        if ($clamped === 0) {
            $this->paymentStatus = PaymentStatus::UNPAID;
        } elseif ($clamped >= $this->getAmount()) {
            $this->paymentStatus = PaymentStatus::PAID;
            $this->dueDate = null;
        } else {
            $this->paymentStatus = PaymentStatus::PARTIAL;
        }

        return $this;
    }

    /**
     * Réconcilie automatiquement le montant déjà réglé et le statut de paiement
     * lorsque le montant total de la transaction est modifié.
     */
    public function syncPaymentState(): self
    {
        $total = $this->getAmount();

        if ($this->paymentStatus === PaymentStatus::PAID) {
            $this->paidAmount = (string) $total;
            $this->dueDate = null;
            return $this;
        }

        if ($this->paymentStatus === PaymentStatus::UNPAID) {
            $this->paidAmount = '0';
            return $this;
        }

        $paid = $this->paidAmount !== null ? max(0, (int) $this->paidAmount) : 0;
        if ($paid >= $total) {
            $this->paidAmount = (string) $total;
            $this->paymentStatus = PaymentStatus::PAID;
            $this->dueDate = null;
        } elseif ($paid <= 0) {
            $this->paidAmount = '0';
            $this->paymentStatus = PaymentStatus::UNPAID;
        } else {
            $this->paidAmount = (string) $paid;
            $this->paymentStatus = PaymentStatus::PARTIAL;
        }

        return $this;
    }

    public function getRemainingAmount(): int
    {
        return max(0, $this->getAmount() - $this->getPaidAmount());
    }

    public function getDueDate(): ?\DateTimeImmutable
    {
        return $this->dueDate;
    }

    public function setDueDate(?\DateTimeImmutable $dueDate): self
    {
        $this->dueDate = $dueDate;
        return $this;
    }

    public function isOverdue(): bool
    {
        if ($this->getRemainingAmount() <= 0 || $this->dueDate === null) {
            return false;
        }

        return $this->dueDate < new \DateTimeImmutable('today');
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
        $this->syncPaymentState();
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
