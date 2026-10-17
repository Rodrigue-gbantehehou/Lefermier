# 🐔 Lefermier — Logiciel de Gestion Avicole Moderne

> **Solution professionnelle de pilotage d'exploitations avicoles (Poules pondeuses, Poulets de chair et Élevages mixtes) conçue pour le Bénin et l'Afrique de l'Ouest.**

[![API Symfony](https://img.shields.io/badge/API-Symfony%208.1%20%2F%20PHP%208.4-6C5CE7?style=flat-square&logo=symfony)](https://symfony.com)
[![Web Next.js](https://img.shields.io/badge/Web-Next.js%2016%20%2F%20React%2019-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-MySQL%208.4%20%2F%20Doctrine-00758F?style=flat-square&logo=mysql)](https://mysql.com)
[![OpenAPI 3.1](https://img.shields.io/badge/Docs-OpenAPI%203.1%20%2F%20Scalar-0984E3?style=flat-square&logo=openapi-initiative)](http://127.0.0.1:8000/api/docs)
[![Currency](https://img.shields.io/badge/Devise-FCFA%20(XOF)-27AE60?style=flat-square)](#monnaie--standards-locaux)

---

## 🌟 Points Forts & Spécificités Métier

- **Isolation Stricte Multi-Tenants & Multi-Fermes** :
  - Un propriétaire peut gérer plusieurs exploitations indépendantes (`Ferme A`, `Ferme B`).
  - Découplage strict entre l'inscription de l'utilisateur et la création d'exploitations.
  - Bascule instantanée entre fermes dans l'en-tête de l'application sans déconnexion.
- **Standards Zootechniques Ouest-Africains** :
  - **Gestion de la ponte** : Conversion automatique des œufs en plateaux/alvéoles de **30 œufs** (`29 œufs`, `14 plateaux`, `14 plateaux + 5 œufs`).
  - **Taux de ponte temps réel** calculé dynamiquement sur le cheptel vivant à la date de collecte.
  - **Unités d'aliments normalisées** : Sacs 50 kg, sacs 25 kg, kg, tonnes avec conversions automatiques.
- **Paiements & Trésorerie Régionale** :
  - Intégration native des modes de paiement locaux : **MTN Mobile Money**, **Moov Money**, **Celtiis Cash**, Espèces, Virements et Chèques.
  - Montants financiers en **Francs CFA (XOF)** stockés sous forme d'entiers stricts (`BIGINT` sans virgule flottante).
- **Sécurité & Accès Granulaire** :
  - Double canal d'accès : Jetons **JWT RSA 4096-bit** pour utilisateurs et **Clés API sécurisées** (`lef_live_...` / `lef_test_...` hachées en SHA-256) pour capteurs IoT et automates.
  - Matrice dynamique de **22 permissions atomiques** par exploitation.

---

## 🏗️ Architecture du Projet

```text
Lefermier/
├── api/                # Backend Symfony 8.1 RESTful API
│   ├── config/         # Configuration des services, routes et JWT
│   ├── src/
│   │   ├── Controller/ # Endpoints API (Auth, Farms, Flocks, Eggs, Inventory, Finance, etc.)
│   │   ├── Dto/        # Objets de transfert typés et validés
│   │   ├── Entity/     # Modèles Doctrine ORM avec identifiants ULID
│   │   ├── Repository/ # Requêtes optimisées et filtres multi-tenants
│   │   ├── Security/   # Voters de sécurité et gestionnaire de permissions
│   │   └── Service/    # Logique métier zootechnique et financière
│   └── public/         # Point d'entrée HTTP et openapi.json
│
├── web/                # Client Web Next.js 16 (App Router & React 19)
│   ├── app/            # Pages & Routes (Dashboard, Flocks, Eggs, Inventory, Finances, Settings)
│   ├── components/     # Composants réutilisables (DataTable, Modal portallé, StatCard, Sidebar, Header)
│   ├── context/        # Contexte d'authentification et gestion de thème
│   └── lib/            # Client API centralisé, calculs zootechniques et conversions d'unités
│
└── docs/               # Documentation Technique & Références
    ├── API_REFERENCE.md        # Guide de référence des endpoints
    ├── DATA_MODEL.md           # Modélisation détaillée des entités
    ├── UNITS_AND_MEASUREMENTS.md # Norme des unités avicoles (plateaux de 30, sacs 50kg)
    ├── openapi.json            # Spécification OpenAPI 3.1
    └── postman/                # Collection Postman prête à l'emploi
```

---

## 🚀 Démarrage Rapide en Local

### Prérequis
- **PHP 8.4+** avec extensions `pdo_mysql`, `sodium`, `openssl`, `mbstring`.
- **Composer** (v2+).
- **Node.js 20+** et **npm**.
- **MySQL 8.4+**.
- **Symfony CLI** (recommandé).

---

### 1. Backend API (Symfony)

```bash
cd api

# Installer les dépendances
composer install

# Configurer l'environnement dans .env.local
# DATABASE_URL="mysql://user:password@127.0.0.1:3306/lefermier?serverVersion=8.4.0"

# Générer les clés cryptographiques JWT RSA-4096
php bin/console lexik:jwt:generate-keypair

# Exécuter les migrations de base de données
php bin/console doctrine:migrations:migrate --no-interaction

# Lancer le serveur local
symfony serve --port=8000
```

Documentation interactive accessible sur :
- **Scalar Reference** : `http://127.0.0.1:8000/api/docs`
- **Swagger UI** : `http://127.0.0.1:8000/api/docs/swagger`
- **Spécification OpenAPI** : `http://127.0.0.1:8000/api/openapi.json`

---

### 2. Client Web (Next.js)

```bash
cd web

# Installer les dépendances
npm install

# Démarrer en mode développement
npm run dev
```

L'application web est accessible sur `http://localhost:3000`.

---

## 📖 Documentation & Guides

Pour plus de détails techniques, consultez le dossier [`docs/`](docs/) :
- [Guide de Référence Développeur](docs/API_REFERENCE.md)
- [Modèle de Données & Relations Doctrine](docs/DATA_MODEL.md)
- [Spécification des Unités de Mesure Avicoles](docs/UNITS_AND_MEASUREMENTS.md)
- [Architecture & Principes Directeurs](docs/ARCHITECTURE.md)
- [Règles Fondamentales du Projet](docs/PROJECT_RULES.md)

---

## 📄 Licence

Propriété exclusive — Tous droits réservés.
Projet développé pour **Lefermier Bénin**.
