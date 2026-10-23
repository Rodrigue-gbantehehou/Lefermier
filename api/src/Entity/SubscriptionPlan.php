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
 * Modèle distinguant :
 * 1. La validité de l'offre (disponibilité à la souscription, dates début/fin, statut de publication).
 * 2. La durée et le cycle d'abonnement du client (mensuel/annuel, période d'essai).
 * 3. Les modules applicatifs réels activés par catégorie et les quotas de ressources physiques.
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
     * Statut de publication de l'offre :
     * - DRAFT : Brouillon en cours de conception (non visible, non souscriptible)
     * - PUBLISHED : Offre active et publiée
     * - ARCHIVED : Offre retirée du catalogue mais préservée pour les abonnés existants (Grandfathering)
     */
    #[ORM\Column(type: Types::STRING, length: 20)]
    private ?string $status = 'PUBLISHED';

    /**
     * Date de début de validité / disponibilité de l'offre commerciale (null = immédiat).
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $availableFrom = null;

    /**
     * Date de fin de validité / expiration de l'offre commerciale (null = permanente).
     * Différent de la date de renouvellement de l'abonnement du client.
     */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $availableTo = null;

    /**
     * Visibilité :
     * - true : Offre publique (affichée au catalogue / page tarifaire)
     * - false : Offre privée / personnalisée / sur devis (accessible uniquement par assignation directe)
     */
    #[ORM\Column(type: Types::BOOLEAN)]
    private ?bool $isVisibilityPublic = true;

    /**
     * Durée de l'essai gratuit en jours accordée aux nouveaux souscripteurs (0 = sans essai).
     */
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $trialDays = 0;

    /**
     * Périodes de facturation autorisées pour les clients : ['MONTHLY', 'ANNUALLY'], ['MONTHLY'], ['ANNUALLY'].
     *
     * @var array<string>|null
     */
    #[ORM\Column(type: Types::JSON)]
    private ?array $allowedBillingCycles = ['MONTHLY', 'ANNUALLY'];

    /**
     * Modules fonctionnels réels du backend activés dans cette formule.
     * Ex: ['flocks', 'eggs', 'health', 'inventory', 'finance', 'contacts', 'buildings', 'team', 'api_iot']
     *
     * @var array<string>|null
     */
    #[ORM\Column(type: Types::JSON)]
    private ?array $modules = [];

    /**
     * Quotas et plafonds stricts :
     * max_farms, max_flocks, max_members, max_buildings, retention_months (9999 = illimité)
     *
     * @var array<string, int>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $quotas = [];

    /**
     * Points clés commerciaux textuels affichés sur la fiche d'offre.
     *
     * @var array<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $features = [];

    /**
     * Drapeaux de fonctionnalités avancées (rétrocompatibilité).
     *
     * @var array<string, bool>
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

    #[ORM\Column(type: Types::INTEGER)]
    private ?int $version = 1;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @param array<string, int> $quotas
     * @param array<string> $features
     * @param array<string, bool> $flags
     * @param array<string> $modules
     * @param array<string> $allowedBillingCycles
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
        string $status = 'PUBLISHED',
        ?\DateTimeImmutable $availableFrom = null,
        ?\DateTimeImmutable $availableTo = null,
        bool $isVisibilityPublic = true,
        int $trialDays = 0,
        array $allowedBillingCycles = ['MONTHLY', 'ANNUALLY'],
        array $modules = [],
        int $version = 1,
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
            'max_buildings' => 2,
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
        $this->status = in_array($status, ['DRAFT', 'PUBLISHED', 'ARCHIVED'], true) ? $status : 'PUBLISHED';
        $this->availableFrom = $availableFrom;
        $this->availableTo = $availableTo;
        $this->isVisibilityPublic = $isVisibilityPublic;
        $this->trialDays = max(0, $trialDays);
        $this->allowedBillingCycles = !empty($allowedBillingCycles) ? array_values($allowedBillingCycles) : ['MONTHLY', 'ANNUALLY'];
        $this->modules = array_values($modules);
        $this->version = max(1, $version);
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

    public function getStatus(): string
    {
        return $this->status ?? 'PUBLISHED';
    }

    public function setStatus(string $status): self
    {
        if (in_array($status, ['DRAFT', 'PUBLISHED', 'ARCHIVED'], true)) {
            $this->status = $status;
        }
        return $this;
    }

    public function getAvailableFrom(): ?\DateTimeImmutable
    {
        return $this->availableFrom;
    }

    public function setAvailableFrom(?\DateTimeImmutable $availableFrom): self
    {
        $this->availableFrom = $availableFrom;
        return $this;
    }

    public function getAvailableTo(): ?\DateTimeImmutable
    {
        return $this->availableTo;
    }

    public function setAvailableTo(?\DateTimeImmutable $availableTo): self
    {
        $this->availableTo = $availableTo;
        return $this;
    }

    public function isVisibilityPublic(): bool
    {
        return $this->isVisibilityPublic ?? true;
    }

    public function setIsVisibilityPublic(bool $isVisibilityPublic): self
    {
        $this->isVisibilityPublic = $isVisibilityPublic;
        return $this;
    }

    public function getTrialDays(): int
    {
        return $this->trialDays ?? 0;
    }

    public function setTrialDays(int $trialDays): self
    {
        $this->trialDays = max(0, $trialDays);
        return $this;
    }

    /**
     * @return array<string>
     */
    public function getAllowedBillingCycles(): array
    {
        return !empty($this->allowedBillingCycles) ? $this->allowedBillingCycles : ['MONTHLY', 'ANNUALLY'];
    }

    /**
     * @param array<string> $allowedBillingCycles
     */
    public function setAllowedBillingCycles(array $allowedBillingCycles): self
    {
        $valid = array_values(array_intersect(['MONTHLY', 'ANNUALLY'], $allowedBillingCycles));
        $this->allowedBillingCycles = !empty($valid) ? $valid : ['MONTHLY', 'ANNUALLY'];
        return $this;
    }

    /**
     * @return array<string>
     */
    public function getModules(): array
    {
        return $this->modules ?? [];
    }

    /**
     * @param array<string> $modules
     */
    public function setModules(array $modules): self
    {
        $this->modules = array_values(array_unique(array_filter($modules, fn ($m) => is_string($m) && trim($m) !== '')));
        return $this;
    }

    public function hasModule(string $moduleKey): bool
    {
        return in_array($moduleKey, $this->modules ?? [], true);
    }

    /**
     * Vérifie si l'offre commerciale est actuellement ouverte à la souscription.
     */
    public function isAvailableForSubscription(?\DateTimeImmutable $atDate = null): bool
    {
        if ($this->status !== 'PUBLISHED' || !$this->isActive) {
            return false;
        }

        $now = $atDate ?? new \DateTimeImmutable();
        if ($this->availableFrom !== null && $now < $this->availableFrom) {
            return false;
        }

        if ($this->availableTo !== null && $now > $this->availableTo) {
            return false;
        }

        return true;
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

    public function getVersion(): int
    {
        return $this->version ?? 1;
    }

    public function incrementVersion(): self
    {
        $this->version++;
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
     * @param int $subscribersCount Nombre d'organisations clientes actuellement abonnées à ce SKU
     * @return array<string, mixed>
     */
    public function toArray(int $subscribersCount = 0): array
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
            'status' => $this->getStatus(),
            'availableFrom' => $this->availableFrom?->format(\DateTimeInterface::ATOM),
            'availableTo' => $this->availableTo?->format(\DateTimeInterface::ATOM),
            'isAvailable' => $this->isAvailableForSubscription(),
            'isVisibilityPublic' => $this->isVisibilityPublic(),
            'trialDays' => $this->getTrialDays(),
            'allowedBillingCycles' => $this->getAllowedBillingCycles(),
            'modules' => $this->getModules(),
            'quotas' => [
                'maxFarms' => (int) ($quotas['max_farms'] ?? $quotas['maxFarms'] ?? 1),
                'maxFlocks' => (int) ($quotas['max_flocks'] ?? $quotas['maxFlocks'] ?? 2),
                'maxMembers' => (int) ($quotas['max_members'] ?? $quotas['maxMembers'] ?? 2),
                'maxBuildings' => (int) ($quotas['max_buildings'] ?? $quotas['maxBuildings'] ?? 2),
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
            'version' => $this->getVersion(),
            'subscribersCount' => $subscribersCount,
            'createdAt' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'updatedAt' => $this->updatedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
