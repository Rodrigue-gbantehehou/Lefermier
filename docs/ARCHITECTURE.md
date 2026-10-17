# ARCHITECTURE — LOGICIEL DE GESTION AVICOLE

**Fichier :** `ARCHITECTURE.md`  
**Statut :** Référence technique obligatoire  
**Priorité actuelle :** API backend et application web  
**Application mobile :** Prévue ultérieurement avec Flutter

---

## 1. Objectif

Ce document définit l'architecture technique, les responsabilités des différentes couches, les règles de communication et les principes de sécurité du logiciel de gestion avicole.

Le logiciel doit être conçu comme un produit commercial générique, utilisable par des exploitations de tailles différentes et adapté aux élevages de poulets de chair, de pondeuses ou mixtes.

L'architecture doit permettre d'ajouter des fonctionnalités sans fragiliser les modules existants, de maintenir une base de code compréhensible et de faire évoluer le produit dans le temps.

### Principes fondamentaux

1. L'API backend est la source de vérité pour les données et les règles métier.
2. L'application web est le premier client à développer.
3. L'application Flutter sera ajoutée ultérieurement et consommera la même API.
4. Les règles métier ne doivent pas être dupliquées dans les clients.
5. Les données de chaque exploitation doivent être protégées contre les accès non autorisés.
6. Les modules doivent être organisés par domaine fonctionnel.
7. Toute complexité architecturale doit répondre à un besoin réel.
8. Les migrations, validations et tests doivent accompagner les évolutions importantes.
9. L'architecture existante doit être examinée avant toute modification structurelle.
10. Aucune technologie ou dépendance ne doit être ajoutée sans justification.

---

## 2. Architecture générale

Le système repose sur une architecture client-serveur avec une API centralisée.

```text
                    UTILISATEURS
                         |
              +----------+----------+
              |                     |
        APPLICATION WEB       APPLICATION MOBILE
          Next.js                  Flutter
          PRIORITÉ                 PLUS TARD
              |                     |
              +----------+----------+
                         |
                      HTTPS
                         |
                  API BACKEND
                     Symfony
                         |
             +-----------+-----------+
             |           |           |
          Sécurité    Services    Validation
                       métier
             |           |           |
             +-----------+-----------+
                         |
                    Repositories
                         |
                    Base de données
```

Les deux clients peuvent proposer des interfaces différentes, mais ils doivent partager les mêmes règles métier et les mêmes contrats API.

### Responsabilités

**Backend Symfony**

- Authentification et autorisation.
- Validation des données métier.
- Application des règles métier.
- Gestion des transactions.
- Calculs métier faisant autorité.
- Contrôle de l'accès aux exploitations.
- Persistance et intégrité des données.
- Journalisation des opérations importantes.
- Exposition et documentation de l'API.

**Frontend Next.js**

- Affichage et navigation.
- Formulaires et interactions.
- Présentation des données de l'API.
- Gestion des états de chargement et des erreurs.
- Validation ergonomique des formulaires.
- Adaptation responsive.
- Gestion de session selon le mécanisme d'authentification retenu.

**Application Flutter future**

- Expérience mobile.
- Consommation des mêmes contrats API.
- Présentation et validation ergonomique adaptées au mobile.
- Gestion appropriée des états de connexion et, si nécessaire, de la connectivité limitée.

Flutter ne doit pas devenir une seconde implémentation du backend.

---

## 3. Organisation du dépôt

L'organisation suivante constitue la structure cible si le dépôt peut raisonnablement l'adopter.

```text
Lefermier/
├── PROJECT_RULES.md
├── ARCHITECTURE.md
├── docs/
│   ├── DESIGN_SYSTEM.md
│   ├── API_CONVENTIONS.md
│   ├── DATA_MODEL.md
│   └── decisions/
├── api/
│   └── Symfony
└── web/
    └── Next.js
```

Le répertoire Flutter pourra être ajouté ultérieurement :

```text
mobile/
└── Flutter
```

Cette structure est indicative. Si le projet existe déjà avec une autre organisation, ne pas déplacer les fichiers ou réécrire les configurations uniquement pour correspondre à cet exemple.

