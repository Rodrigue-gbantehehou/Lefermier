# 🛡️ Lefermier API — Guide de Référence Administration Plateforme (Back-Office)

*Documentation technique officielle de l'API d'administration centrale (Super-Admin) pour l'application `admin/`.*  
*Référence obligatoire alignée sur [ADMIN_RULES.md](file:///c:/projets/Lefermier/admin/ADMIN_RULES.md) et [ARCHITECTURE.md](file:///c:/projets/Lefermier/docs/ARCHITECTURE.md).*

---

## 1. Vue d'Ensemble & Périmètre Architectural

L'API Lefermier sépare strictement deux périmètres fonctionnels et sécuritaires :

```text
                                  API SYMFONY CENTRALE
                                           │
                 ┌─────────────────────────┴─────────────────────────┐
                 │                                                   │
        PÉRIMÈTRE TENANT (ÉLEVEURS)                        PÉRIMÈTRE ADMIN (PLATEFORME)
        Routes : /api/farms/{farmId}/*                     Routes : /api/admin/*
        Clients : web/ (Next.js), mobile/ (Flutter)        Client : admin/ (Next.js)
        Sécurité : Farm Voters & 22 permissions            Sécurité : ROLE_ADMIN + AdminPermissionVoter
        Rôle : Gestion zootechnique & financière           Rôle : Supervision, gouvernance, abonnements
```

### 1.1. Principes Fondamentaux
1. **Cloisonnement strict (Isolation Tenancy)** : Les administrateurs de la plateforme ne s'immiscent pas dans les opérations quotidiennes des fermes (pas de saisie d'œufs, pas d'administration sanitaire). Les éleveurs (`ROLE_USER`) sont quant à eux strictement interdits d'accès aux routes `/api/admin/*`.
2. **Autorisation Granulaire Dynamique (Modèle Microsoft RBAC)** :
   - Aucun rôle plateforme n'est codé en dur dans les contrôleurs.
   - Les habilitations sont évaluées par `AdminPermissionVoter` sur la base de permissions granulaires préfixées par `admin:` (ex: `admin:organizations:suspend`, `admin:roles:manage`).
   - L'équipe centrale peut créer des rôles personnalisés (ex: Support N2, Contrôleur de gestion, Auditeur) en cochant des permissions dans le catalogue.
3. **Architecture découplée** :
   - Contrôleurs organisés sous `App\Controller\Admin\` :
     - `DashboardController.php`
     - `OrganizationController.php`
     - `UserController.php`
     - `RoleController.php`
   - Services métiers organisés sous `App\Service\Admin\` :
     - `AdminStatsService.php`
     - `AdminOrganizationService.php`
     - `AdminUserService.php`
     - `AdminRoleService.php`
4. **Audit & Traçabilité** : Toute opération sensible (suspension d'organisation, désactivation de compte, attribution de rôle collaborateur) est sécurisée et prédisposée à la journalisation d'audit inaltérable.

---

## 2. Authentification & Sécurité

### 2.1. Accès Administrateur & Staff Plateforme
- **Authentification** : Jeton JWT RSA 4096-bit généré via `POST /api/auth/login`.
- **En-tête requis** :
  ```http
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
  Accept: application/json
  ```
- **Contrôle d'accès** :
  - L'accès global au préfixe `/api/admin` requiert au minimum `ROLE_ADMIN` (ou `ROLE_SUPER_ADMIN`), conféré automatiquement aux utilisateurs dotés d'un `admin_role_id` en base de données.
  - Chaque endpoint vérifie ensuite la permission granulaire correspondante via l'attribut `#[IsGranted('admin:...')]` géré par `AdminPermissionVoter`.
  - Si l'utilisateur n'a pas les droits requis, l'API renvoie immédiatement une erreur `403 Forbidden` :
  ```json
  {
    "code": 403,
    "message": "Access Denied."
  }
  ```

---

## 3. Endpoints du Tableau de Bord (`App\Controller\Admin\DashboardController`)

### 3.1. Obtenir les statistiques globales de la plateforme
- **Méthode** : `GET`
- **Route** : `/api/admin/stats`
- **Description** : Retourne les indicateurs macro-économiques et zootechniques consolidés sur l'ensemble de la plateforme Lefermier.

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": {
    "users": {
      "total": 142,
      "active": 138,
      "inactive": 4
    },
    "organizations": {
      "total": 56,
      "active": 50,
      "suspended": 2,
      "trial": 4
    },
    "farms": {
      "total": 68
    },
    "flocks": {
      "total": 184
    }
  }
}
```

---

## 4. Endpoints des Organisations & Fermes (`App\Controller\Admin\OrganizationController`)

### 4.1. Lister les organisations de la plateforme
- **Méthode** : `GET`
- **Route** : `/api/admin/organizations`
- **Paramètres de requête (Query params)** :
  - `page` (int, défaut: `1`) : Numéro de page.
  - `limit` (int, défaut: `25`, max: `100`) : Nombre d'éléments par page.
  - `status` (string, optionnel) : `ACTIVE`, `SUSPENDED`, `TRIAL`.
  - `search` (string, optionnel) : Recherche par nom ou slug d'organisation.

#### Exemple de requête :
```http
GET /api/admin/organizations?status=ACTIVE&search=aviculture&page=1&limit=10
```

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": [
    {
      "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
      "name": "Aviculture Moderne du Bénin",
      "slug": "aviculture-moderne-du-benin",
      "subscriptionPlan": "PRO",
      "status": "ACTIVE",
      "farmsCount": 2,
      "farms": [
        {
          "id": "01JBCDEFGHJKMNPQRSTVWXYZ34",
          "name": "Ferme Calavi",
          "code": "F-CALAVI",
          "productionType": "LAYERS",
          "currency": "XOF",
          "locationCity": "Abomey-Calavi",
          "locationCountry": "BJ",
          "membersCount": 5,
          "createdAt": "2026-08-10T08:00:00Z"
        }
      ],
      "createdAt": "2026-08-10T07:45:00Z",
      "updatedAt": "2026-10-15T14:20:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

---

### 4.2. Consulter le détail d'une organisation
- **Méthode** : `GET`
- **Route** : `/api/admin/organizations/{id}`
- **Description** : Renvoie les informations administratives complètes de l'organisation, incluant ses exploitations affiliées et la liste de ses collaborateurs.

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": {
    "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
    "name": "Aviculture Moderne du Bénin",
    "slug": "aviculture-moderne-du-benin",
    "subscriptionPlan": "PRO",
    "status": "ACTIVE",
    "farmsCount": 1,
    "farms": [ ... ],
    "members": [
      {
        "id": "01JUSER01234567890ABCDEFGH",
        "fullName": "Rodrigue G.",
        "email": "rodrigue@example.com",
        "phone": "+22997000000",
        "isActive": true,
        "farms": [
          {
            "id": "01JBCDEFGHJKMNPQRSTVWXYZ34",
            "name": "Ferme Calavi",
            "role": "OWNER",
            "isActive": true
          }
        ]
      }
    ],
    "createdAt": "2026-08-10T07:45:00Z",
    "updatedAt": "2026-10-15T14:20:00Z"
  }
}
```

