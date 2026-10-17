<?php

declare(strict_types=1);

namespace App\Security;

final class Permission
{
    // Exploitations & Bâtiments
    public const FARM_VIEW = 'farm:view';
    public const FARM_EDIT = 'farm:edit';
    public const FARM_DELETE = 'farm:delete';
    public const BUILDING_MANAGE = 'building:manage';

    // Collaborateurs & Rôles
    public const ROLE_MANAGE = 'role:manage';
    public const MEMBER_MANAGE = 'member:manage';

    // Bandes & Volailles
    public const FLOCK_VIEW = 'flock:view';
    public const FLOCK_CREATE = 'flock:create';
    public const FLOCK_MOVEMENT = 'flock:movement';

    // Alimentation & Stocks
    public const INVENTORY_VIEW = 'inventory:view';
    public const INVENTORY_CREATE = 'inventory:create';
    public const INVENTORY_MOVEMENT = 'inventory:movement';
    public const INVENTORY_VALUATION = 'inventory:valuation';

    // Production d'œufs
    public const EGG_VIEW = 'egg:view';
    public const EGG_CREATE = 'egg:create';

    // Finances & Ventes
    public const FINANCE_VIEW = 'finance:view';
    public const FINANCE_CREATE = 'finance:create';
    public const FINANCE_MARGIN = 'finance:margin';

    // Contacts & Tiers
    public const CONTACT_VIEW = 'contact:view';
    public const CONTACT_CREATE = 'contact:create';

    // Tableau de bord
    public const DASHBOARD_VIEW = 'dashboard:view';
    public const DASHBOARD_FINANCIALS = 'dashboard:financials';

    // Clés API & Intégrations
    public const API_KEY_MANAGE = 'api_key:manage';

    /**
     * Matrice complète de toutes les permissions système avec catégorisation pour l'interface utilisateur.
     *
     * @return array<string, array{module: string, label: string, description: string}>
     */
    public static function all(): array
    {
        return [
            self::FARM_VIEW => [
                'module' => 'Exploitation',
                'label' => 'Consulter l\'exploitation',
                'description' => 'Accéder aux informations générales de la ferme',
            ],
            self::FARM_EDIT => [
                'module' => 'Exploitation',
                'label' => 'Modifier l\'exploitation',
                'description' => 'Mettre à jour le nom, la localisation et la capacité',
            ],
            self::BUILDING_MANAGE => [
                'module' => 'Bâtiments',
                'label' => 'Gérer les bâtiments',
                'description' => 'Créer et configurer les poulaillers et magasins',
            ],
            self::ROLE_MANAGE => [
                'module' => 'Administration',
                'label' => 'Gérer la matrice des rôles',
                'description' => 'Créer et modifier les rôles et permissions de l\'agence',
            ],
            self::MEMBER_MANAGE => [
                'module' => 'Administration',
                'label' => 'Gérer les collaborateurs',
                'description' => 'Inviter des membres et leur assigner des rôles',
            ],
            self::FLOCK_VIEW => [
                'module' => 'Bandes & Effectifs',
                'label' => 'Consulter les bandes',
                'description' => 'Voir les effectifs vifs et taux de mortalité',
            ],
            self::FLOCK_CREATE => [
                'module' => 'Bandes & Effectifs',
                'label' => 'Créer une bande',
                'description' => 'Enregistrer un nouveau lot de volailles',
            ],
            self::FLOCK_MOVEMENT => [
                'module' => 'Bandes & Effectifs',
                'label' => 'Enregistrer un mouvement',
                'description' => 'Saisir mortalités, réformes et ventes de volailles',
            ],
            self::INVENTORY_VIEW => [
                'module' => 'Alimentation & Stocks',
                'label' => 'Consulter les stocks',
                'description' => 'Visualiser les niveaux de stock d\'aliments et intrants',
            ],
            self::INVENTORY_CREATE => [
                'module' => 'Alimentation & Stocks',
                'label' => 'Créer un article',
                'description' => 'Ajouter un aliment, médicament ou équipement',
            ],
            self::INVENTORY_MOVEMENT => [
                'module' => 'Alimentation & Stocks',
                'label' => 'Mouvements de stock',
                'description' => 'Enregistrer entrées, consommations et pertes',
            ],
            self::INVENTORY_VALUATION => [
                'module' => 'Alimentation & Stocks',
                'label' => 'Valorisation des stocks',
                'description' => 'Consulter la valeur totale du magasin en FCFA',
            ],
            self::EGG_VIEW => [
                'module' => 'Production d\'œufs',
                'label' => 'Consulter la ponte',
                'description' => 'Accéder à l\'historique des collectes et taux de ponte',
            ],
            self::EGG_CREATE => [
                'module' => 'Production d\'œufs',
                'label' => 'Saisir une collecte',
                'description' => 'Enregistrer les œufs ramassés par session',
            ],
            self::FINANCE_VIEW => [
                'module' => 'Finances & Ventes',
                'label' => 'Consulter les finances',
                'description' => 'Voir le livre des recettes, dépenses et trésorerie',
            ],
            self::FINANCE_CREATE => [
                'module' => 'Finances & Ventes',
                'label' => 'Enregistrer une opération',
                'description' => 'Saisir des ventes (œufs/volailles) et dépenses',
            ],
            self::FINANCE_MARGIN => [
                'module' => 'Finances & Ventes',
                'label' => 'Consulter la marge nette',
                'description' => 'Calcul de rentabilité économique par lot',
            ],
            self::CONTACT_VIEW => [
                'module' => 'Tiers & Contacts',
                'label' => 'Consulter les contacts',
                'description' => 'Voir les clients, fournisseurs et vétérinaires',
            ],
            self::CONTACT_CREATE => [
                'module' => 'Tiers & Contacts',
                'label' => 'Créer un contact',
                'description' => 'Ajouter un client ou fournisseur avec son IFU',
            ],
            self::DASHBOARD_VIEW => [
                'module' => 'Tableau de Bord',
                'label' => 'Accès au tableau de bord',
                'description' => 'Visualiser les KPI zootechniques consolidés',
            ],
            self::DASHBOARD_FINANCIALS => [
                'module' => 'Tableau de Bord',
                'label' => 'Voir les KPI financiers',
                'description' => 'Afficher la trésorerie et bénéfices sur le dashboard',
            ],
            self::API_KEY_MANAGE => [
                'module' => 'Intégrations & IoT',
                'label' => 'Gérer les clés API',
                'description' => 'Générer et révoquer les clés de capteurs ou machines',
            ],
        ];
    }

    public static function isValid(string $permission): bool
    {
        return $permission === '*' || array_key_exists($permission, self::all());
    }
}