Avant toute décision, inspecter le dépôt, les fichiers de configuration, les dépendances et le code existant.

---

## 4. Architecture du backend Symfony

### 4.1. Organisation par domaines métier

Le backend doit être organisé de manière à rendre les responsabilités faciles à identifier.

Les domaines fonctionnels envisagés sont :

- Gestion des exploitations.
- Utilisateurs, rôles et permissions.
- Bâtiments et équipements.
- Bandes et effectifs.
- Production.
- Alimentation et consommation.
- Stocks et approvisionnements.
- Santé animale et traitements.
- Ventes et clients.
- Achats et fournisseurs.
- Dépenses et finances.
- Rapports et indicateurs.

Ces domaines constituent une cible fonctionnelle, pas une obligation de créer immédiatement tous les modules.

Chaque module doit être développé lorsque ses besoins, ses règles métier et ses dépendances sont suffisamment définis.

### 4.2. Responsabilités des couches

L'architecture doit distinguer les responsabilités suivantes :

**Contrôleurs API**

- Recevoir les requêtes HTTP.
- Vérifier les paramètres de transport et déclencher les contrôles appropriés.
- Appeler les services applicatifs.
- Retourner des réponses HTTP cohérentes.
- Ne pas contenir de logique métier complexe.

**Services applicatifs et métier**

- Orchestrer les opérations.
- Appliquer les règles métier.
- Vérifier les préconditions.
- Coordonner les changements de données.
- Gérer les transactions lorsqu'une opération implique plusieurs écritures.

**Entités et modèles métier**

- Représenter les objets métier et leurs invariants.
- Définir les relations et les contraintes pertinentes.
- Éviter de dépendre directement des détails de présentation du frontend.

**Repositories**

- Encapsuler les requêtes de persistance.
- Fournir les données nécessaires aux services.
- Éviter de disperser les requêtes complexes dans les contrôleurs.

**DTO et validation**

- Définir les données entrantes et sortantes lorsque cela est pertinent.
- Valider les entrées selon leur usage.
- Éviter d'exposer directement des entités Doctrine complètes.
- Ne pas accepter aveuglément des champs sensibles envoyés par le client.

**Sécurité**

- Authentifier les utilisateurs.
- Autoriser les opérations.
- Contrôler l'accès aux ressources.
- Appliquer les règles d'isolation des exploitations.

### 4.3. Règle de dépendance

Les contrôleurs ne doivent pas devenir des conteneurs de logique métier.

Les services métier ne doivent pas dépendre des composants React ou Flutter.

Les réponses HTTP ne doivent pas dicter la structure interne des entités métier.

Éviter la création de couches supplémentaires sans besoin démontré. L'objectif est une séparation claire des responsabilités, pas la multiplication des abstractions.

---

## 5. Architecture de l'application web Next.js

### 5.1. Responsabilités

L'application web doit être organisée autour des pages, des composants partagés et des domaines fonctionnels.

Elle doit :

- Consommer exclusivement les interfaces prévues par l'API pour les opérations métier.
- Présenter les informations de manière cohérente.
- Réutiliser les composants UI et métier.
- Gérer les états de chargement, les erreurs et les données absentes.
- Contrôler l'affichage des actions selon les permissions connues.
- Rester responsive et accessible.

Le frontend ne doit jamais se connecter directement à la base de données du backend.

### 5.2. Structure indicative

```text
web/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   └── (dashboard)/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── shared/
│   │   └── data-display/
│   ├── features/
│   │   ├── farms/
│   │   ├── flocks/
│   │   ├── production/
│   │   ├── inventory/
│   │   ├── health/
│   │   ├── sales/
│   │   └── finance/
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   └── utils/
│   └── types/
└── ...
```

Cette structure doit être adaptée aux conventions réelles de Next.js et à la version utilisée. Ne pas créer des dossiers vides pour des modules qui ne sont pas encore développés.

### 5.3. Composants et fonctionnalités