---

### 4.3. Modifier le statut d'une organisation (Suspension / Réactivation)
- **Méthode** : `PUT`
- **Route** : `/api/admin/organizations/{id}/status`
- **Description** : Permet de suspendre immédiatement ou de réactiver une organisation. La suspension bloque l'accès de tous les collaborateurs aux fermes rattachées.
- **Corps de la requête (JSON)** :
```json
{
  "status": "SUSPENDED"
}
```
*Valeurs acceptées : `ACTIVE`, `SUSPENDED`, `TRIAL`.*

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "message": "Statut de l'organisation \"Aviculture Moderne du Bénin\" mis à jour vers SUSPENDED.",
  "data": {
    "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
    "name": "Aviculture Moderne du Bénin",
    "status": "SUSPENDED",
    ...
  }
}
```

---

### 4.4. Modifier le plan d'abonnement d'une organisation
- **Méthode** : `PUT`
- **Route** : `/api/admin/organizations/{id}/subscription`
- **Corps de la requête (JSON)** :
```json
{
  "plan": "ENTERPRISE"
}
```

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "message": "Plan d'abonnement de \"Aviculture Moderne du Bénin\" mis à jour vers ENTERPRISE.",
  "data": { ... }
}
```

---

## 5. Endpoints des Abonnements, Licences & Quotas (`App\Controller\Admin\SubscriptionController`)

