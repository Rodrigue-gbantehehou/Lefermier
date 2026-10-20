# CONVENTIONS D'API — LOGICIEL DE GESTION AVICOLE

**Fichier :** `docs/API_CONVENTIONS.md`  
**Statut :** Référence obligatoire pour l'API backend et les clients (Web & Mobile)  
**Version :** 1.0  
**Format :** JSON (`application/json`)  
**Préfixe des routes :** `/api`  

---

## 1. Principes généraux

L'API constitue le contrat unique et faisant autorité entre le backend Symfony et ses clients (Next.js actuellement, Flutter ultérieurement).

1. **Stateless (Sans état de session côté serveur)** : Chaque requête contient les informations d'authentification requises.
2. **RESTful & Sémantique HTTP** : Utilisation stricte des verbes HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
3. **Typage strict et validation automatique** :
   - Requêtes validées via DTOs et attributs `#[MapRequestPayload]` / `#[MapQueryString]`.
   - Rejet immédiat avec code HTTP `422 Unprocessable Content` en cas d'incohérence ou validation échouée.
4. **Isolation Multi-Tenants obligatoire** :
   - Toute ressource liée à une exploitation fait l'objet d'un contrôle de permission (`Voter`) côté serveur.
   - Ne jamais faire confiance aux IDs passés sans vérifier l'appartenance de l'utilisateur authentifié.
5. **Format des données** :
   - JSON keys en **camelCase** (ex: `firstName`, `productionType`, `createdAt`).
   - Dates en **ISO 8601** UTC (ex: `2026-10-17T11:00:00Z`).
   - Montants monétaires en **FCFA (entiers)**.
   - Identifiants sous format chaîne **ULID** (ex: `01ARZ3NDEKTSV4RRFFQ69G5FAV`).

---

## 2. Codes de statut HTTP

| Code | Signification | Utilisation |
|---|---|---|
| `200 OK` | Succès | Requêtes `GET`, `PUT`, `PATCH` ou `POST` non créatives |
| `201 Created` | Ressource créée | Création réussie via `POST` (en-tête `Location` facultatif) |
| `204 No Content` | Succès sans contenu | Suppression réussie via `DELETE` |
| `400 Bad Request` | Requête mal formée | Syntaxe JSON invalide, paramètres manquants non typés |
| `401 Unauthorized` | Non authentifié | Jeton absent, expiré ou invalide |
| `403 Forbidden` | Accès refusé | Utilisateur identifié mais non membre de la ferme ou rôle insuffisant |
| `404 Not Found` | Ressource introuvable | Identifiant inexistant ou ressource d'une autre exploitation |
| `422 Unprocessable Content` | Validation métier échouée | Champs requis non renseignés, format incorrect, contrainte violée |
| `500 Internal Server Error` | Erreur serveur | Exception inattendue (sans divulgation de stack trace en production) |

---

## 3. Structure des réponses

### 3.1. Réponse de succès unitaire
```json
{
  "data": {
    "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
    "name": "Ferme Avicole d'Allada",
    "productionType": "BROILER",
    "currency": "XOF",
    "createdAt": "2026-10-17T10:30:00Z"
  }
}
```

