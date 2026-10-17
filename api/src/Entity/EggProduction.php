<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\EggCollectionSession;
use App\Repository\EggProductionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: EggProductionRepository::class)]
#[ORM\Table(name: 'egg_productions')]
#[ORM\UniqueConstraint(name: 'uniq_flock_date_session', columns: ['flock_id', 'production_date', 'session'])]
#[ORM\HasLifecycleCallbacks]
class EggProduction
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Flock::class, inversedBy: 'eggProductions')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Flock $flock;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $productionDate;

    #[ORM\Column(type: Types::STRING, length: 20, enumType: EggCollectionSession::class)]
    private EggCollectionSession $session = EggCollectionSession::ALL_DAY;

    #[ORM\Column(type: Types::INTEGER)]
    private int $goodEggs = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $crackedEggs = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $dirtyEggs = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $deformedEggs = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $totalEggs = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $traysCount = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $looseEggsCount = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $flockQuantityAtDate = 0;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2)]
    private string $layingRate = '0.00';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $recordedBy = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        Flock $flock,
        \DateTimeImmutable $productionDate,
        EggCollectionSession $session = EggCollectionSession::ALL_DAY,
        int $goodEggs = 0,
        int $crackedEggs = 0,
        int $dirtyEggs = 0,
        int $deformedEggs = 0,
        ?int $flockQuantityAtDate = null,
        ?string $notes = null,
        ?User $recordedBy = null,
    ) {
        $this->id = new Ulid();
        $this->flock = $flock;
        $this->productionDate = $productionDate;
        $this->session = $session;
        $this->goodEggs = max(0, $goodEggs);
        $this->crackedEggs = max(0, $crackedEggs);
        $this->dirtyEggs = max(0, $dirtyEggs);
        $this->deformedEggs = max(0, $deformedEggs);
        $this->flockQuantityAtDate = $flockQuantityAtDate ?? $flock->getCurrentQuantity();
        $this->notes = $notes;
        $this->recordedBy = $recordedBy;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();

        $this->recomputeTotals();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
        $this->recomputeTotals();
    }

    public function recomputeTotals(): void
    {
        $this->totalEggs = $this->goodEggs + $this->crackedEggs + $this->dirtyEggs + $this->deformedEggs;
        $this->traysCount = intdiv($this->goodEggs, 30);
        $this->looseEggsCount = $this->goodEggs % 30;

        if ($this->flockQuantityAtDate > 0) {
            $rate = ($this->totalEggs / $this->flockQuantityAtDate) * 100;
            $this->layingRate = number_format(min(200.0, max(0.0, $rate)), 2, '.', '');
        } else {
            $this->layingRate = '0.00';
        }
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFlock(): Flock
    {
        return $this->flock;
    }

    public function setFlock(Flock $flock): self
    {
        $this->flock = $flock;
        return $this;
    }

    public function getProductionDate(): \DateTimeImmutable
    {
        return $this->productionDate;
    }

    public function setProductionDate(\DateTimeImmutable $productionDate): self
    {
        $this->productionDate = $productionDate;
        return $this;
    }

    public function getSession(): EggCollectionSession
    {
        return $this->session;
    }

    public function setSession(EggCollectionSession $session): self
    {
        $this->session = $session;
        return $this;
    }

    public function getGoodEggs(): int
    {
        return $this->goodEggs;
    }

    public function setGoodEggs(int $goodEggs): self
    {
        $this->goodEggs = max(0, $goodEggs);
        $this->recomputeTotals();
        return $this;
    }

    public function getCrackedEggs(): int
    {
        return $this->crackedEggs;
    }

    public function setCrackedEggs(int $crackedEggs): self
    {
        $this->crackedEggs = max(0, $crackedEggs);
        $this->recomputeTotals();
        return $this;
    }

    public function getDirtyEggs(): int
    {
        return $this->dirtyEggs;
    }

    public function setDirtyEggs(int $dirtyEggs): self
    {
        $this->dirtyEggs = max(0, $dirtyEggs);
        $this->recomputeTotals();
        return $this;
    }

    public function getDeformedEggs(): int
    {
        return $this->deformedEggs;
    }

    public function setDeformedEggs(int $deformedEggs): self
    {
        $this->deformedEggs = max(0, $deformedEggs);
        $this->recomputeTotals();
        return $this;
    }

    public function getTotalEggs(): int
    {
        return $this->totalEggs;
    }

    public function getTraysCount(): int
    {
        return $this->traysCount;
    }

    public function getLooseEggsCount(): int
    {
        return $this->looseEggsCount;
    }

    public function getFlockQuantityAtDate(): int
    {
        return $this->flockQuantityAtDate;
    }

    public function setFlockQuantityAtDate(int $quantity): self
    {
        $this->flockQuantityAtDate = max(0, $quantity);
        $this->recomputeTotals();
        return $this;
    }

    public function getLayingRate(): string
    {
        return $this->layingRate;
    }

    public function getLayingRateFloat(): float
    {
        return (float) $this->layingRate;
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