Modèle inspiré de Microsoft 365 Licensing & Azure Subscriptions. Permet la gestion centrale du revenu récurrent (MRR/ARR), le suivi en temps réel de la consommation des quotas de ressources (exploitations, bandes, collaborateurs) et la mise à niveau des formules clientes.

> [!NOTE]
> **Source de Vérité & Configuration** :
> Conformément à `docs/PROJECT_RULES.md`, les offres commerciales et plafonds de quotas ne sont pas codés en dur dans les services PHP :
> - **Enum `App\Enum\SubscriptionPlan`** : Garantit l'intégrité typée (`FREE`, `STANDARD`, `PRO`, `ENTERPRISE`).
> - **Fichier `config/packages/subscriptions.yaml`** : Centralise la grille tarifaire (FCFA / XOF), les remises annuelles, les quotas (`max_farms`, `max_flocks`, `max_members`, `retention_months`), les fonctionnalités incluses et les flags de capacité, injectés par conteneur de services dans `CommercialPlanService`.

### 5.1. Catalogue officiel des formules et offres commerciales (SKUs)
- **Méthode** : `GET`
- **Route** : `/api/admin/subscriptions/plans`
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`
- **Description** : Retourne les 4 formules commerciales (FREE, STANDARD, PRO, ENTERPRISE) avec tarifs mensuels/annuels en FCFA (XOF), quotas plafonds (Service Limits), fonctionnalités et flags de capacité.

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": [
    {
      "sku": "FREE",
      "name": "Starter (Découverte)",
      "tier": "Découverte",
      "badge": "Gratuit",
      "priceMonthly": 0,
      "priceAnnually": 0,
      "currency": "XOF",
      "quotas": {
        "maxFarms": 1,
        "maxFlocks": 2,
        "maxMembers": 2,
        "retentionMonths": 3
      },
      "features": ["1 exploitation avicole", "Jusqu'à 2 bandes simultanées", ...],
      "flags": {
        "accountingExports": false,
        "healthAlerts": false,
        "iotSensors": false,
        "apiAccess": false,
        "prioritySupport": false
      }
    },
    {
      "sku": "STANDARD",
      "name": "Standard (Éleveur Pro)",
      "tier": "Professionnel",
      "badge": "Populaire",
      "priceMonthly": 15000,
      "priceAnnually": 153000,
      "currency": "XOF",
      "quotas": {
        "maxFarms": 3,
        "maxFlocks": 10,
        "maxMembers": 5,
        "retentionMonths": 12
      },
      ...
    },
    {
      "sku": "PRO",
      "name": "Professionnel (Coopérative)",
      "tier": "Multi-Sites",
      "badge": "Recommandé",
      "priceMonthly": 35000,
      "priceAnnually": 357000,
      "currency": "XOF",
      "quotas": {
        "maxFarms": 10,
        "maxFlocks": 50,
        "maxMembers": 20,
        "retentionMonths": 36
      },
      ...
    },
    {
      "sku": "ENTERPRISE",
      "name": "Entreprise & Réseau Industriel",
      "tier": "Grand Compte",
      "badge": "Sur-Mesure",
      "priceMonthly": 85000,
      "priceAnnually": 867000,
      "currency": "XOF",
      "quotas": {
        "maxFarms": 9999,
        "maxFlocks": 9999,
        "maxMembers": 9999,
        "retentionMonths": 120
      },
      ...
    }
  ]
}
```

---