- Les composants génériques vont dans `components/ui` ou les catégories partagées appropriées.
- Les composants métier restent dans le domaine qui les utilise.
- Les pages orchestrent les composants et les données nécessaires.
- Les services API centralisent les appels réseau.
- Les types partagés décrivent les contrats consommés par le frontend.
- Les fonctions utilitaires doivent avoir une responsabilité claire.

Consulter `docs/DESIGN_SYSTEM.md` avant de créer ou modifier une interface.

### 5.4. Gestion des données

- Ne pas multiplier les requêtes identiques.
- Ne pas déclencher des appels réseau involontaires à chaque rendu.
- Utiliser un mécanisme cohérent de récupération et de mise à jour des données.
- Après une mutation, actualiser ou invalider les données concernées.
- Ne pas afficher une opération comme réussie avant d'avoir reçu la confirmation appropriée.
- Préserver les saisies de l'utilisateur en cas d'erreur lorsque cela est possible.

Le choix d'une bibliothèque de gestion de données côté client doit être justifié par les besoins et la stack existante.

---

## 6. Contrats API

L'API constitue le contrat commun entre le backend et ses clients.

### 6.1. Principes

- Utiliser HTTPS en environnement déployé.
- Adopter des conventions de routes et de méthodes HTTP cohérentes.
- Documenter les endpoints.
- Définir les paramètres, corps de requêtes et réponses attendues.
- Distinguer les erreurs de validation, d'authentification, d'autorisation et les erreurs serveur.
- Ne pas exposer des informations internes sensibles dans les messages d'erreur.
- Prévoir une stratégie de versionnement si des changements incompatibles deviennent nécessaires.

Le choix entre des préfixes versionnés, par exemple `/api/v1`, et une autre convention doit être fixé dans les conventions API avant que l'application ne dépende d'un grand nombre de routes.

### 6.2. Documentation

Utiliser OpenAPI pour décrire l'API, si la stack retenue le permet de manière fiable.

La documentation doit refléter les endpoints réellement implémentés. Ne pas déclarer comme disponible une fonctionnalité qui n'existe pas encore.

Les contrats doivent préciser :

- Les champs obligatoires et facultatifs.
- Les formats de dates.
- Les unités de mesure.
- Les règles de pagination.
- Les codes HTTP.
- Les formats d'erreur.
- Les contraintes d'accès.

### 6.3. Types frontend

Les types TypeScript doivent être cohérents avec les contrats API.

Lorsque c'est pertinent, générer les types depuis la spécification OpenAPI pour limiter les divergences.

Ne pas dupliquer manuellement des modèles de données complexes dans plusieurs endroits sans mécanisme de contrôle.

---

## 7. Base de données et intégrité

Le choix du moteur doit être confirmé en examinant le projet existant. Si aucun moteur n'est encore choisi, comparer les besoins et les contraintes d'hébergement avant de décider.

### Principes obligatoires

- Utiliser des migrations versionnées.
- Définir les relations et contraintes d'intégrité nécessaires.
- Éviter les suppressions en cascade non maîtrisées.
- Définir les index selon les requêtes réelles et les volumes attendus.
- Utiliser des transactions pour les opérations métier qui doivent être atomiques.
- Prévoir les stratégies de sauvegarde et de restauration.
- Ne pas modifier la structure de production manuellement sans procédure contrôlée.
- Ne pas supprimer ou réécrire des données existantes sans autorisation et vérification.

### Données sensibles

Les informations d'authentification et les secrets ne doivent jamais être stockés en clair.

Les données commerciales, les informations personnelles et les données financières doivent être accessibles uniquement aux utilisateurs autorisés.

Les règles de conservation et de suppression des données doivent être définies en fonction des besoins réels et des obligations applicables.

---

## 8. Multi-exploitation et isolation des données

Le produit est destiné à plusieurs clients. L'isolation des données est donc une exigence architecturale fondamentale.

### 8.1. Principe

Chaque exploitation ou organisation doit accéder uniquement aux données auxquelles elle est autorisée.

L'isolation doit être appliquée dans le backend, pas uniquement dans l'interface.

