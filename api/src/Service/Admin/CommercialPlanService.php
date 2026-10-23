<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Entity\Farm;
use App\Entity\Organization;
use App\Entity\SubscriptionPlan;
use App\Enum\OrganizationStatus;
use App\Repository\FlockRepository;
use App\Repository\OrganizationRepository;
use App\Repository\SubscriptionPlanRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Uid\Ulid;

/**
 * Service de gouvernance des Formules Commerciales, Licences et Quotas de la plateforme Lefermier.
 *
 * Gère la persistance en base de données (table subscription_plans) et l'attribution des licences.
 * Modèle inspiré de Microsoft 365 Billing & Licensing / Azure Subscriptions.
 */
class CommercialPlanService
{
    public function __construct(
        private readonly OrganizationRepository $organizationRepository,
        private readonly FlockRepository $flockRepository,
        private readonly SubscriptionPlanRepository $planRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Catalogue des formules commerciales Lefermier (SKUs) stockées en base de données.
     * Initialise automatiquement les 4 plans système par défaut si la table est vide.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getPlans(): array
    {
        $entities = $this->planRepository->findBy([], ['priceMonthly' => 'ASC']);

        if (empty($entities)) {
            $this->seedDefaultPlans();
            $entities = $this->planRepository->findBy([], ['priceMonthly' => 'ASC']);
        } else {
            // S'assurer que les formules existantes ont leurs modules configurés
            $this->ensureModulesSeeded($entities);
        }

        // Compter les abonnés par SKU pour chaque formule
        $subscriberCounts = [];
        $orgCounts = $this->organizationRepository->createQueryBuilder('o')
            ->select('UPPER(o.subscriptionPlan) as sku, COUNT(o.id) as total')
            ->groupBy('o.subscriptionPlan')
            ->getQuery()
            ->getResult();

        foreach ($orgCounts as $row) {
            $subscriberCounts[(string) $row['sku']] = (int) $row['total'];
        }

        $plans = [];
        foreach ($entities as $entity) {
            $sku = $entity->getSku();
            $subscribers = $subscriberCounts[$sku] ?? 0;
            $plans[$sku] = $entity->toArray($subscribers);
        }

        return $plans;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getPlan(string $sku): ?array
    {
        $plans = $this->getPlans();
        return $plans[strtoupper(trim($sku))] ?? null;
    }

    public function findPlanEntity(string $idOrSku): ?SubscriptionPlan
    {
        if (Ulid::isValid($idOrSku)) {
            $plan = $this->planRepository->find(Ulid::fromString($idOrSku));
            if ($plan !== null) {
                return $plan;
            }
        }

        return $this->planRepository->findBySku($idOrSku);
    }

    /**
     * Vérifie si un module applicatif est inclus dans la formule de l'exploitation.
     */
    public function isModuleAllowedForFarm(Farm $farm, string $moduleKey): bool
    {
        $org = $farm->getOrganization();
        $planSku = strtoupper($org->getSubscriptionPlan());
        $plan = $this->getPlan($planSku) ?? $this->getPlan('STANDARD');
        if ($plan === null) {
            return true;
        }

        $modules = $plan['modules'] ?? [];
        return in_array($moduleKey, $modules, true);
    }

    /**
     * Vérifie si une permission spécifique est couverte par la formule de l'exploitation.
     */
    public function isPermissionAllowedForFarm(Farm $farm, string $permission): bool
    {
        $module = PlatformModuleRegistry::getModuleForPermission($permission);
        if ($module === null) {
            // Permission socle non restreinte par une offre
            return true;
        }

        return $this->isModuleAllowedForFarm($farm, $module);
    }

    /**
     * Crée une nouvelle formule commerciale dans la table subscription_plans.
     *
     * @param array<string, mixed> $data
     */
    public function createPlan(array $data): SubscriptionPlan
    {
        $sku = strtoupper(trim((string) ($data['sku'] ?? '')));
        if ($sku === '') {
            throw new \InvalidArgumentException('Le code SKU de la formule est obligatoire.');
        }

        if ($this->planRepository->findBySku($sku) !== null) {
            throw new \InvalidArgumentException(sprintf('Une formule avec le SKU "%s" existe déjà.', $sku));
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Le nom de la formule est obligatoire.');
        }

        $tier = trim((string) ($data['tier'] ?? 'Standard'));
        $priceMonthly = (int) ($data['priceMonthly'] ?? $data['price_monthly'] ?? 0);
        $priceAnnually = (int) ($data['priceAnnually'] ?? $data['price_annually'] ?? 0);
        $currency = strtoupper((string) ($data['currency'] ?? 'XOF'));

        $quotas = (array) ($data['quotas'] ?? []);
        $features = (array) ($data['features'] ?? []);
        $flags = (array) ($data['flags'] ?? []);
        $modules = (array) ($data['modules'] ?? []);

        $badge = isset($data['badge']) && trim((string) $data['badge']) !== '' ? trim((string) $data['badge']) : null;
        $description = isset($data['description']) && trim((string) $data['description']) !== '' ? trim((string) $data['description']) : null;
        $isPopular = (bool) ($data['isPopular'] ?? $data['is_popular'] ?? false);
        $isRecommended = (bool) ($data['isRecommended'] ?? $data['is_recommended'] ?? false);

        $status = (string) ($data['status'] ?? 'PUBLISHED');
        $availableFrom = isset($data['availableFrom']) && !empty($data['availableFrom']) ? new \DateTimeImmutable((string) $data['availableFrom']) : null;
        $availableTo = isset($data['availableTo']) && !empty($data['availableTo']) ? new \DateTimeImmutable((string) $data['availableTo']) : null;
        $isVisibilityPublic = (bool) ($data['isVisibilityPublic'] ?? true);
        $trialDays = (int) ($data['trialDays'] ?? 0);
        $allowedBillingCycles = (array) ($data['allowedBillingCycles'] ?? ['MONTHLY', 'ANNUALLY']);

        $plan = new SubscriptionPlan(
            sku: $sku,
            name: $name,
            tier: $tier,
            priceMonthly: $priceMonthly,
            priceAnnually: $priceAnnually,
            quotas: $quotas,
            features: $features,
            flags: $flags,
            badge: $badge,
            description: $description,
            isPopular: $isPopular,
            isRecommended: $isRecommended,
            isSystem: false,
            currency: $currency,
            status: $status,
            availableFrom: $availableFrom,
            availableTo: $availableTo,
            isVisibilityPublic: $isVisibilityPublic,
            trialDays: $trialDays,
            allowedBillingCycles: $allowedBillingCycles,
            modules: $modules,
            version: 1,
        );

        $this->entityManager->persist($plan);
        $this->entityManager->flush();

        return $plan;
    }

    /**
     * Modifie une formule commerciale existante sans casser les abonnements en cours.
     *
     * @param array<string, mixed> $data
     */
    public function updatePlan(SubscriptionPlan $plan, array $data): SubscriptionPlan
    {
        if (isset($data['name'])) {
            $name = trim((string) $data['name']);
            if ($name !== '') {
                $plan->setName($name);
            }
        }

        if (isset($data['tier'])) {
            $plan->setTier((string) $data['tier']);
        }

        if (isset($data['priceMonthly']) || isset($data['price_monthly'])) {
            $plan->setPriceMonthly((int) ($data['priceMonthly'] ?? $data['price_monthly']));
        }

        if (isset($data['priceAnnually']) || isset($data['price_annually'])) {
            $plan->setPriceAnnually((int) ($data['priceAnnually'] ?? $data['price_annually']));
        }

        if (isset($data['currency'])) {
            $plan->setCurrency((string) $data['currency']);
        }

        if (array_key_exists('badge', $data)) {
            $plan->setBadge($data['badge']);
        }

        if (array_key_exists('description', $data)) {
            $plan->setDescription($data['description']);
        }

        if (isset($data['quotas']) && is_array($data['quotas'])) {
            $plan->setQuotas(array_merge($plan->getQuotas(), $data['quotas']));
        }

        if (isset($data['features']) && is_array($data['features'])) {
            $plan->setFeatures($data['features']);
        }

        if (isset($data['flags']) && is_array($data['flags'])) {
            $plan->setFlags(array_merge($plan->getFlags(), $data['flags']));
        }

        if (isset($data['modules']) && is_array($data['modules'])) {
            $plan->setModules($data['modules']);
        }

        if (isset($data['status'])) {
            $plan->setStatus((string) $data['status']);
        }

        if (array_key_exists('availableFrom', $data)) {
            $plan->setAvailableFrom(!empty($data['availableFrom']) ? new \DateTimeImmutable((string) $data['availableFrom']) : null);
        }

        if (array_key_exists('availableTo', $data)) {
            $plan->setAvailableTo(!empty($data['availableTo']) ? new \DateTimeImmutable((string) $data['availableTo']) : null);
        }

        if (isset($data['isVisibilityPublic'])) {
            $plan->setIsVisibilityPublic((bool) $data['isVisibilityPublic']);
        }

        if (isset($data['trialDays'])) {
            $plan->setTrialDays((int) $data['trialDays']);
        }

        if (isset($data['allowedBillingCycles']) && is_array($data['allowedBillingCycles'])) {
            $plan->setAllowedBillingCycles($data['allowedBillingCycles']);
        }

        if (isset($data['isPopular'])) {
            $plan->setIsPopular((bool) $data['isPopular']);
        }

        if (isset($data['isRecommended'])) {
            $plan->setIsRecommended((bool) $data['isRecommended']);
        }

        if (isset($data['isActive'])) {
            $plan->setIsActive((bool) $data['isActive']);
        }

        // Incrémenter le numéro de version de l'offre
        $plan->incrementVersion();

        $this->entityManager->flush();

        return $plan;
    }

    /**
     * Duplique une offre existante en brouillon pour créer facilement une variante promotionnelle.
     */
    public function duplicatePlan(SubscriptionPlan $source): SubscriptionPlan
    {
        $baseSku = $source->getSku();
        $newSku = $baseSku . '_COPY';
        $i = 1;
        while ($this->planRepository->findBySku($newSku) !== null) {
            $i++;
            $newSku = $baseSku . '_V' . $i;
        }

        $duplicate = new SubscriptionPlan(
            sku: $newSku,
            name: $source->getName() . ' (Copie)',
            tier: $source->getTier(),
            priceMonthly: $source->getPriceMonthly(),
            priceAnnually: $source->getPriceAnnually(),
            quotas: $source->getQuotas(),
            features: $source->getFeatures(),
            flags: $source->getFlags(),
            badge: $source->getBadge() ? $source->getBadge() . ' (Copie)' : 'Nouveau',
            description: $source->getDescription(),
            isPopular: false,
            isRecommended: false,
            isSystem: false,
            currency: $source->getCurrency(),
            status: 'DRAFT', // Une duplication commence toujours en brouillon
            availableFrom: null,
            availableTo: null,
            isVisibilityPublic: $source->isVisibilityPublic(),
            trialDays: $source->getTrialDays(),
            allowedBillingCycles: $source->getAllowedBillingCycles(),
            modules: $source->getModules(),
            version: 1,
        );

        $this->entityManager->persist($duplicate);
        $this->entityManager->flush();

        return $duplicate;
    }

    /**
     * Supprime une formule commerciale (uniquement si non système et sans aucun abonné actif).
     */
    public function deletePlan(SubscriptionPlan $plan): void
    {
        if ($plan->isSystem()) {
            throw new \LogicException('Les formules système de référence (FREE, STANDARD, PRO, ENTERPRISE) ne peuvent pas être supprimées.');
        }

        $count = $this->organizationRepository->count(['subscriptionPlan' => $plan->getSku()]);
        if ($count > 0) {
            throw new \LogicException(sprintf(
                'Impossible de supprimer définitivement la formule "%s" car %d organisation(s) y sont actuellement abonnées. Pour protéger ces clients sans interrompre leur service, archivez l\'offre plutôt que de la supprimer.',
                $plan->getName(),
                $count
            ));
        }

        $this->entityManager->remove($plan);
        $this->entityManager->flush();
    }

    /**
     * Sérialise une souscription d'organisation avec ses métriques de consommation et quotas.
     *
     * @return array<string, mixed>
     */
    public function serializeSubscription(Organization $org): array
    {
        $planSku = strtoupper($org->getSubscriptionPlan());
        $plan = $this->getPlan($planSku) ?? $this->getPlan('STANDARD');

        $farms = $org->getFarms();
        $farmsCount = count($farms);

        $farmIds = array_map(fn (Farm $f) => $f->getId(), $farms->toArray());
        $flocksCount = 0;
        if (!empty($farmIds)) {
            $flocksCount = (int) $this->flockRepository->createQueryBuilder('fl')
                ->select('COUNT(fl.id)')
                ->where('fl.farm IN (:farms)')
                ->setParameter('farms', $farmIds)
                ->getQuery()
                ->getSingleScalarResult();
        }

        $membersSet = [];
        foreach ($farms as $farm) {
            foreach ($farm->getFarmMemberships() as $membership) {
                if ($membership->isActive() && $membership->getUser()) {
                    $userId = (string) $membership->getUser()->getId();
                    $membersSet[$userId] = true;
                }
            }
        }
        $membersCount = count($membersSet);

        $maxFarms = (int) ($plan['quotas']['maxFarms'] ?? 1);
        $maxFlocks = (int) ($plan['quotas']['maxFlocks'] ?? 2);
        $maxMembers = (int) ($plan['quotas']['maxMembers'] ?? 2);

        $farmsPercent = $maxFarms >= 9999 ? 0 : min(100, round(($farmsCount / $maxFarms) * 100));
        $flocksPercent = $maxFlocks >= 9999 ? 0 : min(100, round(($flocksCount / $maxFlocks) * 100));
        $membersPercent = $maxMembers >= 9999 ? 0 : min(100, round(($membersCount / $maxMembers) * 100));

        $isOverQuota = (
            ($maxFarms < 9999 && $farmsCount > $maxFarms) ||
            ($maxFlocks < 9999 && $flocksCount > $maxFlocks) ||
            ($maxMembers < 9999 && $membersCount > $maxMembers)
        );

        $status = $org->getStatus()->value;
        $monthlyPrice = (int) ($plan['priceMonthly'] ?? 0);

        $createdAt = $org->getCreatedAt();
        $now = new \DateTimeImmutable();
        $monthsDiff = ((int) $now->format('Y') - (int) $createdAt->format('Y')) * 12 + ((int) $now->format('m') - (int) $createdAt->format('m'));
        $nextRenewal = $createdAt->modify('+' . ($monthsDiff + 1) . ' months');

        return [
            'id' => (string) $org->getId(),
            'name' => $org->getName(),
            'slug' => $org->getSlug(),
            'status' => $status,
            'farms' => array_map(
                fn (Farm $f) => [
                    'id' => $f->getId()?->toBase32(),
                    'name' => $f->getName(),
                    'code' => $f->getCode(),
                ],
                $farms->toArray()
            ),
            'plan' => [
                'sku' => $plan['sku'],
                'name' => $plan['name'],
                'tier' => $plan['tier'],
                'priceMonthly' => $monthlyPrice,
                'priceAnnually' => (int) ($plan['priceAnnually'] ?? 0),
                'currency' => $plan['currency'] ?? 'XOF',
            ],
            'billingCycle' => 'MONTHLY',
            'monthlyAmount' => $status === OrganizationStatus::ACTIVE->value ? $monthlyPrice : 0,
            'renewalDate' => $nextRenewal->format(\DateTimeInterface::ATOM),
            'createdAt' => $createdAt->format(\DateTimeInterface::ATOM),
            'usage' => [
                'farms' => [
                    'current' => $farmsCount,
                    'max' => $maxFarms,
                    'percent' => $farmsPercent,
                    'isUnlimited' => $maxFarms >= 9999,
                ],
                'flocks' => [
                    'current' => $flocksCount,
                    'max' => $maxFlocks,
                    'percent' => $flocksPercent,
                    'isUnlimited' => $maxFlocks >= 9999,
                ],
                'members' => [
                    'current' => $membersCount,
                    'max' => $maxMembers,
                    'percent' => $membersPercent,
                    'isUnlimited' => $maxMembers >= 9999,
                ],
            ],
            'isOverQuota' => $isOverQuota,
        ];
    }

    /**
     * Indicateurs macro-financiers et métriques d'abonnements consolidées.
     *
     * @return array<string, mixed>
     */
    public function getFinancialOverview(): array
    {
        $orgs = $this->organizationRepository->findAll();
        $plans = $this->getPlans();

        $totalCount = count($orgs);
        $activeCount = 0;
        $trialCount = 0;
        $suspendedCount = 0;
        $paidCount = 0;
        $totalMrr = 0;

        $bySku = [];
        foreach ($plans as $sku => $plan) {
            $bySku[$sku] = ['count' => 0, 'mrr' => 0];
        }

        foreach ($orgs as $org) {
            $sku = strtoupper($org->getSubscriptionPlan());
            if (!isset($bySku[$sku])) {
                $sku = 'STANDARD';
            }

            $price = $plans[$sku]['priceMonthly'] ?? 0;
            $status = $org->getStatus();

            if ($status === OrganizationStatus::ACTIVE) {
                $activeCount++;
                if ($price > 0) {
                    $paidCount++;
                    $totalMrr += $price;
                    $bySku[$sku]['mrr'] += $price;
                }
            } elseif ($status === OrganizationStatus::TRIAL) {
                $trialCount++;
            } elseif ($status === OrganizationStatus::SUSPENDED) {
                $suspendedCount++;
            }

            $bySku[$sku]['count']++;
        }

        $conversionRate = $totalCount > 0 ? round(($paidCount / $totalCount) * 100, 1) : 0;
        $totalArr = $totalMrr * 12;

        return [
            'totalSubscriptions' => $totalCount,
            'activeSubscriptions' => $activeCount,
            'paidSubscriptions' => $paidCount,
            'trialSubscriptions' => $trialCount,
            'suspendedSubscriptions' => $suspendedCount,
            'conversionRate' => $conversionRate,
            'mrr' => [
                'amount' => $totalMrr,
                'currency' => 'XOF',
                'formatted' => number_format($totalMrr, 0, ',', ' ') . ' FCFA',
            ],
            'arr' => [
                'amount' => $totalArr,
                'currency' => 'XOF',
                'formatted' => number_format($totalArr, 0, ',', ' ') . ' FCFA',
            ],
            'bySku' => $bySku,
        ];
    }

    /**
     * Initialise les 4 plans système par défaut si la table subscription_plans est vide.
     */
    public function seedDefaultPlans(): void
    {
        $defaults = [
            [
                'sku' => 'FREE',
                'name' => 'Starter (Découverte)',
                'tier' => 'Découverte',
                'badge' => 'Gratuit',
                'description' => 'Pour les éleveurs individuels qui démarrent leur première exploitation avicole.',
                'priceMonthly' => 0,
                'priceAnnually' => 0,
                'quotas' => ['max_farms' => 1, 'max_flocks' => 2, 'max_members' => 2, 'max_buildings' => 2, 'retention_months' => 3],
                'features' => [
                    '1 exploitation avicole',
                    'Jusqu\'à 2 bandes simultanées',
                    '2 comptes collaborateurs',
                    'Saisie quotidienne ponte & mortalités',
                    'Calcul des alvéoles de 30 œufs',
                    'Support communautaire',
                ],
                'flags' => [
                    'accounting_exports' => false,
                    'health_alerts' => false,
                    'iot_sensors' => false,
                    'api_access' => false,
                    'priority_support' => false,
                ],
                'isPopular' => false,
                'isRecommended' => false,
                'trialDays' => 0,
                'allowedBillingCycles' => ['MONTHLY'],
                'modules' => ['flocks', 'eggs', 'inventory', 'health', 'finance', 'contacts', 'buildings'],
                'isVisibilityPublic' => true,
            ],
            [
                'sku' => 'STANDARD',
                'name' => 'Standard (Éleveur Pro)',
                'tier' => 'Professionnel',
                'badge' => 'Populaire',
                'description' => 'Pour les fermes structurées nécessitant un pilotage rigoureux des stocks et de la ponte.',
                'priceMonthly' => 15000,
                'priceAnnually' => 153000,
                'quotas' => ['max_farms' => 3, 'max_flocks' => 10, 'max_members' => 5, 'max_buildings' => 6, 'retention_months' => 12],
                'features' => [
                    'Jusqu\'à 3 exploitations avicoles',
                    'Jusqu\'à 10 bandes actives',
                    '5 comptes collaborateurs',
                    'Gestion des stocks d\'aliments et intrants',
                    'Calcul automatique du taux de ponte standardisé',
                    'Rapports de marge brute en FCFA',
                    'Alertes automatiques de mortalité',
                    'Support email sous 24h',
                ],
                'flags' => [
                    'accounting_exports' => false,
                    'health_alerts' => true,
                    'iot_sensors' => false,
                    'api_access' => false,
                    'priority_support' => false,
                ],
                'isPopular' => true,
                'isRecommended' => false,
                'trialDays' => 14,
                'allowedBillingCycles' => ['MONTHLY', 'ANNUALLY'],
                'modules' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced'],
                'isVisibilityPublic' => true,
            ],
            [
                'sku' => 'PRO',
                'name' => 'Professionnel (Coopérative)',
                'tier' => 'Multi-Sites',
                'badge' => 'Recommandé',
                'description' => 'Pour les coopératives, exploitations multi-sites et groupements d\'éleveurs.',
                'priceMonthly' => 35000,
                'priceAnnually' => 357000,
                'quotas' => ['max_farms' => 10, 'max_flocks' => 50, 'max_members' => 20, 'max_buildings' => 25, 'retention_months' => 36],
                'features' => [
                    'Jusqu\'à 10 exploitations avicoles',
                    'Jusqu\'à 50 bandes simultanées',
                    '20 comptes collaborateurs avec permissions fines',
                    'Exports comptables SYSCOHADA (Grand livre & Journaux)',
                    'Génération automatique des programmes prophylactiques',
                    'Comparatifs de performances inter-bâtiments',
                    'Support téléphonique & WhatsApp prioritaire',
                ],
                'flags' => [
                    'accounting_exports' => true,
                    'health_alerts' => true,
                    'iot_sensors' => false,
                    'api_access' => false,
                    'priority_support' => true,
                ],
                'isPopular' => false,
                'isRecommended' => true,
                'trialDays' => 14,
                'allowedBillingCycles' => ['MONTHLY', 'ANNUALLY'],
                'modules' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced'],
                'isVisibilityPublic' => true,
            ],
            [
                'sku' => 'ENTERPRISE',
                'name' => 'Entreprise & Réseau Industriel',
                'tier' => 'Grand Compte',
                'badge' => 'Sur-Mesure',
                'description' => 'Pour les intégrateurs avicoles industriels, accouveurs et fabricants d\'aliments.',
                'priceMonthly' => 85000,
                'priceAnnually' => 867000,
                'quotas' => ['max_farms' => 9999, 'max_flocks' => 9999, 'max_members' => 9999, 'max_buildings' => 9999, 'retention_months' => 120],
                'features' => [
                    'Nombre d\'exploitations illimité',
                    'Nombre de bandes et de bâtiments illimité',
                    'Nombre de collaborateurs illimité',
                    'Intégration capteurs connectés IoT (Température/Hygrométrie)',
                    'Accès API REST complète pour ERP tiers',
                    'Archivage légal et historique décennal',
                    'Accompagnement zootechnique dédié & SLA 99.9%',
                ],
                'flags' => [
                    'accounting_exports' => true,
                    'health_alerts' => true,
                    'iot_sensors' => true,
                    'api_access' => true,
                    'priority_support' => true,
                ],
                'isPopular' => false,
                'isRecommended' => false,
                'trialDays' => 30,
                'allowedBillingCycles' => ['MONTHLY', 'ANNUALLY'],
                'modules' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced', 'api_iot'],
                'isVisibilityPublic' => false,
            ],
        ];

        foreach ($defaults as $def) {
            $existing = $this->planRepository->findBySku($def['sku']);
            if ($existing === null) {
                $plan = new SubscriptionPlan(
                    sku: $def['sku'],
                    name: $def['name'],
                    tier: $def['tier'],
                    priceMonthly: $def['priceMonthly'],
                    priceAnnually: $def['priceAnnually'],
                    quotas: $def['quotas'],
                    features: $def['features'],
                    flags: $def['flags'],
                    badge: $def['badge'],
                    description: $def['description'],
                    isPopular: $def['isPopular'],
                    isRecommended: $def['isRecommended'],
                    isSystem: true,
                    currency: 'XOF',
                    status: 'PUBLISHED',
                    availableFrom: null,
                    availableTo: null,
                    isVisibilityPublic: $def['isVisibilityPublic'] ?? true,
                    trialDays: $def['trialDays'] ?? 0,
                    allowedBillingCycles: $def['allowedBillingCycles'] ?? ['MONTHLY', 'ANNUALLY'],
                    modules: $def['modules'] ?? [],
                    version: 1,
                );
                $this->entityManager->persist($plan);
            }
        }

        $this->entityManager->flush();
    }

    /**
     * Rétro-compatibilité : assure que les formules déjà en base reçoivent leurs modules par défaut.
     *
     * @param array<SubscriptionPlan> $entities
     */
    public function ensureModulesSeeded(array $entities): void
    {
        $needsFlush = false;

        $moduleMap = [
            'FREE' => ['flocks', 'eggs', 'inventory', 'health', 'finance', 'contacts', 'buildings'],
            'STANDARD' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced'],
            'PRO' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced'],
            'ENTERPRISE' => ['flocks', 'eggs', 'inventory', 'inventory_valuation', 'health', 'finance', 'finance_margin', 'contacts', 'buildings', 'team', 'dashboard_advanced', 'api_iot'],
        ];

        foreach ($entities as $plan) {
            $sku = $plan->getSku();
            if (empty($plan->getModules())) {
                $mods = $moduleMap[$sku] ?? ['flocks', 'eggs', 'inventory', 'health', 'finance', 'contacts', 'buildings'];
                $plan->setModules($mods);
                if ($plan->getAllowedBillingCycles() === []) {
                    $plan->setAllowedBillingCycles($sku === 'FREE' ? ['MONTHLY'] : ['MONTHLY', 'ANNUALLY']);
                }
                if ($plan->getTrialDays() === 0 && in_array($sku, ['STANDARD', 'PRO'], true)) {
                    $plan->setTrialDays(14);
                }
                $needsFlush = true;
            }

            if ($plan->getStatus() === '' || $plan->getStatus() === null) {
                $plan->setStatus('PUBLISHED');
                $needsFlush = true;
            }
        }

        if ($needsFlush) {
            $this->entityManager->flush();
        }
    }
}
