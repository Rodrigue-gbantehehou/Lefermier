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
            'flocks' => [
                'key' => 'flocks',
                'category' => 'Volailles & Lots',
                'categoryKey' => 'production',
                'label' => 'Lots & Volailles',
                'description' => 'Suivi des effectifs, mortalité et réformes.',
                'icon' => 'Bird',
                'permissions' => [Permission::FLOCK_VIEW, Permission::FLOCK_CREATE, Permission::FLOCK_MOVEMENT],
            ],
            'eggs' => [
                'key' => 'eggs',
                'category' => 'Volailles & Lots',
                'categoryKey' => 'production',
                'label' => 'Ramassage des œufs',
                'description' => 'Collecte quotidienne, calibrage et pontes.',
                'icon' => 'Egg',
                'permissions' => [Permission::EGG_VIEW, Permission::EGG_CREATE],
            ],
            'health' => [
                'key' => 'health',
                'category' => 'Santé & Soins',
                'categoryKey' => 'health',
                'label' => 'Soins & Vaccins',
                'description' => 'Vaccinations, ordonnances et rappels de soins.',
                'icon' => 'ShieldAlert',
                'permissions' => [Permission::HEALTH_VIEW, Permission::HEALTH_MANAGE],
            ],
            'inventory' => [
                'key' => 'inventory',
                'category' => 'Stocks & Aliments',
                'categoryKey' => 'inventory',
                'label' => 'Stocks & Aliments',
                'description' => 'Sacs d\'aliments, produits et alertes de stock bas.',
                'icon' => 'Package',
                'permissions' => [Permission::INVENTORY_VIEW, Permission::INVENTORY_CREATE, Permission::INVENTORY_MOVEMENT],
            ],
            'inventory_valuation' => [
                'key' => 'inventory_valuation',
                'category' => 'Stocks & Aliments',
                'categoryKey' => 'inventory',
                'label' => 'Valeur du stock',
                'description' => 'Estimation financière du stock en temps réel.',
                'icon' => 'Coins',
                'permissions' => [Permission::INVENTORY_VALUATION],
            ],
            'finance' => [
                'key' => 'finance',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Caisse & Ventes',
                'description' => 'Ventes d\'œufs et volailles, dépenses et caisse.',
                'icon' => 'Wallet',
                'permissions' => [Permission::FINANCE_VIEW, Permission::FINANCE_CREATE],
            ],
            'finance_margin' => [
                'key' => 'finance_margin',
                'category' => 'Finances & Caisse',
                'categoryKey' => 'finance',
                'label' => 'Marges & Bénéfices',
                'description' => 'Coût de revient et bénéfice par lot.',
                'icon' => 'TrendingUp',
                'permissions' => [Permission::FINANCE_MARGIN],
            ],
            'contacts' => [
                'key' => 'contacts',
                'category' => 'Clients & Fournisseurs',
                'categoryKey' => 'commercial',
                'label' => 'Clients & Fournisseurs',
                'description' => 'Contacts des acheteurs, provenderies et vétérinaires.',
                'icon' => 'Contact',
                'permissions' => [Permission::CONTACT_VIEW, Permission::CONTACT_CREATE],
            ],
            'buildings' => [
                'key' => 'buildings',
                'category' => 'Bâtiments & Fermes',
                'categoryKey' => 'infra',
                'label' => 'Bâtiments d\'élevage',
                'description' => 'Poulaillers, capacités et vides sanitaires.',
                'icon' => 'Warehouse',
                'permissions' => [Permission::BUILDING_MANAGE, Permission::FARM_VIEW, Permission::FARM_EDIT],
            ],
            'team' => [
                'key' => 'team',
                'category' => 'Équipe & Accès',
                'categoryKey' => 'team',
                'label' => 'Équipe & Accès',
                'description' => 'Comptes pour employés, gérants et comptables.',
                'icon' => 'Users',
                'permissions' => [Permission::MEMBER_MANAGE, Permission::ROLE_MANAGE],
            ],
            'dashboard_advanced' => [
                'key' => 'dashboard_advanced',
                'category' => 'Analyses & Alertes',
                'categoryKey' => 'analytics',
                'label' => 'Analyses & Alertes',
                'description' => 'Courbes de ponte et alertes de mortalité.',
                'icon' => 'BarChart3',
                'permissions' => [Permission::DASHBOARD_FINANCIALS],
            ],
            'api_iot' => [
                'key' => 'api_iot',
                'category' => 'API & Capteurs',
                'categoryKey' => 'integrations',
                'label' => 'API & Capteurs',
                'description' => 'Capteurs connectés et clés pour logiciels tiers.',
                'icon' => 'Cpu',
                'permissions' => [Permission::API_KEY_MANAGE],
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