Un utilisateur ne doit pas pouvoir accéder aux données d'une autre exploitation en modifiant un identifiant dans une URL, une requête API ou un corps de requête.

### 8.2. Modèle d'accès

Le modèle de données doit distinguer, lorsque le besoin le justifie :

- L'organisation cliente.
- Une ou plusieurs exploitations.
- Les utilisateurs.
- Les appartenances et rôles.
- Les ressources métier rattachées à une exploitation.

Les relations exactes doivent être définies dans `docs/DATA_MODEL.md` avant l'implémentation des modules concernés.

### 8.3. Vérifications obligatoires

Pour chaque opération sur une ressource :

1. Authentifier l'utilisateur.
2. Déterminer le contexte d'exploitation autorisé.
3. Vérifier son accès à la ressource.
4. Vérifier la permission requise.
5. Exécuter l'opération dans le contexte autorisé.
6. Retourner une réponse ne révélant pas de données non autorisées.

Les contrôles doivent être réalisés aussi bien en lecture qu'en création, modification, export et suppression.

Les identifiants fournis par le client ne constituent jamais une preuve d'autorisation.

### 8.4. Tests d'isolation

Prévoir des tests avec au moins deux exploitations distinctes et des utilisateurs ayant des accès différents.

Vérifier qu'un utilisateur ne peut ni lire, ni modifier, ni supprimer les données d'une autre exploitation sans permission explicite.

---

## 9. Authentification et permissions

Le mécanisme d'authentification doit être choisi après examen des clients, de l'hébergement et des contraintes de sécurité.

Ne pas imposer JWT ou les sessions par habitude. Choisir une solution adaptée, documentée et cohérente entre l'API et l'application web.

### Exigences

- Stocker les mots de passe avec un mécanisme de hachage sécurisé adapté au framework.
- Protéger les routes privées.
- Vérifier les permissions côté serveur.
- Prévoir les procédures de connexion, déconnexion et récupération d'accès.
- Limiter les possibilités d'abus sur les opérations sensibles.
- Protéger les mécanismes de renouvellement ou de révocation des sessions.
- Ne pas stocker les secrets dans le dépôt.
- Ne pas exposer de jetons ou d'identifiants sensibles dans les journaux.

Si des cookies sont utilisés pour l'authentification, configurer leurs attributs de sécurité et les protections CSRF appropriées.

Si des jetons sont utilisés, définir leur durée de vie, leur stockage, leur renouvellement et leur révocation.

Les rôles définitifs doivent découler des besoins fonctionnels validés. Ne pas créer une matrice de permissions complexe avant de connaître les opérations réelles.

---

## 10. Règles métier et calculs

Les règles métier doivent être centralisées dans le backend.

Cela concerne notamment :

- Les effectifs des bandes.
- Les mortalités et les pertes.
- La consommation alimentaire.
- Les mouvements de stock.
- La production d'œufs.
- Les traitements et vaccinations.
- Les ventes et les achats.
- Les recettes, les dépenses et les marges.
- Les rapports et les indicateurs calculés.

### Principes

- Définir chaque indicateur avant son implémentation.
- Préciser sa formule, ses unités, sa période et les données utilisées.
- Distinguer une valeur enregistrée d'une valeur calculée.
- Définir le traitement des données manquantes.
- Prévenir les doubles enregistrements.
- Utiliser des transactions pour maintenir la cohérence.
- Ne pas autoriser les clients à imposer directement des résultats calculés qui doivent être vérifiés par le serveur.

Les formules métier ne doivent pas être inventées par l'assistant IA. Lorsqu'une définition manque, elle doit être signalée avant l'implémentation.

---

## 11. Cohérence des opérations et historique

Certaines opérations peuvent avoir des conséquences importantes : mouvements de stock, corrections d'effectifs, ventes, encaissements et suppressions.

Pour ces opérations :

- Définir les préconditions.
- Vérifier les droits nécessaires.
- Éviter les doublons involontaires.
- Garantir l'intégrité des écritures liées.
- Prévoir une trace des modifications lorsque la nature de l'opération le justifie.
- Définir les possibilités de correction ou d'annulation.

