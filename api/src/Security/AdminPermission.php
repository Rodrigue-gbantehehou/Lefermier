<?php

declare(strict_types=1);

namespace App\Security;

/**
 * Catalogue exhaustif des permissions applicables à la console centrale d'administration Lefermier.
 *
 * Modèle inspiré de Microsoft RBAC (Scope Platform vs Scope Farm).
 */
final class AdminPermission
{
    // Tableau de bord & KPIs globaux
    public const DASHBOARD_VIEW = 'admin:dashboard:view';

    // Organisations & Fermes
    public const ORGANIZATIONS_VIEW = 'admin:organizations:view';
    public const ORGANIZATIONS_SUSPEND = 'admin:organizations:suspend';

    // Formules & Abonnements
    public const SUBSCRIPTIONS_VIEW = 'admin:subscriptions:view';
    public const SUBSCRIPTIONS_MANAGE = 'admin:subscriptions:manage';

    // Utilisateurs & Comptes
    public const USERS_VIEW = 'admin:users:view';
    public const USERS_MANAGE = 'admin:users:manage';

    // Rôles & Habilitations d'administration
    public const ROLES_VIEW = 'admin:roles:view';
    public const ROLES_MANAGE = 'admin:roles:manage';

    // Supervision & Santé système
    public const HEALTH_VIEW = 'admin:health:view';

    // Journal d'audit
    public const AUDIT_VIEW = 'admin:audit:view';

    /**
     * Retourne la liste complète des permissions avec métadonnées d'interface utilisateur.
     *
     * @return array<string, array{module: string, label: string, description: string}>
     */
    public static function all(): array
    {
        return [
            self::DASHBOARD_VIEW => [
                'module' => 'Tableau de bord',
                'label' => 'Consulter les métriques',
                'description' => 'Visualiser les KPI consolidés, effectifs d\'éleveurs et fermes du réseau.',
            ],
            self::ORGANIZATIONS_VIEW => [
                'module' => 'Organisations & Fermes',
                'label' => 'Consulter les organisations',
                'description' => 'Accéder aux informations des organisations clientes et de leurs fermes affiliées.',
            ],
            self::ORGANIZATIONS_SUSPEND => [
                'module' => 'Organisations & Fermes',
                'label' => 'Suspendre ou réactiver',
                'description' => 'Interrompre ou rétablir l\'accès à l\'ensemble des exploitations d\'une organisation.',
            ],
            self::SUBSCRIPTIONS_VIEW => [
                'module' => 'Abonnements & Facturation',
                'label' => 'Consulter les abonnements',
                'description' => 'Visualiser les formules actives (FREE, STANDARD, PRO) et le revenu récurrent (MRR).',
            ],
            self::SUBSCRIPTIONS_MANAGE => [
                'module' => 'Abonnements & Facturation',
                'label' => 'Modifier les formules',
                'description' => 'Changer le plan commercial et les conditions de souscription d\'un client.',
            ],
            self::USERS_VIEW => [
                'module' => 'Comptes Utilisateurs',
                'label' => 'Consulter les utilisateurs',
                'description' => 'Rechercher et afficher les fiches d\'identité des comptes enregistrés.',
            ],
            self::USERS_MANAGE => [
                'module' => 'Comptes Utilisateurs',
                'label' => 'Gérer les comptes',
                'description' => 'Activer ou désactiver des accès utilisateurs à la plateforme.',
            ],
            self::ROLES_VIEW => [
                'module' => 'Rôles & Habilitations',
                'label' => 'Consulter les rôles admin',
                'description' => 'Voir la matrice des permissions et la liste des rôles collaborateurs définis.',
            ],
            self::ROLES_MANAGE => [
                'module' => 'Rôles & Habilitations',
                'label' => 'Gérer la matrice des rôles',
                'description' => 'Créer, modifier des rôles collaborateurs et assigner des permissions personnalisées.',
            ],
            self::HEALTH_VIEW => [
                'module' => 'Supervision Technique',
                'label' => 'Superviser l\'infrastructure',
                'description' => 'Accéder aux métriques de charge PHP, disponibilité MySQL et latence des API.',
            ],
            self::AUDIT_VIEW => [
                'module' => 'Sécurité & Audit',
                'label' => 'Consulter le journal d\'audit',
                'description' => 'Inspecter l\'historique inaltérable des actions administratives sensibles.',
            ],
        ];
    }

    public static function isValid(string $permission): bool
    {
        return $permission === '*' || array_key_exists($permission, self::all());
    }
}
