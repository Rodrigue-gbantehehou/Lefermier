<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SubscriptionPlanRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

/**
 * Entité représentant une formule d'abonnement commercial Lefermier (SKU & Quotas).
 *
 * Permet la création et la modification dynamique des formules depuis le back-office admin/.
 * Modèle inspiré de Microsoft 365 Licensing & Azure Subscriptions.
 */
#[ORM\Entity(repositoryClass: SubscriptionPlanRepository::class)]
#[ORM\Table(name: 'subscription_plans')]
#[ORM\UniqueConstraint(name: 'uniq_subscription_plan_sku', columns: ['sku'])]
#[ORM\HasLifecycleCallbacks]
class SubscriptionPlan
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private Ulid $id;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $sku;

    #[ORM\Column(type: Types::STRING, length: 120)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 80)]
    private string $tier;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $badge = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $priceMonthly = 0;

    #[ORM\Column(type: Types::INTEGER)]
    private int $priceAnnually = 0;

    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $currency = 'XOF';

    /**
     * @var array{max_farms: int, max_flocks: int, max_members: int, retention_months: int}
     */
    #[ORM\Column(type: Types::JSON)]
    private array $quotas = [];

    /**
     * @var array<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $features = [];

    /**
     * @var array{accounting_exports: bool, health_alerts: bool, iot_sensors: bool, api_access: bool, priority_support: bool}
     */
    #[ORM\Column(type: Types::JSON)]
    private array $flags = [];

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isPopular = false;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isRecommended = false;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isSystem = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @param array<string, int> $quotas
     * @param array<string> $features
     * @param array<string, bool> $flags
     */
    public function __construct(
        string $sku,
        string $name,
        string $tier = 'Standard',
        int $priceMonthly = 0,
        int $priceAnnually = 0,
        array $quotas = [],
        array $features = [],
        array $flags = [],
        ?string $badge = null,
        ?string $description = null,
        bool $isPopular = false,
        bool $isRecommended = false,
        bool $isSystem = false,
        string $currency = 'XOF',
    ) {
        $this->id = new Ulid();
        $this->sku = strtoupper(trim($sku));
        $this->name = trim($name);
        $this->tier = trim($tier);
        $this->priceMonthly = max(0, $priceMonthly);
        $this->priceAnnually = max(0, $priceAnnually);
        $this->quotas = array_merge([
            'max_farms' => 1,
            'max_flocks' => 2,
            'max_members' => 2,
            'retention_months' => 3,
        ], $quotas);
        $this->features = $features;
        $this->flags = array_merge([
            'accounting_exports' => false,
            'health_alerts' => false,
            'iot_sensors' => false,
            'api_access' => false,
            'priority_support' => false,
        ], $flags);
        $this->badge = $badge;
        $this->description = $description;
        $this->isPopular = $isPopular;
        $this->isRecommended = $isRecommended;
        $this->isSystem = $isSystem;
        $this->isActive = true;
        $this->currency = $currency;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Ulid
    {
        return $this->id;
    }

    public function getSku(): string
    {
        return $this->sku;
    }

    public function setSku(string $sku): self
    {
        $this->sku = strtoupper(trim($sku));
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = trim($name);
        return $this;
    }

    public function getTier(): string
    {
        return $this->tier;
    }

    public function setTier(string $tier): self
    {
        $this->tier = trim($tier);
        return $this;
    }

    public function getBadge(): ?string
    {
        return $this->badge;
    }

    public function setBadge(?string $badge): self
    {
        $this->badge = $badge !== null && trim($badge) !== '' ? trim($badge) : null;
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

    public function getPriceMonthly(): int
    {
        return $this->priceMonthly;
    }

    public function setPriceMonthly(int $priceMonthly): self
    {
        $this->priceMonthly = max(0, $priceMonthly);
        return $this;
    }

    public function getPriceAnnually(): int
    {
        return $this->priceAnnually;
    }

    public function setPriceAnnually(int $priceAnnually): self
    {
        $this->priceAnnually = max(0, $priceAnnually);
        return $this;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): self
    {
        $this->currency = strtoupper(trim($currency));
        return $this;
    }

    /**
     * @return array<string, int>
     */
    public function getQuotas(): array
    {
        return $this->quotas;
    }

    /**
     * @param array<string, int> $quotas
     */
    public function setQuotas(array $quotas): self
    {
        $this->quotas = $quotas;
        return $this;
    }

    /**
     * @return array<string>
     */
    public function getFeatures(): array
    {
        return $this->features;
    }

    /**
     * @param array<string> $features
     */
    public function setFeatures(array $features): self
    {
        $this->features = array_values(array_filter($features, fn ($f) => is_string($f) && trim($f) !== ''));
        return $this;
    }

    /**
     * @return array<string, bool>
     */
    public function getFlags(): array
    {
        return $this->flags;
    }

    /**
     * @param array<string, bool> $flags
     */
    public function setFlags(array $flags): self
    {
        $this->flags = $flags;
        return $this;
    }

    public function isPopular(): bool
    {
        return $this->isPopular;
    }

    public function setIsPopular(bool $isPopular): self
    {
        $this->isPopular = $isPopular;
        return $this;
    }

    public function isRecommended(): bool
    {
        return $this->isRecommended;
    }

    public function setIsRecommended(bool $isRecommended): self
    {
        $this->isRecommended = $isRecommended;
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

    public function isSystem(): bool
    {
        return $this->isSystem;
    }

    public function setIsSystem(bool $isSystem): self
    {
        $this->isSystem = $isSystem;
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
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /**
     * Sérialise la formule commerciale sous forme de tableau conforme à l'API et au front-office.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $quotas = $this->quotas;
        $flags = $this->flags;

        return [
            'id' => $this->id->toBase32(),
            'sku' => $this->sku,
            'name' => $this->name,
            'tier' => $this->tier,
            'badge' => $this->badge,
            'description' => $this->description,
            'priceMonthly' => $this->priceMonthly,
            'priceAnnually' => $this->priceAnnually,
            'currency' => $this->currency,
            'quotas' => [
                'maxFarms' => (int) ($quotas['max_farms'] ?? $quotas['maxFarms'] ?? 1),
                'maxFlocks' => (int) ($quotas['max_flocks'] ?? $quotas['maxFlocks'] ?? 2),
                'maxMembers' => (int) ($quotas['max_members'] ?? $quotas['maxMembers'] ?? 2),
                'retentionMonths' => (int) ($quotas['retention_months'] ?? $quotas['retentionMonths'] ?? 3),
            ],
            'features' => $this->features,
            'flags' => [
                'accountingExports' => (bool) ($flags['accounting_exports'] ?? $flags['accountingExports'] ?? false),
                'healthAlerts' => (bool) ($flags['health_alerts'] ?? $flags['healthAlerts'] ?? false),
                'iotSensors' => (bool) ($flags['iot_sensors'] ?? $flags['iotSensors'] ?? false),
                'apiAccess' => (bool) ($flags['api_access'] ?? $flags['apiAccess'] ?? false),
                'prioritySupport' => (bool) ($flags['priority_support'] ?? $flags['prioritySupport'] ?? false),
            ],
            'isPopular' => $this->isPopular,
            'isRecommended' => $this->isRecommended,
            'isActive' => $this->isActive,
            'isSystem' => $this->isSystem,
            'createdAt' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'updatedAt' => $this->updatedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