### 5.2. Créer une nouvelle formule commerciale
- **Méthode** : `POST`
- **Route** : `/api/admin/subscriptions/plans`
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`
- **Corps de la requête (JSON)** :
```json
{
  "sku": "COOP_PLUS",
  "name": "Coopérative Supérieure",
  "tier": "Multi-Sites",
  "badge": "Nouveau",
  "description": "Offre sur-mesure pour les grandes coopératives avicoles.",
  "priceMonthly": 45000,
  "priceAnnually": 459000,
  "currency": "XOF",
  "quotas": {
    "maxFarms": 15,
    "maxFlocks": 60,
    "maxMembers": 30,
    "retentionMonths": 48
  },
  "flags": {
    "accountingExports": true,
    "healthAlerts": true,
    "iotSensors": true,
    "apiAccess": false,
    "prioritySupport": true
  },
  "features": [
    "Jusqu'à 15 exploitations avicoles",
    "Capteurs connectés IoT inclus",
    "Support prioritaire WhatsApp 7j/7"
  ],
  "isPopular": false,
  "isRecommended": false
}
```

#### Exemple de réponse (`201 Created`) :
```json
{
  "status": "success",
  "message": "Formule commerciale \"Coopérative Supérieure\" créée avec succès.",
  "data": {
    "id": "01JC...",
    "sku": "COOP_PLUS",
    "name": "Coopérative Supérieure",
    ...
  }
}
```

---

### 5.3. Modifier une formule commerciale
- **Méthode** : `PUT`
- **Route** : `/api/admin/subscriptions/plans/{id}` (ou par code SKU)
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`
- **Corps de la requête (JSON)** : tous les champs de la formule modifiables (`name`, `tier`, `priceMonthly`, `priceAnnually`, `quotas`, `flags`, `features`, `badge`, `isPopular`, `isRecommended`, `isActive`).

---

### 5.4. Supprimer une formule personnalisée
- **Méthode** : `DELETE`
- **Route** : `/api/admin/subscriptions/plans/{id}` (ou par code SKU)
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`
- **Règles d'intégrité** :
  - Les formules système (`is_system = true`, ex: `FREE`, `STANDARD`, `PRO`, `ENTERPRISE`) sont protégées et ne peuvent jamais être supprimées (`409 Conflict`).
  - Une formule personnalisée ne peut être supprimée que si aucune organisation cliente n'y est rattachée (`409 Conflict`).

---

### 5.5. Indicateurs financiers consolidés (MRR & ARR)
- **Méthode** : `GET`
- **Route** : `/api/admin/subscriptions/metrics`
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`
- **Description** : Consolidation en temps réel du Chiffre d'Affaires Récurrent Mensuel (MRR), de la projection annuelle (ARR), du taux de conversion payant et de la répartition par SKU.

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": {
    "totalSubscriptions": 47,
    "activeSubscriptions": 47,
    "paidSubscriptions": 47,
    "trialSubscriptions": 0,
    "suspendedSubscriptions": 0,
    "conversionRate": 100,
    "mrr": {
      "amount": 705000,
      "currency": "XOF",
      "formatted": "705 000 FCFA"
    },
    "arr": {
      "amount": 8460000,
      "currency": "XOF",
      "formatted": "8 460 000 FCFA"
    },
    "bySku": {
      "FREE": { "count": 0, "mrr": 0 },
      "STANDARD": { "count": 47, "mrr": 705000 },
      "PRO": { "count": 0, "mrr": 0 },
      "ENTERPRISE": { "count": 0, "mrr": 0 }
    }
  }
}
```

---

### 5.6. Liste des souscriptions clientes avec compteurs de consommation
- **Méthode** : `GET`
- **Route** : `/api/admin/subscriptions`
- **Paramètres de requête** :
  - `status` (string, optionnel) : `ACTIVE`, `TRIAL`, `SUSPENDED`
  - `plan` (string, optionnel) : `FREE`, `STANDARD`, `PRO`, `ENTERPRISE`
  - `search` (string, optionnel) : Recherche par nom ou slug d'organisation
- **Sécurité** : `#[IsGranted('ROLE_ADMIN')]`

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": [
    {
      "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
      "name": "Aviculture Moderne du Bénin",
      "slug": "aviculture-moderne-du-benin",
      "status": "ACTIVE",
      "plan": {
        "sku": "STANDARD",
        "name": "Standard (Éleveur Pro)",
        "tier": "Professionnel",
        "priceMonthly": 15000,
        "priceAnnually": 153000,
        "currency": "XOF"
      },
      "billingCycle": "MONTHLY",
      "monthlyAmount": 15000,
      "renewalDate": "2026-11-17T11:00:35+00:00",
      "createdAt": "2026-10-17T11:00:35+00:00",
      "usage": {
        "farms": { "current": 1, "max": 3, "percent": 33, "isUnlimited": false },
        "flocks": { "current": 0, "max": 10, "percent": 0, "isUnlimited": false },
        "members": { "current": 1, "max": 5, "percent": 20, "isUnlimited": false }
      },
      "isOverQuota": false
    }
  ],
  "total": 47
}
```

---

### 5.7. Mettre à niveau ou modifier la licence client
- **Méthode** : `PUT`
- **Route** : `/api/admin/subscriptions/{id}`
- **Sécurité** : `#[IsGranted('admin:subscriptions:manage')]`
- **Corps de la requête (JSON)** :
```json
{
  "plan": "PRO",
  "status": "ACTIVE"
}
```