### 3.2. Réponse de collection paginée
```json
{
  "data": [
    {
      "id": "01JBCDEFGHJKMNPQRSTVWXYZ12",
      "name": "Bâtiment A",
      "capacity": 2500,
      "type": "POULTRY_HOUSE"
    }
  ],
  "meta": {
    "totalItems": 1,
    "itemCount": 1,
    "itemsPerPage": 20,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

### 3.3. Réponse d'erreur (conforme RFC 7807 / Problem Details)
```json
{
  "title": "Erreur de validation",
  "status": 422,
  "detail": "Un ou plusieurs champs contiennent des données non valides.",
  "violations": [
    {
      "propertyPath": "name",
      "title": "Cette valeur ne doit pas être vide.",
      "code": "IS_BLANK_ERROR"
    },
    {
      "propertyPath": "capacity",
      "title": "La capacité doit être un nombre positif.",
      "code": "TOO_LOW_ERROR"
    }
  ]
}
```

---

## 4. Authentification & Sécurité

L'API supporte deux modes d'authentification stricts :

### 4.1. Authentification Utilisateur (Web & Mobile)
```http
Authorization: Bearer <token_jwt>
Content-Type: application/json
Accept: application/json
```

### 4.2. Authentification Machine & Développeur (IoT & Partenaires)
```http
X-API-KEY: lef_live_<token_securise>
```
*Ou alternativement : `Authorization: ApiKey lef_live_<token_securise>`*

### Endpoints d'authentification et permissions :
- `POST /api/auth/register` : Création du compte utilisateur éleveur/collaborateur (découplé de la création d'exploitation).
- `POST /api/auth/login` : Authentification et délivrance du jeton JWT.
- `GET /api/auth/me` : Données de l'utilisateur connecté et liste des exploitations rattachées.
- `GET /api/permissions` : Dictionnaire complet des 22 permissions système (public).

---

## 5. Endpoints de Gestion Avicole

### Exploitations (`/api/farms`)
- `GET /api/farms` : Liste des exploitations accessibles pour l'utilisateur connecté.
- `POST /api/farms` : Création d'une nouvelle exploitation (l'utilisateur devient `OWNER` de cette exploitation).
- `GET /api/farms/{id}` : Consultation détaillée d'une exploitation (`farm:view`).
- `PUT /api/farms/{id}` : Mise à jour des informations de l'exploitation (`farm:edit`).

### Membres & Collaborateurs (`/api/farms/{id}/members`)
- `GET /api/farms/{id}/members` : Liste des collaborateurs et membres de l'exploitation (`member:manage`).
- `POST /api/farms/{id}/members` : Rattacher un utilisateur existant par email avec un rôle (`member:manage`).
- `PUT /api/farms/{id}/members/{membershipId}` : Modifier le rôle ou le statut d'un collaborateur (`member:manage`).
- `DELETE /api/farms/{id}/members/{membershipId}` : Retirer l'accès d'un collaborateur à l'exploitation (`member:manage`).

### Bâtiments & Poulaillers (`/api/farms/{id}/buildings`)
- `GET /api/farms/{id}/buildings` : Liste des bâtiments d'une exploitation.
- `POST /api/farms/{id}/buildings` : Création d'un nouveau bâtiment (`POULTRY_HOUSE`, `BROODER`, `STORAGE`) avec capacité en sujets (`building:manage`).

### Bandes & Effectifs (`/api/farms/{id}/flocks` et `/api/flocks`)
- `GET /api/farms/{id}/flocks?status={status}` : Liste des bandes de l'exploitation (`flock:view`).
- `POST /api/farms/{id}/flocks` : Création d'une bande de volailles (`flock:create`). Le code du lot (`code`) est auto-généré au format `LOT-YYYY-XXXX-NNNN` pour simplifier la saisie, et le rattachement à un poulailler (`buildingId`) est optionnel.
- `GET /api/flocks/{id}` : Fiche détaillée de la bande avec historique des mouvements (`flock:view`).
- `PUT /api/flocks/{id}` : Modification d'une bande existante (`flock:create`).
- `POST /api/flocks/{id}/movements` : Enregistrement d'un mouvement d'effectif (`MORTALITY`, `SALE`, `CULLING`, `TRANSFER`) avec mise à jour immédiate du cheptel vif (`flock:movement`).

### Alimentation & Stocks (`/api/inventory`)
- `GET /api/inventory/items?farmId={id}&lowStockOnly={bool}` : Inventaire et alertes de stock bas (`inventory:view`).
- `POST /api/inventory/items` : Création d'un article de stock en magasin (`FEED`, `VACCINE`, `MEDICATION`, etc.) avec seuil d'alerte (`inventory:create`).
- `POST /api/inventory/items/{id}/movements` : Enregistrement d'une entrée, sortie ou ration journalière (`inventory:movement`).
- `GET /api/inventory/valuation?farmId={id}` : Valorisation financière totale du stock en FCFA (`inventory:valuation`).

### Production d'Œufs (`/api/egg-productions`)
- `GET /api/egg-productions?farmId={id}&flockId={id}&startDate={date}&endDate={date}` : Historique des pontes (`egg:view`).
- `POST /api/egg-productions` : Saisie journalière de collecte (matin/midi/soir, œufs normaux, fêlés, cassés, calcul automatique des alvéoles de 30 et % ponte) (`egg:create`).
- `PUT /api/egg-productions/{id}` : Rectification d'une collecte enregistrée avec recalcul immédiat (`egg:create`).

### Finances, Ventes & Tiers (`/api/transactions`, `/api/contacts`)
- `GET /api/contacts?farmId={id}` : Liste des tiers (clients, revendeuses, fournisseurs, vétérinaires) (`contact:view`).
- `POST /api/contacts` : Création d'un tiers avec IFU optionnel (`contact:create`).
- `GET /api/transactions?farmId={id}&type={INCOME|EXPENSE}` : Liste des écritures comptables (`finance:view`).
- `POST /api/transactions` : Enregistrement d'une recette ou dépense en FCFA (modes MTN MoMo, Moov, Celtiis, Espèces) (`finance:create`).
- `GET /api/flocks/{id}/transactions` : Marge brute et rentabilité par lot en FCFA (`finance:margin`).
- `GET /api/farms/{id}/financial-summary` : Synthèse globale recettes/dépenses/trésorerie nette (`finance:view`).

### Santé Animale & Prophylaxie (`/api/farms/{id}/health-treatments`)
- `GET /api/farms/{id}/health-treatments` : Calendrier vaccinal et liste des soins avec filtres (`flockId`, `status`, `from`, `to`) (`health:view`).
- `POST /api/farms/{id}/health-treatments` : Planification d'une intervention vétérinaire (vaccin, déparasitage, traitement, vitamines) (`health:manage`).
- `POST /api/farms/{id}/health-treatments/generate-program` : Génération automatique du programme vaccinal officiel en 1-clic selon l'espèce (chair ou pondeuse) (`health:manage`).
- `GET /api/health-treatments/{id}` : Consultation détaillée d'un soin (`health:view`).
- `PUT /api/health-treatments/{id}` : Modification d'une intervention planifiée (`health:manage`).
- `POST /api/health-treatments/{id}/complete` : Validation de l'administration du soin avec date réelle, déduction optionnelle de stock et coût engagé (`health:manage`).
- `DELETE /api/health-treatments/{id}` : Suppression d'une intervention (`health:manage`).

### Tableau de Bord & Indicateurs KPI (`/api/farms/{id}/dashboard`)
- `GET /api/farms/{id}/dashboard` : Vue unifiée en temps réel (cheptel vivant, taux de mortalité %, production du jour en plateaux, alertes stock bas, santé financière conditionnée au rôle) (`dashboard:view`).

### Clés API Développeur & IoT (`/api/farms/{id}/api-keys`)
*Canal réservé aux intégrations machine-to-machine, automates et capteurs connectés. Volontairement masqué dans l'interface éleveur pour préserver la simplicité opérationnelle.*
- `GET /api/farms/{id}/api-keys` : Liste des clés API de l'exploitation avec masquage (`api_key:manage`).
- `POST /api/farms/{id}/api-keys` : Génération d'une nouvelle clé secrète `lef_live_...` (`api_key:manage`).
- `DELETE /api/farms/{id}/api-keys/{keyId}` : Révocation immédiate d'une clé API (`api_key:manage`).

### Matrice des Rôles & Permissions (`/api/farms/{id}/roles`)
- `GET /api/farms/{id}/roles` : Consulter tous les rôles configurés par l'exploitation (`farm:view`).
- `POST /api/farms/{id}/roles` : Créer un rôle sur-mesure avec permissions spécifiques (`role:manage`).
- `PUT /api/farms/{id}/roles/{roleId}` : Modifier un rôle personnalisé (`role:manage`).
- `DELETE /api/farms/{id}/roles/{roleId}` : Supprimer un rôle personnalisé (`role:manage`).