Ne pas permettre de modifier silencieusement un historique financier ou un mouvement de stock lorsqu'une traçabilité est nécessaire.

La journalisation métier ne doit pas enregistrer de mots de passe, de jetons ou d'autres secrets.

---

## 12. Gestion des erreurs et observabilité

Les erreurs doivent être gérées de manière cohérente à travers le backend et le frontend.

### Backend

- Retourner des codes HTTP appropriés.
- Valider les entrées.
- Enregistrer les erreurs techniques utiles au diagnostic.
- Ne pas exposer les traces de pile ou les détails internes en production.
- Distinguer les erreurs attendues des erreurs imprévues.

### Frontend

- Afficher un message compréhensible.
- Préserver les données saisies si possible.
- Permettre une nouvelle tentative lorsque cela est pertinent.
- Ne pas présenter un échec comme une réussite.
- Éviter de révéler des détails techniques inutiles à l'utilisateur.

La configuration des journaux doit permettre le diagnostic sans exposer de données sensibles.

---

## 13. Tests et qualité

Les tests doivent couvrir les règles importantes et les frontières entre les couches.

### Backend

- Tests unitaires pour les règles métier complexes.
- Tests fonctionnels des endpoints.
- Tests de validation.
- Tests des permissions.
- Tests d'isolation entre exploitations.
- Tests des transactions et opérations critiques.

### Frontend

- Tests des composants partagés importants.
- Tests des formulaires et interactions.
- Tests des états de chargement et d'erreur.
- Tests des parcours utilisateur essentiels.
- Vérifications responsive et accessibilité lorsque les outils le permettent.

### Tests de bout en bout

Ajouter des tests de bout en bout pour les parcours critiques lorsque l'infrastructure le permet : connexion, création d'une bande, enregistrement d'une opération et consultation des résultats.

Ne pas se limiter à vérifier que le code compile. Un endpoint qui répond mais applique incorrectement une règle métier n'est pas considéré comme fonctionnel.

---

## 14. Configuration et environnements

Distinguer les environnements de développement, de test et de production.

- Les secrets doivent être fournis par une configuration sécurisée.
- Les fichiers contenant des secrets ne doivent pas être versionnés.
- Les configurations de production ne doivent pas exposer le mode debug.
- Les migrations doivent être exécutées selon une procédure contrôlée.
- Les données de test ne doivent pas contaminer les données réelles.
- Les dépendances doivent être verrouillées selon les conventions du gestionnaire utilisé.
- Les changements de configuration doivent être documentés lorsqu'ils affectent le déploiement.

Ne jamais modifier une configuration de production sans comprendre ses conséquences et disposer d'une stratégie de retour arrière adaptée.

---

## 15. Performance et évolutivité

L'application doit rester réactive à mesure que le nombre de clients, de bandes et d'opérations augmente.

### Principes

- Paginer les grandes listes.
- Éviter les requêtes répétitives et les problèmes de type N+1.
- Ajouter des index en fonction des requêtes observées.
- Limiter les données renvoyées par l'API au besoin réel du client.
- Optimiser les images et les ressources frontend.
- Éviter les calculs lourds répétés dans les composants.
- Mettre en cache uniquement lorsque les règles d'invalidation sont comprises.
- Mesurer les problèmes avant d'introduire une architecture distribuée.

Ne pas ajouter de microservices, de file de messages, de cache distribué ou d'infrastructure complexe sans besoin concret.

Commencer par une architecture modulaire simple, bien testée et suffisamment isolée pour évoluer.

---

## 16. Préparation de l'application Flutter

Flutter sera développé après stabilisation des fondations API et des principaux parcours web.

L'application mobile devra :

- Utiliser les mêmes endpoints métier.
- Respecter les mêmes règles d'autorisation.
- Utiliser les mêmes définitions d'indicateurs.
- Respecter les formats et contrats de données documentés.
- Gérer correctement les erreurs et les interruptions réseau.
- Ne pas accéder directement à la base de données.