---

## 6. Endpoints des Utilisateurs & Comptes (`App\Controller\Admin\UserController`)

### 6.1. Lister les utilisateurs de la plateforme
- **Méthode** : `GET`
- **Route** : `/api/admin/users`
- **Paramètres de requête (Query params)** :
  - `page` (int, défaut: `1`) : Numéro de page.
  - `limit` (int, défaut: `25`, max: `100`) : Nombre d'éléments par page.
  - `active` (booléen, optionnel) : `true` ou `false`.
  - `search` (string, optionnel) : Recherche par email, nom, prénom ou téléphone.

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": [
    {
      "id": "01JUSER01234567890ABCDEFGH",
      "email": "koffi.mensah@example.com",
      "firstName": "Koffi",
      "lastName": "Mensah",
      "fullName": "Koffi Mensah",
      "phone": "+22995123456",
      "roles": ["ROLE_USER"],
      "isActive": true,
      "farmsCount": 1,
      "farms": [
        {
          "id": "01JBCDEFGHJKMNPQRSTVWXYZ34",
          "name": "Ferme Avicole d'Allada",
          "role": "OWNER",
          "organization": "Coopérative Avicole du Sud"
        }
      ],
      "createdAt": "2026-09-01T12:00:00Z",
      "updatedAt": "2026-10-18T16:45:00Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 25
}
```

---

### 5.2. Consulter le détail d'un utilisateur
- **Méthode** : `GET`
- **Route** : `/api/admin/users/{id}`

---

### 5.3. Activer ou désactiver un compte utilisateur
- **Méthode** : `PUT`
- **Route** : `/api/admin/users/{id}/active`
- **Corps de la requête (JSON)** :
```json
{
  "isActive": false
}
```

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "message": "Compte de Koffi Mensah désactivé.",
  "data": {
    "id": "01JUSER01234567890ABCDEFGH",
    "isActive": false,
    ...
  }
}
```

---

