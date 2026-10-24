<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Security\Permission;

/**
 * Référentiel officiel des modules applicatifs réels du backend Lefermier.
 *
 * Tous les modules déclarés ici correspondent à des fonctionnalités et entités existantes du projet.
 * Utilisé pour la configuration granulaire des formules commerciales dans le back-office admin/.
 */
final class PlatformModuleRegistry
{
    /**
     * @return array<string, array{
     *     key: string,
     *     category: string,
     *     categoryKey: string,
     *     label: string,
     *     description: string,
     *     icon: string,
     *     permissions: array<string>
     * }>
     */
    public static function all(): array
    {
        return [
            // Catégorie 1 : Volailles & Lots (production)
            'flocks' => [
                'key' => 'flocks',
                'category' => 'Volailles & Lots',
                'categoryKey' => 'production',
                'label' => 'Lots & Volailles',
                'description' => 'Suivi des effectifs, mortalité, réformes et pesées.',
                'icon' => 'Bird',
                'permissions' => [Permission::FLOCK_VIEW, Permission::FLOCK_CREATE, Permission::FLOCK_MOVEMENT],
            ],
            'eggs' => [
                'key' => 'eggs',
                'category' => 'Volailles & Lots',
                'categoryKey' => 'production',
                'label' => 'Ramassage des œufs',
                'description' => 'Collecte quotidienne, calibrage, alvéoles de 30 et taux de ponte.',
                'icon' => 'Egg',
                'permissions' => [Permission::EGG_VIEW, Permission::EGG_CREATE],
            ],

            // Catégorie 2 : Santé & Soins (health)
            'health' => [
                'key' => 'health',
                'category' => 'Santé & Soins',
                'categoryKey' => 'health',
                'label' => 'Soins & Vaccins',
                'description' => 'Vaccinations, ordonnances et registre des soins vétérinaires.',
                'icon' => 'ShieldAlert',
                'permissions' => [Permission::HEALTH_VIEW, Permission::HEALTH_MANAGE],
            ],
            'prophylaxis_program' => [
                'key' => 'prophylaxis_program',
                'category' => 'Santé & Soins',
                'categoryKey' => 'health',
                'label' => 'Programmes Vaccinaux 1-Clic',
                'description' => 'Génération automatique du calendrier prophylactique selon la souche (Cobb 500 / Isa Brown).',
                'icon' => 'Zap',
                'permissions' => [Permission::HEALTH_MANAGE],
            ],
            'health_alerts' => [
                'key' => 'health_alerts',
                'category' => 'Santé & Soins',
                'categoryKey' => 'health',
                'label' => 'Alertes Automatiques de Mortalité',
                'description' => 'Notification temps réel dès que la mortalité d\'un lot dépasse le seuil critique.',
                'icon' => 'HeartPulse',
                'permissions' => [Permission::HEALTH_VIEW],
            ],

            // Catégorie 3 : Stocks & Aliments (inventory)
            'inventory' => [
                'key' => 'inventory',
                'category' => 'Stocks & Aliments',
                'categoryKey' => 'inventory',
                'label' => 'Stocks & Aliments',
                'description' => 'Sacs d\'aliments, produits vétérinaires et alertes de stock bas.',
                'icon' => 'Package',
                'permissions' => [Permission::INVENTORY_VIEW, Permission::INVENTORY_CREATE, Permission::INVENTORY_MOVEMENT],
            ],
            'inventory_valuation' => [
                'key' => 'inventory_valuation',
                'category' => 'Stocks & Aliments',
                'categoryKey' => 'inventory',
                'label' => 'Valeur du stock',
                'description' => 'Estimation financière de la valeur totale du magasin en FCFA.',
                'icon' => 'Coins',
                'permissions' => [Permission::INVENTORY_VALUATION],
            ],
            'feed_rationing' => [
                'key' => 'feed_rationing',
                'category' => 'Stocks & Aliments',
                'categoryKey' => 'inventory',
                'label' => 'Rationnement & Indice de Consommation',
                'description' => 'Consommation journalière par sujet et calcul de l\'indice de conversion (IC / FCR).',
                'icon' => 'Scale',
                'permissions' => [Permission::INVENTORY_VIEW, Permission::INVENTORY_MOVEMENT],
            ],

            // Catégorie 4 : Finances & Caisse (finance)
            'finance' => [
                'key' => 'finance',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Caisse & Ventes',
                'description' => 'Ventes d\'œufs et volailles, dépenses et caisse en FCFA (MoMo MTN, Moov, Celtiis, Cash).',
                'icon' => 'Wallet',
                'permissions' => [Permission::FINANCE_VIEW, Permission::FINANCE_CREATE],
            ],
            'finance_margin' => [
                'key' => 'finance_margin',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Marges & Bénéfices',
                'description' => 'Coût de revient et calcul de la marge nette bénéficiaire par lot.',
                'icon' => 'TrendingUp',
                'permissions' => [Permission::FINANCE_MARGIN],
            ],
            'credit_debt' => [
                'key' => 'credit_debt',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Créances & Dettes',
                'description' => 'Suivi des impayés revendeuses du marché et des dettes de provenderie.',
                'icon' => 'Clock',
                'permissions' => [Permission::FINANCE_VIEW],
            ],
            'sales_receipts' => [
                'key' => 'sales_receipts',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Reçus & Factures Imprimables',
                'description' => 'Édition de reçus de vente et factures prêts à imprimer avec IFU et en-tête d\'exploitation.',
                'icon' => 'Receipt',
                'permissions' => [Permission::FINANCE_VIEW, Permission::FINANCE_CREATE],
            ],
            'reports_accounting' => [
                'key' => 'reports_accounting',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Exports Comptables & SYSCOHADA',
                'description' => 'Grand livre, journaux d\'achats et ventes conformes au plan comptable SYSCOHADA (CSV/PDF).',
                'icon' => 'FileSpreadsheet',
                'permissions' => [Permission::FINANCE_VIEW],
            ],

            // Catégorie 5 : Clients & Fournisseurs (commercial)
            'contacts' => [
                'key' => 'contacts',
                'category' => 'Clients & Fournisseurs',
                'categoryKey' => 'commercial',
                'label' => 'Clients & Fournisseurs',
                'description' => 'Carnet d\'adresses des acheteurs, revendeuses du marché, provenderies et vétérinaires avec IFU.',
                'icon' => 'Contact',
                'permissions' => [Permission::CONTACT_VIEW, Permission::CONTACT_CREATE],
            ],

            // Catégorie 6 : Bâtiments & Fermes (infra)
            'buildings' => [
                'key' => 'buildings',
                'category' => 'Bâtiments & Fermes',
                'categoryKey' => 'infra',
                'label' => 'Bâtiments d\'élevage',
                'description' => 'Poulaillers, poussinières, capacités d\'accueil et suivi des vides sanitaires.',
                'icon' => 'Warehouse',
                'permissions' => [Permission::BUILDING_MANAGE, Permission::FARM_VIEW, Permission::FARM_EDIT],
            ],
            'performance_benchmark' => [
                'key' => 'performance_benchmark',
                'category' => 'Bâtiments & Fermes',
                'categoryKey' => 'infra',
                'label' => 'Comparatifs Inter-Bâtiments',
                'description' => 'Comparaison des taux de ponte et rendements entre poulaillers pour optimiser les densités.',
                'icon' => 'Layers',
                'permissions' => [Permission::DASHBOARD_FINANCIALS, Permission::DASHBOARD_VIEW],
            ],

            // Catégorie 7 : Équipe & Accès (team)
            'team' => [
                'key' => 'team',
                'category' => 'Équipe & Accès',
                'categoryKey' => 'team',
                'label' => 'Équipe & Collaborateurs',
                'description' => 'Comptes pour employés, gérants et comptables avec attribution de rôles.',
                'icon' => 'Users',
                'permissions' => [Permission::MEMBER_MANAGE],
            ],
            'custom_roles' => [
                'key' => 'custom_roles',
                'category' => 'Équipe & Accès',
                'categoryKey' => 'team',
                'label' => 'Rôles Sur-Mesure & RBAC Avancé',
                'description' => 'Création de rôles personnalisés avec matrice granulaire de 22 permissions système.',
                'icon' => 'ShieldCheck',
                'permissions' => [Permission::ROLE_MANAGE],
            ],

            // Catégorie 8 : Analyses & Alertes (analytics)
            'dashboard_advanced' => [
                'key' => 'dashboard_advanced',
                'category' => 'Analyses & Alertes',
                'categoryKey' => 'analytics',
                'label' => 'Analyses & Alertes Avancées',
                'description' => 'Courbes de ponte hebdomadaires, projections de vente et indicateurs consolidés.',
                'icon' => 'BarChart3',
                'permissions' => [Permission::DASHBOARD_FINANCIALS],
            ],

            // Catégorie 9 : API & Capteurs (integrations)
            'api_iot' => [
                'key' => 'api_iot',
                'category' => 'API & Capteurs',
                'categoryKey' => 'integrations',
                'label' => 'API & Capteurs Connectés',
                'description' => 'Sondes de température/humidité IoT et clés API développeur pour logiciels tiers.',
                'icon' => 'Cpu',
                'permissions' => [Permission::API_KEY_MANAGE],
            ],

            // Catégorie 10 : Assistance & Services (services)
            'priority_support' => [
                'key' => 'priority_support',
                'category' => 'Assistance & Services',
                'categoryKey' => 'services',
                'label' => 'Support Prioritaire WhatsApp & Téléphone',
                'description' => 'Assistance zootechnique dédiée, ligne directe WhatsApp et intervention technique prioritaire.',
                'icon' => 'Headphones',
                'permissions' => [Permission::FARM_VIEW],
            ],
        ];
    }

