# 🐔 Lefermier API — Guide Officiel de Référence Développeur
*Documentation technique de niveau entreprise (Standard Stripe / GitHub / Plaid) pour le marché béninois et ouest-africain.*

---

## 1. Vue d'Ensemble & Accès Interactif

L'API Lefermier est une API RESTful haute performance développée sous **Symfony 8.1**, conçue pour piloter des élevages avicoles modernes (poulets de chair, pondeuses, reproducteurs).

Trois portails interactifs de documentation sont servis directement par l'application :

| Portail | URL Locale | Technologie | Caractéristiques |
| :--- | :--- | :--- | :--- |
| **Scalar API Reference** *(Recommandé)* | [`http://127.0.0.1:8000/api/docs`](http://127.0.0.1:8000/api/docs) | Scalar (Theme Kepler) | Disposition Stripe à 3 volets, client de test interactif intégré, générateurs de code dans 10 langages (cURL, JS, PHP, Python, Go, Java, C#, etc.). |
| **Redoc Enterprise** | [`http://127.0.0.1:8000/api/docs/redoc`](http://127.0.0.1:8000/api/docs/redoc) | Redocly Standalone | Navigation par arborescence, vue détaillée des schémas JSON et réponses types. |
| **Swagger UI** | [`http://127.0.0.1:8000/api/docs/swagger`](http://127.0.0.1:8000/api/docs/swagger) | Swagger UI v5 | Interface classique avec boutons d'essai direct (*Try it out*). |
| **Spécification Brute OpenAPI 3.1** | [`http://127.0.0.1:8000/api/openapi.json`](http://127.0.0.1:8000/api/openapi.json) | JSON Schema OpenAPI 3.1 | Fichier machine-readable importable dans Postman, Insomnia, ou pour la génération de SDKs. |

---

## 2. Normes & Standards de Conception

### 2.1. Monnaie & Précision Financière (XOF / FCFA)
> [!IMPORTANT]
> **Aucun nombre flottant n'est utilisé pour les devises.**
> Tous les montants financiers sont exprimés en **Francs CFA (XOF)** sous forme d'entiers stricts (`BIGINT` en base de données, `integer` en JSON).
> *Exemple : 25 000 FCFA est encodé `25000` et non `25000.00`.*

### 2.2. Identifiants ULID (Universally Unique Lexicographically Sortable Identifier)
- Toutes les entités utilisent des clés primaires de type **ULID** (26 caractères en encodage Crockford Base32, ex: `01JME0ABCDEF12345678901234`).
- **Avantages** : Ordonnancement chronologique naturel, indexation B-Tree optimale sous MySQL 8.4, absence de collision en environnement distribué.

### 2.3. Cloisonnement Multi-Tenant & Rôles
Chaque ressource zootechnique ou financière est rattachée à une exploitation (`Farm`). L'accès est validé par des Voters Symfony selon le rôle de l'utilisateur :
- `OWNER` : Propriétaire (accès illimité).
- `FARM_MANAGER` : Gérant d'exploitation (accès complet).
- `PRODUCTION_LEAD` : Chef d'élevage (accès zootechnique et stocks, données financières masquées).
- `STOCK_KEEPER` : Magasinier (gestion des stocks et intrants).
- `ACCOUNTANT` : Comptable (accès aux ventes, achats et trésorerie).
- `VET_CONSULTANT` : Vétérinaire (consultation et suivi sanitaire).

### 2.4. Standards Zootechniques Ouest-Africains
- **Plateaux d'œufs** : 1 plateau / alvéole standard = **30 œufs**.
  - `traysCount = intdiv(goodEggsCount, 30)`
  - `looseEggsCount = goodEggsCount % 30`
- **Taux de ponte journalier** : Calculé sur le cheptel vivant à la date de collecte :
  $$\text{Taux de ponte (\%)} = \left(\frac{\text{Total Œufs Collectés}}{\text{Effectif Vif de la Bande}}\right) \times 100$$
- **Modes de Règlement Locaux** : Prise en charge native de `MTN_MOMO`, `MOOV_MONEY`, `CELTIIS_CASH`, `CASH`, `BANK_TRANSFER`, `CHECK`.

---

## 3. Format des Réponses & Gestion des Erreurs

### 3.1. Réponse Standard Succès (`200 OK` / `201 Created`)
```json
{
  "status": "success",
  "message": "Opération effectuée avec succès.",
  "data": { ... }
}
```

### 3.2. Réponse Standard Erreur (`4xx` / `5xx`)
```json
{
  "code": 422,
  "message": "Erreur de validation zootechnique : l'effectif actuel est insuffisant.",
  "errors": {
    "quantity": "La quantité demandée (15) dépasse l'effectif vif disponible (10)."
  },
  "timestamp": "2026-10-17T12:30:00Z"
}
```

### 3.3. Matrice des Codes HTTP
| Code HTTP | Signification | Contexte dans Lefermier |
| :--- | :--- | :--- |
| `200 OK` | Succès | Consultation ou mise à jour réussie. |
| `201 Created` | Ressource créée | Création d'une bande, collecte, mouvement, article ou transaction. |
| `400 Bad Request` | Requête invalide | JSON malformé ou paramètres manquants. |
| `401 Unauthorized` | Non authentifié | Token JWT manquant, invalide ou expiré. |
| `403 Forbidden` | Accès refusé | L'utilisateur n'appartient pas à l'exploitation ou prérogative insuffisante. |
| `404 Not Found` | Introuvable | L'identifiant ULID spécifié n'existe pas. |
| `409 Conflict` | Conflit métier | Collecte d'œufs déjà enregistrée pour cette bande et cette session à cette date. |
| `422 Unprocessable Content` | Erreur métier | Cheptel insuffisant, stock négatif, tentative d'œufs sur poulets de chair. |
| `500 Internal Error` | Erreur serveur | Incident non géré. |

---

## 4. Authentification & Sécurité

L'API Lefermier prend en charge deux modes d'authentification complémentaires selon le type de consommateur :

### 4.1. Canal Utilisateur : Jetons JWT (Applications Web & Mobile)
Pour les humains connectés via l'application Web ou Mobile :
- Obtention du jeton par `POST /api/auth/login` ou `POST /api/auth/register`.
- Signature cryptographique RSA 4096-bit (algorithme `RS256`).
- En-tête HTTP :
```http
Authorization: Bearer <votre_jeton_jwt>
```

#### Exemple de connexion éleveur :
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "eleveur@lefermier.bj",
    "password": "MonPassSecurise2026!"
  }'
```

### 4.2. Canal Machine : Clés API Développeur & IoT (`lef_live_...`)
Pour les scripts distants, capteurs connectés (température, humidité, pesage), automates de ventilation, logiciels de comptabilité ou cabinets vétérinaires :
- Préfixes standard : `lef_live_` (environnement de production) et `lef_test_` (bac à sable).
- **Sécurité maximale (Zéro fuite)** : Seul le hachage cryptographique `SHA-256` est stocké en base de données. La clé secrète brute n'est transmise **qu'une seule fois** lors de sa génération.
- Traçage automatique de l'horodatage du dernier usage (`lastUsedAt`).
- Révocation immédiate en cas de compromission (`401 Unauthorized` instantané).

Deux en-têtes équivalents sont acceptés pour les clés API :
```http
X-API-KEY: lef_live_1de8d40171cf710e57cbc8958addc38b4b0a5cba604416bc
```
Ou bien :
```http
Authorization: ApiKey lef_live_1de8d40171cf710e57cbc8958addc38b4b0a5cba604416bc
```

#### Exemple d'appel API par capteur IoT (sans aucun compte utilisateur) :
```bash
curl -X GET http://127.0.0.1:8000/api/farms/01M54XTKF5AB2XZA9S380QCFJY/dashboard \
  -H "X-API-KEY: lef_live_1de8d40171cf710e57cbc8958addc38b4b0a5cba604416bc"
```

---

## 5. Catalogue Complet des Points de Terminaison (Endpoints)

### Module 1 : Authentification & Utilisateurs
- `POST /api/auth/register` : Création du compte utilisateur (découplé de la création d'exploitation).
- `POST /api/auth/login` : Authentification et délivrance du JWT RSA-4096.
- `GET /api/auth/me` : Profil de l'utilisateur connecté et liste de ses exploitations avec rôles.

### Module 2 : Exploitations, Collaborateurs & Bâtiments
- `GET /api/farms` : Liste des fermes accessibles par l'utilisateur connecté.
- `POST /api/farms` : Création d'une nouvelle exploitation par le propriétaire (attribution automatique du rôle `OWNER` et rattachement à son organisation).
- `GET /api/farms/{id}` : Détails d'une ferme (capacité, ville, département).
- `PUT /api/farms/{id}` : Mise à jour des informations de l'exploitation.
- `GET /api/farms/{id}/members` : Liste des collaborateurs et membres de l'exploitation avec leurs rôles.
- `POST /api/farms/{id}/members` : Invitation / rattachement d'un collaborateur existant par email avec un rôle.
- `PUT /api/farms/{id}/members/{membershipId}` : Modification du rôle ou du statut d'un collaborateur.
- `DELETE /api/farms/{id}/members/{membershipId}` : Retrait d'un collaborateur de l'exploitation.
- `GET /api/farms/{id}/buildings` : Liste des bâtiments et capacités.
- `POST /api/farms/{id}/buildings` : Création d'un bâtiment (`POULTRY_HOUSE`, `BROODER`, `STORAGE`) avec présets et raccourcis.

### Module 3 : Bandes de Volailles & Cheptel
- `GET /api/farms/{id}/flocks?status={status}` : Liste filtrée des bandes de l'exploitation.
- `POST /api/farms/{id}/flocks` : Création d'une nouvelle bande (espèce, souche ISA Brown / Cobb 500, effectif initial, bâtiment d'accueil optionnel). Le code du lot (`code`) est auto-généré par le système sous format `LOT-YYYY-XXXX-NNNN`.
- `GET /api/flocks/{id}` : Fiche détaillée (effectif vivant, âge en jours/semaines, taux de mortalité en %, mouvements).
- `PUT /api/flocks/{id}` : Mise à jour des informations d'une bande.
- `POST /api/flocks/{id}/movements` : Mouvement d'effectif (`MORTALITY`, `SALE`, `CULLING`, `TRANSFER`).

### Module 4 : Alimentation & Stocks
- `GET /api/inventory/items?farmId={id}&lowStockOnly=true` : Inventaire et alertes de seuil bas.
- `POST /api/inventory/items` : Création d'un article de stock (aliments, vaccins, litières, emballages).
- `POST /api/inventory/items/{id}/movements` : Entrée, consommation journalière ou ajustement de stock.
- `GET /api/inventory/valuation?farmId={id}` : Valorisation financière globale du stock en FCFA.

### Module 5 : Production d'Œufs
- `GET /api/egg-productions?farmId={id}&flockId={id}&startDate={date}&endDate={date}` : Historique des pontes.
- `POST /api/egg-productions` : Saisie d'une collecte (Matin/Midi/Soir, conformes, fêlés, cassés, plateaux de 30 et % ponte).
- `PUT /api/egg-productions/{id}` : Modification d'une collecte existante avec recalcul automatique des plateaux et taux de ponte.

### Module 6 : Ventes, Dépenses & Trésorerie
- `GET /api/contacts?farmId={id}` : Répertoire des tiers (clients, revendeuses, fournisseurs d'aliments, vétérinaires).
- `POST /api/contacts` : Création d'un tiers avec IFU optionnel.
- `POST /api/transactions` : Enregistrement de vente ou dépense (modes MTN MoMo, Moov, Celtiis, Espèces).
- `GET /api/flocks/{id}/transactions` : Calcul de rentabilité et marge brute d'une bande en FCFA.
- `GET /api/farms/{id}/financial-summary` : Trésorerie nette et ventilation recettes/dépenses de l'exploitation.

### Module 7 : Tableau de Bord & Indicateurs Décisionnels (KPI)
- `GET /api/farms/{id}/dashboard` : Vue unifiée en temps réel (cheptel vivant, mortalité %, ponte du jour, alertes stock bas, santé financière avec masquage selon rôle).

### Module 8 : Clés API Développeur & Intégrations Machine
Gestion autonome des clés API de l'exploitation (réservé aux intégrations machine-to-machine, automates et capteurs connectés ; masqué dans l'interface de navigation éleveur pour préserver la simplicité opérationnelle). Requiert la permission `api_key:manage`.

#### 8.1. Lister les clés API d'une ferme
```http
GET /api/farms/{farmId}/api-keys
```
**Réponse d'exemple (`200 OK`) :**
```json
{
  "status": "success",
  "data": [
    {
      "id": "01M54YQ91Z6B0YRS9TMD2DDMMK",
      "name": "Capteur Connecté IoT Poulailler A",
      "maskedKey": "lef_live_...16bc",
      "keyPrefix": "lef_live_",
      "lastFour": "16bc",
      "scopes": ["*"],
      "isActive": true,
      "lastUsedAt": "2026-10-17T12:52:22+00:00",
      "expiresAt": "2027-01-15T12:00:00+00:00",
      "createdAt": "2026-10-17T12:45:00+00:00"
    }
  ]
}
```

#### 8.2. Créer une nouvelle clé API
```http
POST /api/farms/{farmId}/api-keys
Content-Type: application/json

{
  "name": "Automate Climatisation Poulailler B",
  "environment": "live",
  "scopes": ["*"],
  "expiresInDays": 180
}
```
**Réponse d'exemple (`201 Created`) :**
```json
{
  "status": "success",
  "message": "Clé API générée avec succès.",
  "data": {
    "id": "01M54YQ91Z6B0YRS9TMD2DDMMK",
    "name": "Automate Climatisation Poulailler B",
    "rawKey": "lef_live_1de8d40171cf710e57cbc8958addc38b4b0a5cba604416bc",
    "maskedKey": "lef_live_...16bc",
    "warning": "Conservez cette clé en lieu sûr. Elle ne sera plus JAMAIS affichée."
  }
}
```

#### 8.3. Révoquer une clé API
```http
DELETE /api/farms/{farmId}/api-keys/{keyId}
```
**Réponse d'exemple (`200 OK`) :**
```json
{
  "status": "success",
  "message": "Clé API révoquée avec succès."
}
```

---

### Module 9 : Matrice Dynamique des Rôles & Permissions (RBAC Multi-Agences)

Chaque agence/exploitation gère sa propre matrice de rôles. Le système n'a aucun rôle codé en dur : l'accès dépend des permissions atomiques configurées par l'agence.

#### 9.1. Dictionnaire global des permissions (`GET /api/permissions`)
Renvoie les 22 permissions système avec libellés français et groupements de modules pour composer l'interface d'administration.
```bash
curl -X GET http://127.0.0.1:8000/api/permissions
```

#### 9.2. Lister les rôles de l'agence (`GET /api/farms/{farmId}/roles`)
Renvoie les 5 rôles auto-initialisés (`Propriétaire`, `Gérant`, `Chef d'élevage`, `Magasinier`, `Comptable`) et tous les rôles sur-mesure créés par l'agence.

#### 9.3. Créer un rôle personnalisé (`POST /api/farms/{farmId}/roles`)
```http
POST /api/farms/{farmId}/roles
Content-Type: application/json

{
  "name": "Superviseur Ponte Matin",
  "code": "SUPERVISEUR_PONTE",
  "description": "Responsable de la collecte et tri des œufs au lever du soleil",
  "permissions": [
    "egg:view",
    "egg:create",
    "flock:view",
    "dashboard:view"
  ]
}
```

#### 9.4. Modifier un rôle personnalisé (`PUT /api/farms/{farmId}/roles/{roleId}`)
Permet d'ajouter ou de retirer des permissions à un rôle de l'agence (le rôle système `Propriétaire` est protégé contre modification).

#### 9.5. Supprimer un rôle personnalisé (`DELETE /api/farms/{farmId}/roles/{roleId}`)
Supprime le rôle personnalisé (rejet `400 Bad Request` sur les rôles système).

---

## 6. Répertoire des 22 Permissions Atomiques Système

| Module | Permission Slug | Libellé | Impact Opérationnel & Sécurité |
| :--- | :--- | :--- | :--- |
| **Exploitation** | `farm:view` | Consulter l'exploitation | Accès en lecture aux paramètres de la ferme |
| | `farm:edit` | Modifier l'exploitation | Mise à jour ville, capacité, nom et devise |
| | `farm:delete` | Supprimer l'exploitation | Suppression définitive (réservé propriétaire) |
| **Bâtiments** | `building:manage` | Gérer les bâtiments | Création et paramétrage des poulaillers/magasins |
| **Administration** | `role:manage` | Gérer la matrice des rôles | Création, modification et suppression des rôles |
| | `member:manage` | Gérer les collaborateurs | Invitation de membres et affectation des rôles |
| **Bandes & Volailles** | `flock:view` | Consulter les bandes | Visualisation des lots, effectifs et mortalité % |
| | `flock:create` | Créer une bande | Enregistrement de nouveaux poussins/poulettes |
| | `flock:movement` | Enregistrer un mouvement | Déclaration de mortalités, ventes et réformes |
| **Alimentation & Stocks** | `inventory:view` | Consulter les stocks | Lecture des niveaux de stock d'aliments et soins |
| | `inventory:create` | Créer un article | Ajout d'intrants au catalogue de stock |
| | `inventory:movement` | Mouvements de stock | Réceptions, sorties pour ration et pertes |
| | `inventory:valuation`| Valorisation du stock | Calcul de la valeur marchande du magasin en FCFA |
| **Production d'œufs** | `egg:view` | Consulter la ponte | Historique journalier et graphiques de ponte |
| | `egg:create` | Saisir une collecte | Ramassage matin/midi/soir et calcul des plateaux |
| **Finances & Ventes** | `finance:view` | Consulter les finances | Visualisation des écritures comptables |
| | `finance:create` | Enregistrer une opération | Saisie des ventes et des charges d'exploitation |
| | `finance:margin` | Consulter la marge nette | Rentabilité économique calculée par lot en FCFA |
| **Tiers & Contacts** | `contact:view` | Consulter les contacts | Répertoire clients, revendeuses et fournisseurs |
| | `contact:create` | Créer un contact | Création de fiche tiers avec IFU Bénin |
| **Tableau de Bord** | `dashboard:view` | Accès au tableau de bord | Affichage de la vue à 360° zootechnique |
| | `dashboard:financials`| Voir les KPI financiers | Affichage de la trésorerie et bénéfices nets |
| **Intégrations & IoT** | `api_key:manage` | Gérer les clés API | Génération et révocation de clés machines |

---

## 7. Utilisation avec Postman & Outils Externes

Deux fichiers prêts à l'emploi sont fournis dans [`docs/postman/`](file:///c:/projets/Lefermier/docs/postman) :
1. [`Lefermier_API.postman_collection.json`](file:///c:/projets/Lefermier/docs/postman/Lefermier_API.postman_collection.json) : Contient l'ensemble des requêtes préconfigurées avec tests d'extraction automatique du token JWT et support des clés API.
2. [`Lefermier_Local.postman_environment.json`](file:///c:/projets/Lefermier/docs/postman/Lefermier_Local.postman_environment.json) : Contient les variables locales pré-remplies.