### 5.4. Promouvoir ou révoquer le rôle Super-Admin
- **Méthode** : `PUT`
- **Route** : `/api/admin/users/{id}/super-admin`
- **Corps de la requête (JSON)** :
```json
{
  "isSuperAdmin": true
}
```

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "message": "Rôle super-admin accordé pour Koffi Mensah.",
  "data": {
    "id": "01JUSER01234567890ABCDEFGH",
    "roles": ["ROLE_USER", "ROLE_SUPER_ADMIN"]
  }
}
```

---

### 5.5. Assigner ou révoquer un rôle plateforme collaborateur
- **Méthode** : `PUT`
- **Route** : `/api/admin/users/{id}/role`
- **Sécurité** : `#[IsGranted('admin:roles:manage')]`
- **Corps de la requête (JSON)** :
```json
{
  "roleId": "01JROLESUPPORT000000000000"
}
```
*(Transmettre `"roleId": null` pour révoquer tout accès admin et confiner l'utilisateur au périmètre éleveur).*

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "message": "Rôle \"Support Client & Fermes\" assigné à l'utilisateur.",
  "data": {
    "id": "01JUSER01234567890ABCDEFGH",
    "roles": ["ROLE_USER", "ROLE_ADMIN", "ROLE_ADMIN_SUPPORT"],
    "adminRole": {
      "id": "01JROLESUPPORT000000000000",
      "name": "Support Client & Fermes",
      "code": "ADMIN_SUPPORT"
    },
    "adminPermissions": [
      "admin:dashboard:view",
      "admin:organizations:view",
      "admin:users:view"
    ]
  }
}
```

---

## 6. Endpoints de Gouvernance des Rôles & Habilitations (`App\Controller\Admin\RoleController`)

Conforme au modèle Microsoft Entra RBAC (Scope Platform). Permet de créer, éditer et affecter dynamiquement des rôles plateforme sans modifier une seule ligne de code.

### 6.1. Catalogue des permissions disponibles
- **Méthode** : `GET`
- **Route** : `/api/admin/roles/permissions`
- **Sécurité** : `ROLE_ADMIN`
- **Description** : Retourne la liste exhaustive des 11 permissions granulaires utilisables dans les formulaires avec leurs métadonnées d'interface utilisateur (module, libellé, description).

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": {
    "permissions": {
      "admin:dashboard:view": {
        "module": "Tableau de bord",
        "label": "Consulter les métriques",
        "description": "Visualiser les KPI consolidés, effectifs d'éleveurs et fermes du réseau."
      },
      "admin:organizations:view": {
        "module": "Organisations & Fermes",
        "label": "Consulter les organisations",
        "description": "Accéder aux informations des organisations clientes et de leurs fermes affiliées."
      },
      "admin:organizations:suspend": {
        "module": "Organisations & Fermes",
        "label": "Suspendre ou réactiver",
        "description": "Interrompre ou rétablir l'accès à l'ensemble des exploitations d'une organisation."
      },
      "admin:subscriptions:view": {
        "module": "Abonnements & Facturation",
        "label": "Consulter les abonnements",
        "description": "Visualiser les formules actives (FREE, STANDARD, PRO) et le revenu récurrent (MRR)."
      },
      "admin:subscriptions:manage": {
        "module": "Abonnements & Facturation",
        "label": "Modifier les formules",
        "description": "Changer le plan commercial et les conditions de souscription d'un client."
      },
      "admin:users:view": {
        "module": "Comptes Utilisateurs",
        "label": "Consulter les utilisateurs",
        "description": "Rechercher et afficher les fiches d'identité des comptes enregistrés."
      },
      "admin:users:manage": {
        "module": "Comptes Utilisateurs",
        "label": "Gérer les comptes",
        "description": "Activer ou désactiver des accès utilisateurs à la plateforme."
      },
      "admin:roles:view": {
        "module": "Rôles & Habilitations",
        "label": "Consulter les rôles admin",
        "description": "Voir la matrice des permissions et la liste des rôles collaborateurs définis."
      },
      "admin:roles:manage": {
        "module": "Rôles & Habilitations",
        "label": "Gérer la matrice des rôles",
        "description": "Créer, modifier des rôles collaborateurs et assigner des permissions personnalisées."
      },
      "admin:health:view": {
        "module": "Supervision Technique",
        "label": "Superviser l'infrastructure",
        "description": "Accéder aux métriques de charge PHP, disponibilité MySQL et latence des API."
      },
      "admin:audit:view": {
        "module": "Sécurité & Audit",
        "label": "Consulter le journal d'audit",
        "description": "Inspecter l'historique inaltérable des actions administratives sensibles."
      }
    },
    "total": 11
  }
}
```

---

### 6.2. Lister tous les rôles plateforme configurés
- **Méthode** : `GET`
- **Route** : `/api/admin/roles`
- **Sécurité** : `ROLE_ADMIN`

#### Exemple de réponse (`200 OK`) :
```json
{
  "status": "success",
  "data": [
    {
      "id": "01JROLESUPER00000000000000",
      "name": "Super-Administrateur",
      "code": "SUPER_ADMIN",
      "description": "Accès absolu et illimité à l'ensemble des fonctions de la console centrale.",
      "permissions": ["*"],
      "isSystem": true,
      "usersCount": 2,
      "createdAt": "2026-10-22T10:00:00+00:00",
      "updatedAt": "2026-10-22T10:00:00+00:00"
    },
    {
      "id": "01JROLEGEN0000000000000000",
      "name": "Administrateur Général",
      "code": "ADMIN_GENERAL",
      "description": "Supervision complète des organisations, fermes, abonnements et utilisateurs.",
      "permissions": [
        "admin:dashboard:view",
        "admin:organizations:view",
        "admin:organizations:suspend",
        "admin:subscriptions:view",
        "admin:subscriptions:manage",
        "admin:users:view",
        "admin:users:manage",
        "admin:roles:view",
        "admin:health:view",
        "admin:audit:view"
      ],
      "isSystem": true,
      "usersCount": 0,
      "createdAt": "2026-10-22T10:00:00+00:00",
      "updatedAt": "2026-10-22T10:00:00+00:00"
    },
    {
      "id": "01JROLESUPPORT000000000000",
      "name": "Support Client & Fermes",
      "code": "ADMIN_SUPPORT",
      "description": "Accompagnement et assistance aux éleveurs sans droits de suspension.",
      "permissions": [
        "admin:dashboard:view",
        "admin:organizations:view",
        "admin:users:view"
      ],
      "isSystem": true,
      "usersCount": 1,
      "createdAt": "2026-10-22T10:00:00+00:00",
      "updatedAt": "2026-10-22T10:00:00+00:00"
    },
    {
      "id": "01JROLEFINANCE000000000000",
      "name": "Responsable Facturation & MRR",
      "code": "ADMIN_FINANCE",
      "description": "Gestion des formules commerciales, quotas et suivi du revenu récurrent.",
      "permissions": [
        "admin:dashboard:view",
        "admin:organizations:view",
        "admin:subscriptions:view",
        "admin:subscriptions:manage"
      ],
      "isSystem": true,
      "usersCount": 0,
      "createdAt": "2026-10-22T10:00:00+00:00",
      "updatedAt": "2026-10-22T10:00:00+00:00"
    }
  ]
}
```

