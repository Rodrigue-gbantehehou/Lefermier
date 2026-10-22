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
        }

        $plans = [];
        foreach ($entities as $entity) {
            $plans[$entity->getSku()] = $entity->toArray();
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
     * Crée une nouvelle formule commerciale personnalisée dans la table subscription_plans.
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

        $tier = trim((string) ($data['tier'] ?? 'Personnalisé'));
        $priceMonthly = (int) ($data['priceMonthly'] ?? $data['price_monthly'] ?? 0);
        $priceAnnually = (int) ($data['priceAnnually'] ?? $data['price_annually'] ?? 0);
        $currency = strtoupper((string) ($data['currency'] ?? 'XOF'));

        $quotas = (array) ($data['quotas'] ?? []);
        $features = (array) ($data['features'] ?? []);
        $flags = (array) ($data['flags'] ?? []);

        $badge = isset($data['badge']) && trim((string) $data['badge']) !== '' ? trim((string) $data['badge']) : null;
        $description = isset($data['description']) && trim((string) $data['description']) !== '' ? trim((string) $data['description']) : null;
        $isPopular = (bool) ($data['isPopular'] ?? $data['is_popular'] ?? false);
        $isRecommended = (bool) ($data['isRecommended'] ?? $data['is_recommended'] ?? false);

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
        );

        $this->entityManager->persist($plan);
        $this->entityManager->flush();

        return $plan;
    }

    /**
     * Modifie une formule commerciale existante.
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

        if (isset($data['isPopular'])) {
            $plan->setIsPopular((bool) $data['isPopular']);
        }

        if (isset($data['isRecommended'])) {
            $plan->setIsRecommended((bool) $data['isRecommended']);
        }

        if (isset($data['isActive'])) {
            $plan->setIsActive((bool) $data['isActive']);
        }

        $this->entityManager->flush();

        return $plan;
    }

    /**
     * Supprime une formule commerciale (uniquement si non système et non utilisée par des organisations actives).
     */
    public function deletePlan(SubscriptionPlan $plan): void
    {
        if ($plan->isSystem()) {
            throw new \LogicException('Les formules de base du système (FREE, STANDARD, PRO, ENTERPRISE) ne peuvent pas être supprimées.');
        }

        $count = $this->organizationRepository->count(['subscriptionPlan' => $plan->getSku()]);
        if ($count > 0) {
            throw new \LogicException(sprintf('Impossible de supprimer la formule "%s" car elle est actuellement souscrite par %d organisation(s). Veuillez d\'abord modifier ces abonnements.', $plan->getName(), $count));
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
                'quotas' => ['max_farms' => 1, 'max_flocks' => 2, 'max_members' => 2, 'retention_months' => 3],
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
            ],
            [
                'sku' => 'STANDARD',
                'name' => 'Standard (Éleveur Pro)',
                'tier' => 'Professionnel',
                'badge' => 'Populaire',
                'description' => 'Pour les fermes structurées nécessitant un pilotage rigoureux des stocks et de la ponte.',
                'priceMonthly' => 15000,
                'priceAnnually' => 153000,
                'quotas' => ['max_farms' => 3, 'max_flocks' => 10, 'max_members' => 5, 'retention_months' => 12],
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
            ],
            [
                'sku' => 'PRO',
                'name' => 'Professionnel (Coopérative)',
                'tier' => 'Multi-Sites',
                'badge' => 'Recommandé',
                'description' => 'Pour les coopératives, exploitations multi-sites et groupements d\'éleveurs.',
                'priceMonthly' => 35000,
                'priceAnnually' => 357000,
                'quotas' => ['max_farms' => 10, 'max_flocks' => 50, 'max_members' => 20, 'retention_months' => 36],
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
            ],
            [
                'sku' => 'ENTERPRISE',
                'name' => 'Entreprise & Réseau Industriel',
                'tier' => 'Grand Compte',
                'badge' => 'Sur-Mesure',
                'description' => 'Pour les intégrateurs avicoles industriels, accouveurs et fabricants d\'aliments.',
                'priceMonthly' => 85000,
                'priceAnnually' => 867000,
                'quotas' => ['max_farms' => 9999, 'max_flocks' => 9999, 'max_members' => 9999, 'retention_months' => 120],
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
                );
                $this->entityManager->persist($plan);
            }
        }

        $this->entityManager->flush();
    }
}
