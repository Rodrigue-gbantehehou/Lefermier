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
- `POST /api/auth/register` : Création de compte utilisateur + organisation + exploitation par défaut.
- `POST /api/auth/login` : Authentification et délivrance du jeton JWT.
- `GET /api/auth/me` : Données de l'utilisateur connecté et liste des exploitations.
- `GET /api/permissions` : Dictionnaire complet des 22 permissions système (public).

---

## 5. Endpoints de Gestion Avicole

### Exploitations (`/api/farms`)
- `GET /api/farms` : Liste des exploitations accessibles pour l'utilisateur connecté.
- `GET /api/farms/{id}` : Consultation détaillée d'une exploitation (`farm:view`).
- `PUT /api/farms/{id}` : Mise à jour des informations de l'exploitation (`farm:edit`).

### Bâtiments (`/api/farms/{id}/buildings`)
- `GET /api/farms/{id}/buildings` : Liste des bâtiments d'une exploitation.
- `POST /api/farms/{id}/buildings` : Création d'un nouveau bâtiment (`building:manage`).

### Clés API Développeur (`/api/farms/{id}/api-keys`)
- `GET /api/farms/{id}/api-keys` : Liste des clés API de l'agence avec masquage (`api_key:manage`).
- `POST /api/farms/{id}/api-keys` : Génération d'une nouvelle clé secrète `lef_live_...` (`api_key:manage`).
- `DELETE /api/farms/{id}/api-keys/{keyId}` : Révocation immédiate d'une clé API (`api_key:manage`).

### Matrice des Rôles & Permissions (`/api/farms/{id}/roles`)
- `GET /api/farms/{id}/roles` : Consulter tous les rôles configurés par l'agence (`farm:view`).
- `POST /api/farms/{id}/roles` : Créer un rôle sur-mesure avec permissions spécifiques (`role:manage`).
- `PUT /api/farms/{id}/roles/{roleId}` : Modifier un rôle personnalisé (`role:manage`).
- `DELETE /api/farms/{id}/roles/{roleId}` : Supprimer un rôle personnalisé (`role:manage`).