---

### 6.3. Créer un rôle collaborateur personnalisé
- **Méthode** : `POST`
- **Route** : `/api/admin/roles`
- **Sécurité** : `#[IsGranted('admin:roles:manage')]`
- **Corps de la requête (JSON)** :
```json
{
  "name": "Auditeur Qualité & Conformité",
  "code": "ADMIN_AUDIT_COMPLIANCE",
  "description": "Vérification des registres de production et du journal d'audit.",
  "permissions": [
    "admin:dashboard:view",
    "admin:organizations:view",
    "admin:audit:view"
  ]
}
```

#### Exemple de réponse (`201 Created`) :
```json
{
  "status": "success",
  "message": "Rôle \"Auditeur Qualité & Conformité\" créé avec succès.",
  "data": {
    "id": "01JROLECUSTOM000000000000",
    "name": "Auditeur Qualité & Conformité",
    "code": "ADMIN_AUDIT_COMPLIANCE",
    "description": "Vérification des registres de production et du journal d'audit.",
    "permissions": [
      "admin:dashboard:view",
      "admin:organizations:view",
      "admin:audit:view"
    ],
    "isSystem": false,
    "usersCount": 0,
    "createdAt": "2026-10-22T12:00:00+00:00",
    "updatedAt": "2026-10-22T12:00:00+00:00"
  }
}
```

---

### 6.4. Mettre à jour un rôle
- **Méthode** : `PUT`
- **Route** : `/api/admin/roles/{id}`
- **Sécurité** : `#[IsGranted('admin:roles:manage')]`
- **Corps de la requête (JSON)** :
```json
{
  "name": "Support Client & Fermes Avancé",
  "permissions": [
    "admin:dashboard:view",
    "admin:organizations:view",
    "admin:organizations:suspend",
    "admin:users:view"
  ],
  "description": "Accompagnement éleveurs avec habilitation exceptionnelle de suspension."
}
```

---

### 6.5. Supprimer un rôle personnalisé
- **Méthode** : `DELETE`
- **Route** : `/api/admin/roles/{id}`
- **Sécurité** : `#[IsGranted('admin:roles:manage')]`
- **Règles métier** :
  - Les rôles système (`isSystem: true`) sont protégés et ne peuvent pas être supprimés.
  - La suppression d'un rôle détache automatiquement les utilisateurs affiliés (`users.admin_role_id = NULL`).

---

## 7. Modules d'Administration Futurs (Roadmap Back-Office)

Conformément aux responsabilités identifiées dans [ADMIN_RULES.md (Section 3)](file:///c:/projets/Lefermier/admin/ADMIN_RULES.md) :

| Module | Route cible | Statut | Responsabilité |
|---|---|---|---|
| **Paiements & Facturation** | `/api/admin/payments` | Roadmap | Consultation globale des transactions FCFA (MTN MoMo, Moov, Celtiis, Virements) |
| **Journal d'Audit** | `/api/admin/audit-logs` | En cours (`admin:audit:view`) | Historique immuable des actions sensibles de super-admins |
| **Supervision Système** | `/api/admin/health` | En place (`admin:health:view`) | Métriques techniques, connectivité MySQL, mémoire |
| **Support & Tickets** | `/api/admin/support` | Roadmap | Suivi des demandes éleveurs et incidents |