    /**
     * Regroupe les modules par catégorie pour l'affichage avec cases à cocher.
     *
     * @return array<string, array{category: string, modules: array<string, mixed>}>
     */
    public static function getGroupedByCategory(): array
    {
        $all = self::all();
        $grouped = [];

        foreach ($all as $key => $module) {
            $catKey = $module['categoryKey'];
            if (!isset($grouped[$catKey])) {
                $grouped[$catKey] = [
                    'key' => $catKey,
                    'category' => $module['category'],
                    'modules' => [],
                ];
            }
            $grouped[$catKey]['modules'][] = $module;
        }

        return array_values($grouped);
    }

    /**
     * Retourne la clé de module correspondant à une permission.
     */
    public static function getModuleForPermission(string $permission): ?string
    {
        $normalized = $permission;
        if (str_ends_with($permission, ':read')) {
            $normalized = str_replace(':read', ':view', $permission);
        }

        $primaryMap = [
            Permission::FLOCK_VIEW => 'flocks',
            Permission::FLOCK_CREATE => 'flocks',
            Permission::FLOCK_MOVEMENT => 'flocks',
            Permission::EGG_VIEW => 'eggs',
            Permission::EGG_CREATE => 'eggs',
            Permission::HEALTH_VIEW => 'health',
            Permission::HEALTH_MANAGE => 'health',
            Permission::INVENTORY_VIEW => 'inventory',
            Permission::INVENTORY_CREATE => 'inventory',
            Permission::INVENTORY_MOVEMENT => 'inventory',
            Permission::INVENTORY_VALUATION => 'inventory_valuation',
            Permission::FINANCE_VIEW => 'finance',
            Permission::FINANCE_CREATE => 'finance',
            Permission::FINANCE_MARGIN => 'finance_margin',
            Permission::CONTACT_VIEW => 'contacts',
            Permission::CONTACT_CREATE => 'contacts',
            Permission::BUILDING_MANAGE => 'buildings',
            Permission::FARM_VIEW => 'buildings',
            Permission::FARM_EDIT => 'buildings',
            Permission::MEMBER_MANAGE => 'team',
            Permission::ROLE_MANAGE => 'custom_roles',
            Permission::DASHBOARD_VIEW => 'flocks',
            Permission::DASHBOARD_FINANCIALS => 'dashboard_advanced',
            Permission::API_KEY_MANAGE => 'api_iot',
        ];

        if (isset($primaryMap[$normalized])) {
            return $primaryMap[$normalized];
        }

        foreach (self::all() as $moduleKey => $info) {
            if (in_array($normalized, $info['permissions'], true) || in_array($permission, $info['permissions'], true)) {
                return $moduleKey;
            }
        }

        return null;
    }

    /**
     * Retourne l'ensemble des permissions autorisées par une liste de modules.
     *
     * @param array<string> $moduleKeys
     * @return array<string>
     */
    public static function getPermissionsForModules(array $moduleKeys): array
    {
        $all = self::all();
        $permissions = [
            Permission::DASHBOARD_VIEW,
            Permission::FARM_VIEW,
        ];

        foreach ($moduleKeys as $key) {
            if (isset($all[$key])) {
                foreach ($all[$key]['permissions'] as $p) {
                    $permissions[] = $p;
                }
            }
        }

        return array_values(array_unique($permissions));
    }
}