Les fonctionnalités propres au mobile, comme la gestion locale de certaines données ou la synchronisation différée, nécessiteront une conception spécifique si elles deviennent nécessaires.

Ne pas développer maintenant les écrans Flutter, ses composants ou sa configuration, sauf demande explicite.

---

## 17. Ordre de développement

Le développement doit suivre une progression fonctionnelle, en validant chaque étape avant d'élargir le périmètre.

### Phase 1 — Audit et fondations

- Examiner le dépôt.
- Identifier les technologies et versions installées.
- Vérifier les conventions existantes.
- Confirmer l'architecture et le modèle de données initial.
- Définir l'authentification et l'isolation des exploitations.
- Préparer les contrats API et les mécanismes de test.

### Phase 2 — Première tranche fonctionnelle

- Mettre en place une authentification fonctionnelle.
- Mettre en place les permissions nécessaires.
- Définir le contexte d'exploitation.
- Construire une première fonctionnalité métier complète, de l'API jusqu'à l'interface web.
- Tester le parcours réel et ses erreurs.

### Phase 3 — Socle web

- Stabiliser la navigation.
- Construire les composants partagés nécessaires.
- Appliquer `docs/DESIGN_SYSTEM.md`.
- Mettre en place la gestion centralisée des appels API.
- Vérifier les états de chargement, d'erreur et d'absence de données.

### Phase 4 — Modules métier

Développer les modules selon les priorités fonctionnelles validées. Chaque module doit être opérationnel et testé avant de passer au suivant.

### Phase 5 — Préparation mobile

- Vérifier la stabilité des contrats API.
- Documenter les parcours et les permissions.
- Préparer les besoins propres au mobile.
- Commencer Flutter uniquement après validation de cette étape.

---

## 18. Procédure obligatoire pour l'assistant IA

Avant toute modification importante :

1. Lire les règles de `PROJECT_RULES.md`.
2. Consulter ce document pour les décisions architecturales.
3. Consulter `docs/DESIGN_SYSTEM.md` pour les interfaces web.
4. Examiner les fichiers réellement présents.
5. Identifier les composants, services, entités et contrats existants.
6. Vérifier les dépendances et leurs versions.
7. Définir le périmètre précis de la modification.
8. Préserver les fonctionnalités existantes.
9. Implémenter la solution la plus simple qui respecte les règles.
10. Exécuter les tests et vérifications pertinents.
11. Signaler les changements de schéma, de configuration et les décisions structurantes.

L'assistant ne doit jamais prétendre avoir exécuté un test, une migration ou un déploiement qu'il n'a pas réellement effectué.

### En cas de contradiction ou d'incertitude

- Ne pas inventer une règle métier.
- Ne pas supprimer une fonctionnalité existante sans autorisation.
- Ne pas réécrire l'architecture sans justification.
- Ne pas ajouter une dépendance uniquement par préférence.
- Signaler toute décision importante qui manque.
- Demander une clarification uniquement lorsque l'incertitude empêche une implémentation correcte.

---

## 19. Critères d'acceptation technique

Une fonctionnalité est considérée comme terminée lorsque :

- [ ] Elle respecte l'architecture et les responsabilités des couches.
- [ ] Les données sont validées côté serveur.
- [ ] Les permissions sont vérifiées côté serveur.
- [ ] L'isolation des exploitations est respectée.
- [ ] Les erreurs sont gérées proprement.
- [ ] Les règles métier sont centralisées et cohérentes.
- [ ] Les tests pertinents ont été exécutés.
- [ ] La documentation est actualisée si nécessaire.
- [ ] L'interface respecte le design system.
- [ ] Les fonctionnalités existantes ne sont pas régressées.

---

## 20. Règle finale

L'architecture doit soutenir le produit, et non devenir une source de complexité inutile.

Toute décision doit privilégier :

- La sécurité des données.
- La cohérence métier.
- La réutilisation pertinente.
- La simplicité de maintenance.
- La testabilité.
- La possibilité d'évolution.

**Principe directeur : une API fiable, des responsabilités claires, une interface cohérente et aucune duplication inutile de la logique métier.**