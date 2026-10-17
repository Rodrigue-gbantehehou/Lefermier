# RÈGLES FONDAMENTALES DU PROJET — LOGICIEL DE GESTION AVICOLE

**Document de référence : architecture, structure des pages, design system et règles de développement**

Version : 1.0  
Statut : référence obligatoire du projet  
Objectif : développer un logiciel de gestion avicole commercialisable, fiable, cohérent, évolutif et facile à utiliser.

---

# 1. MISSION ET VISION DU PRODUIT

Le produit est un logiciel généraliste de gestion d'exploitations avicoles destiné au marché béninois, puis extensible à d'autres marchés.

Il doit convenir :
- Aux petits éleveurs.
- Aux exploitations de taille moyenne.
- Aux grandes exploitations professionnelles.
- Aux élevages de poulets de chair, de poules pondeuses et aux élevages mixtes.

Le produit doit permettre de gérer une ou plusieurs exploitations selon les droits de l'utilisateur, sans mélanger les données des clients.

Le logiciel comprend deux interfaces clientes :
1. Une application web responsive.
2. Une application mobile.

Les deux interfaces utilisent une architecture de données et des règles métier cohérentes, avec une API commune lorsque l'architecture retenue le permet.

## Objectifs prioritaires

1. Simplifier la gestion quotidienne d'une ferme.
2. Fiabiliser le suivi des effectifs, des stocks et des opérations.
3. Comprendre les coûts, les ventes et la rentabilité.
4. Réduire les erreurs de saisie et les pertes de données.
5. Rendre les informations importantes immédiatement compréhensibles.
6. Proposer un produit commercialisable, maintenable et évolutif.

Le logiciel n'est pas un simple tableau de bord décoratif. Chaque fonctionnalité doit répondre à un besoin opérationnel réel.

# 2. HIÉRARCHIE DES RÈGLES

En cas de conflit entre plusieurs instructions, respecter cet ordre :

1. Sécurité, confidentialité et intégrité des données.
2. Présent document de référence.
3. Architecture technique officiellement validée.
4. Règles métier documentées.
5. Design system et conventions d'interface.
6. Spécification de la fonctionnalité en cours.
7. Préférences ponctuelles de l'utilisateur, lorsqu'elles ne contredisent pas les règles précédentes.

Aucune demande ponctuelle ne doit provoquer silencieusement une refonte générale du projet.

Si une instruction exige de modifier une règle fondamentale, présenter le conflit, ses conséquences et la solution proposée avant de procéder.

Ne jamais interpréter une ambiguïté comme une autorisation de réinventer le produit.

# 3. RÈGLES DE TRAVAIL OBLIGATOIRES POUR L'IA

Avant chaque tâche de développement :

1. Examiner le code existant et les fichiers de configuration concernés.
2. Lire les règles du projet et les décisions techniques déjà prises.
3. Identifier les fonctionnalités, composants, services et modèles existants qui peuvent être réutilisés.
4. Déterminer les conséquences de la modification sur les autres parties du système.
5. Définir précisément le résultat attendu et les critères de validation.
6. Effectuer uniquement les modifications nécessaires à la tâche.

Après chaque tâche :

1. Vérifier les changements effectués.
2. Exécuter les tests adaptés à la modification.
3. Vérifier les erreurs de compilation, de typage, de lint ou de migration lorsque ces outils existent.
4. Signaler les tests exécutés, leurs résultats et les éventuels points non vérifiés.
5. Mettre à jour la documentation et les décisions techniques concernées.

## Interdictions

- Ne pas recréer une fonctionnalité qui existe déjà sans justification.
- Ne pas remplacer une bibliothèque ou une technologie sans décision validée.
- Ne pas modifier arbitrairement les conventions de nommage.
- Ne pas inventer des données métier pour rendre une interface visuellement attractive.
- Ne pas supprimer du code existant sans comprendre son rôle.
- Ne pas masquer une erreur en ajoutant une solution temporaire non documentée.
- Ne pas introduire de dépendance inutile.
- Ne pas laisser des boutons sans action réelle.
- Ne pas simuler une sauvegarde ou un succès lorsque l'opération a échoué.
- Ne pas considérer une page terminée simplement parce qu'elle est visuellement réussie.

Si une information essentielle manque, poser une question ciblée. Pour une décision technique réversible et peu risquée, proposer un choix raisonnable et le documenter.

# 4. ARCHITECTURE GÉNÉRALE DU PRODUIT

Le logiciel doit séparer clairement les responsabilités.

## 4.1. Architecture logique

Organiser le système autour de responsabilités distinctes :

**Interface utilisateur**
- Pages.
- Composants.
- Formulaires.
- Navigation.
- Présentation des données.
- États de chargement et d'erreur.

**Couche applicative**
- Cas d'utilisation.
- Orchestration des opérations.
- Autorisations d'accès.
- Validation des commandes.
- Gestion des transactions nécessaires.

**Couche métier**
- Règles de gestion avicole.
- Calculs de production.
- Gestion des mouvements de stock.
- Calculs financiers.
- Contraintes de cohérence.

**Couche de persistance et d'intégration**
- Base de données.
- Dépôts de données.
- API.
- Services externes.
- Synchronisation mobile.
- Journalisation et tâches asynchrones si nécessaires.

Les noms et les dossiers précis seront adaptés à la technologie existante. Cette séparation fonctionnelle demeure obligatoire, sans imposer une architecture excessivement complexe.

## 4.2. Choix technologiques

Avant de choisir ou de modifier la stack, inspecter le dépôt existant.

Produire une décision technique documentée qui précise :
- Le framework frontend.
- Le framework backend.
- Le système de base de données.
- La technologie mobile.
- La stratégie de communication avec l'API.
- La gestion de l'authentification.
- La stratégie de déploiement.
- Les possibilités de fonctionnement hors connexion.

Ne pas réécrire un projet fonctionnel uniquement pour utiliser une technologie préférée par l'IA.

Pour un nouveau projet, privilégier des technologies éprouvées, maintenables et adaptées aux compétences de l'équipe, aux coûts d'hébergement et aux besoins du produit.

## 4.3. Application web et application mobile

L'API doit constituer le point de référence pour les règles métier et les données partagées.

Les applications web et mobile doivent utiliser les mêmes règles de validation métier et les mêmes conventions de données.

Ne pas dupliquer les calculs critiques dans les interfaces clientes.

Les différences entre les interfaces doivent rester limitées à l'expérience d'utilisation, à la navigation et aux capacités propres à chaque appareil.

Le mode hors connexion doit être conçu explicitement :
- Identifier les opérations autorisées hors connexion.
- Définir les données conservées localement.
- Prévoir la synchronisation.
- Détecter les conflits.
- Éviter les doublons lors des nouvelles tentatives.
- Indiquer clairement à l'utilisateur ce qui est synchronisé ou en attente.

Ne pas annoncer un fonctionnement hors connexion complet si cette capacité n'a pas été développée et testée.

# 5. MULTI-EXPLOITATIONS ET SÉCURITÉ DES DONNÉES

Le produit est destiné à plusieurs clients indépendants.

Le modèle de données doit donc prévoir une séparation stricte des exploitations et des organisations, selon le modèle commercial retenu.

Règles obligatoires :

- Un utilisateur ne consulte que les ressources auxquelles il est autorisé à accéder.
- Chaque requête sensible vérifie les permissions côté serveur.
- Les identifiants fournis par le client ne constituent jamais une preuve d'autorisation.
- Les requêtes, exports, rapports, fichiers et recherches doivent respecter l'isolation des clients.
- Les opérations sensibles doivent être journalisées.
- Les mots de passe et secrets ne sont jamais stockés en clair.
- Les secrets ne doivent jamais être exposés dans le frontend.
- Les données de démonstration doivent être clairement distinguées des données réelles.

Prévoir des rôles configurables selon les besoins : propriétaire, administrateur d'exploitation, gestionnaire, magasinier, responsable de production et comptable, par exemple.

Ne pas imposer tous ces rôles à chaque client. Les permissions doivent dépendre des responsabilités et des fonctionnalités souscrites.

Le modèle commercial, les limites des offres et les autorisations doivent être centralisés et documentés, pas dispersés dans les composants d'interface.

# 6. STRUCTURE FONCTIONNELLE DES PAGES

La navigation doit refléter les tâches réelles d'un éleveur.

## 6.1. Espace public

- Présentation du produit.
- Fonctionnalités.
- Formules et tarifs.
- Création de compte.
- Connexion.
- Réinitialisation du mot de passe.
- Conditions d'utilisation.
- Politique de confidentialité.

L'espace public doit rester distinct de l'application de gestion.

## 6.2. Espace de gestion

### A. Tableau de bord

Objectif : comprendre rapidement la situation de l'exploitation.

Indicateurs possibles :
- Effectif actuel.
- Mortalité sur une période.
- Consommation d'aliments.
- Production d'œufs, si applicable.
- Ventes.
- Dépenses.
- Résultats financiers sur une période définie.
- Alertes importantes.
- Opérations récentes.

Les indicateurs doivent dépendre du type d'élevage et des données réellement disponibles.

Ne jamais afficher un taux, un bénéfice ou un total calculé à partir de données manquantes sans signaler cette limite.

### B. Exploitations et bâtiments

- Liste des exploitations accessibles.
- Informations générales.
- Bâtiments et espaces d'élevage.
- Configuration des unités.
- Paramètres propres à l'exploitation.

### C. Bandes et élevages

- Liste des bandes.
- Création d'une bande.
- Fiche détaillée.
- Effectif initial et actuel.
- Espèce, souche et type de production.
- Dates et cycle d'élevage.
- Entrées, sorties et mortalité.
- Historique des opérations.

### D. Stocks et approvisionnements

- Vue générale des stocks.
- Aliments.
- Médicaments et produits sanitaires.
- Autres fournitures.
- Réceptions.
- Consommations.
- Pertes et ajustements.
- Fournisseurs.
- Seuils d'alerte.
- Historique des mouvements.

### E. Santé animale

- Registre sanitaire.
- Vaccinations.
- Traitements.
- Observations et mortalité.
- Calendrier des opérations.
- Historique par bande.

Le logiciel enregistre et organise les informations. Il ne doit pas présenter des diagnostics vétérinaires automatisés comme des certitudes médicales.

### F. Production

- Saisie de la production quotidienne.
- Production d'œufs pour les pondeuses.
- Suivi des performances.
- Pertes et produits déclassés.
- Historique par bande et par période.

### G. Ventes et clients

- Clients.
- Produits commercialisés.
- Enregistrement des ventes.
- Quantités.
- Prix.
- Paiements.
- Montants restant dus.
- Historique et justificatifs.

### H. Achats et dépenses

- Achats.
- Charges courantes.
- Fournisseurs.
- Paiements.
- Pièces justificatives.
- Catégories de dépenses.
- Historique.

### I. Finance et rapports

- Recettes.
- Dépenses.
- Créances et dettes suivies par le logiciel.
- Marges et résultats selon une méthode documentée.
- Rapports par période.
- Exports et impressions.

Distinguer les flux de trésorerie, les montants facturés et le résultat économique. Ne pas assimiler automatiquement les ventes encaissées au bénéfice.

### J. Utilisateurs et paramètres

- Membres et invitations.
- Rôles et permissions.
- Profil utilisateur.
- Paramètres de l'exploitation.
- Unités et préférences.
- Préférences de notification.
- Abonnement et facturation.
- Sécurité du compte.

Cette liste définit la carte fonctionnelle cible, pas une obligation de développer tous les modules dans la première version.

# 7. STRUCTURE STANDARD DES PAGES

Toute page doit respecter une structure cohérente.

## 7.1. Pages de consultation

Ordre recommandé :

1. Fil d'Ariane, si nécessaire.
2. Titre explicite.
3. Description courte ou contexte utile.
4. Action principale.
5. Indicateurs pertinents, uniquement si utiles.
6. Barre de recherche et filtres.
7. Tableau ou liste des résultats.
8. Pagination ou chargement progressif si nécessaire.

Ne pas ajouter des cartes statistiques sur toutes les pages par habitude.

## 7.2. Pages de détail

Ordre recommandé :

1. Identité de la ressource.
2. Statut actuel.
3. Actions autorisées.
4. Informations principales.
5. Indicateurs utiles.
6. Historique des opérations.
7. Documents et informations complémentaires.

Les informations critiques doivent être visibles sans obliger l'utilisateur à parcourir de nombreux onglets.

## 7.3. Formulaires

Chaque formulaire doit comporter :
- Un titre et un objectif précis.
- Des champs clairement libellés.
- Les unités de mesure nécessaires.
- Des champs obligatoires identifiés.
- Une validation cohérente.
- Des messages d'erreur compréhensibles.
- Un bouton d'enregistrement explicite.
- Une possibilité d'annulation.
- Une protection contre les doubles soumissions.
- Une confirmation de réussite ou un message d'échec.

Organiser les formulaires longs en sections logiques. Ne pas créer un assistant à plusieurs étapes lorsque quelques champs suffisent.

Les suppressions et opérations irréversibles nécessitent une confirmation adaptée.

## 7.4. États obligatoires

Toute page connectée aux données doit gérer explicitement :

- Chargement.
- Résultats disponibles.
- Liste vide.
- Recherche sans résultat.
- Erreur de chargement.
- Erreur de validation.
- Absence de permission.
- Connexion interrompue.
- Synchronisation en attente, lorsque pertinente.

Un écran blanc ou une liste vide sans explication n'est jamais un état acceptable.

# 8. DESIGN SYSTEM VISUEL

L'interface doit inspirer confiance et donner une impression de produit professionnel.

## 8.1. Direction artistique

Adopter un style :
- Moderne.
- Sobre.
- Professionnel.
- Lisible.
- Fonctionnel.
- Adapté à une utilisation quotidienne.
- Cohérent sur ordinateur et mobile.

Éviter l'apparence d'un tableau de bord générique produit automatiquement.

L'identité visuelle doit être définie une fois et réutilisée partout.

## 8.2. Couleurs

Définir des couleurs centralisées pour :
- Couleur principale.
- Couleur secondaire.
- Arrière-plan général.
- Surfaces et cartes.
- Bordures.
- Texte principal et secondaire.
- Succès.
- Avertissement.
- Erreur.
- Information.

Une palette naturelle inspirée de l'agriculture peut être étudiée, mais elle doit être validée avant d'être généralisée.

Ne jamais choisir des couleurs différentes au hasard pour chaque page.

Les couleurs de statut doivent conserver le même sens dans tout le produit.

## 8.3. Typographie

Définir une famille typographique principale, une échelle de tailles, les graisses et les hauteurs de ligne.

Hiérarchie recommandée :
- Titre de page.
- Titre de section.
- Titre de composant.
- Texte courant.
- Texte secondaire.
- Libellés et métadonnées.

Les données chiffrées doivent être faciles à comparer et les tableaux doivent rester lisibles.

Éviter les titres surdimensionnés, les paragraphes trop longs et les textes secondaires excessivement petits.

## 8.4. Espacements et dimensions

Utiliser une échelle d'espacement centralisée et cohérente.

Définir les dimensions communes :
- Hauteur des champs.
- Taille des boutons.
- Rayon des bordures.
- Largeur des zones de contenu.
- Largeur de la navigation latérale.
- Espacement entre sections.
- Espacement interne des cartes.

Ne pas définir arbitrairement ces dimensions composant par composant.

## 8.5. Composants réutilisables

Créer une bibliothèque commune comprenant notamment :
- Boutons.
- Champs de formulaire.
- Sélecteurs de date.
- Sélecteurs de quantité et d'unité.
- Menus.
- Fenêtres de confirmation.
- Cartes de statistiques.
- Tableaux.
- Badges de statut.
- Alertes.
- Notifications.
- Pagination.
- Filtres.
- Écrans vides.
- Indicateurs de chargement.
- Composants d'erreur.

Avant de créer un nouveau composant, vérifier si un composant existant peut être étendu sans perdre sa cohérence.

Les composants partagés doivent accepter des variantes documentées, et non accumuler des exceptions propres à chaque page.

# 9. RÈGLES DE MISE EN PAGE

## Application web

Prévoir :
- Une navigation latérale structurée.
- Une barre supérieure pour le contexte, le profil et les actions globales utiles.
- Une zone de contenu clairement délimitée.
- Une largeur de lecture maîtrisée.
- Des tableaux adaptés aux données métier.
- Des actions principales immédiatement repérables.

La navigation doit afficher le nom de la section active.

Les menus ne doivent pas contenir de liens vers des fonctionnalités inexistantes ou non accessibles.

## Application mobile

Prévoir une navigation adaptée aux usages tactiles :
- Accès rapide aux opérations quotidiennes.
- Formulaires adaptés aux petits écrans.
- Boutons suffisamment grands.
- Saisie simplifiée des quantités.
- Listes faciles à parcourir.
- Actions importantes accessibles sans manipulations excessives.

Ne pas reproduire mécaniquement la navigation latérale de la version web sur mobile.

Les deux interfaces doivent partager l'identité visuelle sans être des copies rigides l'une de l'autre.

## Responsive design

Tester au minimum :
- Petit écran mobile.
- Grand écran mobile.
- Tablette.
- Ordinateur portable.
- Grand écran.

Les tableaux larges doivent disposer d'une stratégie mobile explicite : colonnes prioritaires, fiches compactes ou défilement horizontal maîtrisé.

Aucun écran ne doit présenter de débordement incontrôlé.

# 10. RÈGLES MÉTIER ET INTÉGRITÉ DES DONNÉES

Toute opération métier doit être cohérente avec les opérations précédentes.

Exemples :
- Une sortie de stock doit être enregistrée comme un mouvement traçable.
- La consommation d'aliments ne doit pas être confondue avec un achat.
- La mortalité doit affecter l'effectif de la bande concernée.
- Une vente doit conserver les quantités, les prix et les paiements associés.
- Une correction de stock doit conserver un motif et un historique adaptés.
- Les calculs financiers doivent utiliser des définitions documentées.

Ne pas modifier arbitrairement l'effectif, le stock ou les paiements sans conserver la traçabilité nécessaire.

Définir des règles explicites pour les arrondis, les unités, les dates, les fuseaux horaires et les devises.

Le FCFA doit être pris en charge dès la conception, sans empêcher l'ajout ultérieur d'autres devises.

Les opérations critiques doivent utiliser des transactions de base de données lorsque cela est nécessaire pour garantir la cohérence.

Les calculs importants doivent être testés avec des cas normaux, des valeurs limites et des données incohérentes.

# 11. RÈGLES UX ET ACCESSIBILITÉ

Le logiciel doit être utilisable par des personnes ayant des niveaux de maîtrise numérique différents.

- Employer un français simple et professionnel.
- Utiliser des libellés concrets liés aux activités avicoles.
- Expliquer les termes techniques lorsque nécessaire.
- Ne pas obliger l'utilisateur à connaître le fonctionnement interne du logiciel.
- Préférer les valeurs par défaut pertinentes aux formulaires inutilement complexes.
- Préserver les données saisies en cas d'erreur de validation.
- Rendre les erreurs compréhensibles et actionnables.
- Ne pas utiliser uniquement la couleur pour communiquer un statut.
- Maintenir un contraste suffisant.
- Permettre une utilisation au clavier sur le web.
- Afficher clairement les unités : kg, g, unité, œuf, poule, sac, FCFA, etc. (se référer impérativement à la spécification normative `docs/UNITS_AND_MEASUREMENTS.md`).
- Interdiction formelle d'afficher des valeurs brutes sans unité explicite (ex: afficher "50 sacs (50kg)" ou "25 kg", et non "50" ou "25").

Toute action importante doit fournir un retour visible.

# 12. PERFORMANCES ET FIABILITÉ

Le produit doit rester utilisable sur des appareils modestes et des connexions parfois instables.

- Éviter les chargements de données inutiles.
- Paginer les grandes listes.
- Prévoir des index adaptés aux recherches fréquentes.
- Éviter les requêtes répétitives inutiles.
- Optimiser les images et les ressources.
- Prévoir des mécanismes de reprise pour les opérations interrompues.
- Protéger les opérations contre les doublons.
- Prévoir des sauvegardes et une procédure de restauration.
- Journaliser les erreurs techniques sans exposer de secrets.

Les performances doivent être vérifiées sur des données représentatives, pas seulement avec quelques enregistrements de démonstration.

# 13. TESTS ET CRITÈRES D'ACCEPTATION

Une fonctionnalité est considérée comme terminée uniquement lorsque :

1. Le besoin fonctionnel est satisfait.
2. L'interface respecte le design system.
3. Les permissions sont correctement vérifiées.
4. Les validations métier fonctionnent.
5. Les erreurs sont gérées.
6. Les données restent cohérentes.
7. Les tests pertinents passent.
8. Les interfaces web et mobile concernées restent compatibles.
9. La documentation nécessaire est actualisée.

Pour les calculs de stock, d'effectif et de finance, prévoir des tests automatisés ciblés.

Ne jamais annoncer qu'un test a réussi s'il n'a pas été exécuté.

# 14. ORGANISATION DES DOCUMENTS DU PROJET

Maintenir une documentation centrale, versionnée avec le code.

Organisation recommandée, à adapter à la structure existante :

- `PROJECT_RULES.md` : règles fondamentales du produit.
- `docs/PRODUCT.md` : vision, utilisateurs et périmètre.
- `docs/ARCHITECTURE.md` : architecture technique et responsabilités.
- `docs/DECISIONS.md` : décisions techniques et raisons.
- `docs/DATA_MODEL.md` : entités, relations et contraintes.
- `docs/BUSINESS_RULES.md` : règles métier et calculs.
- `docs/DESIGN_SYSTEM.md` : couleurs, typographie, espacements et composants.
- `docs/ROUTES_AND_PAGES.md` : navigation, pages et autorisations.
- `docs/TESTING.md` : stratégie et commandes de test.
- `docs/DEPLOYMENT.md` : configuration, déploiement, sauvegardes et restauration.
- `docs/ROADMAP.md` : fonctionnalités prévues, en cours et terminées.

Ne pas créer plusieurs documents concurrents qui contiennent des règles contradictoires.

Si le projet possède déjà une structure de documentation, l'améliorer plutôt que la dupliquer.

# 15. GESTION DES ÉVOLUTIONS

Toute nouvelle fonctionnalité doit être évaluée selon :
- Sa valeur pour l'utilisateur.
- Sa cohérence avec le produit.
- Son coût de développement.
- Son impact sur les données.
- Son impact sur la sécurité.
- Son impact sur les performances.
- Sa compatibilité avec les interfaces web et mobile.

Avant une modification importante, présenter :
1. Le problème à résoudre.
2. La solution proposée.
3. Les fichiers ou modules concernés.
4. Les conséquences éventuelles.
5. Les tests à prévoir.

Les changements de schéma doivent être accompagnés de migrations adaptées et d'une stratégie de conservation des données existantes.

Ne pas ajouter une nouvelle fonctionnalité simplement parce qu'elle semble intéressante.

# 16. MÉTHODE DE DÉVELOPPEMENT PAR PHASES

Respecter l'ordre suivant :

**Phase 1 — Audit et cadrage**
- Examiner le dépôt.
- Identifier les technologies existantes.
- Recenser les fonctionnalités.
- Définir les utilisateurs.
- Valider les principales règles métier.
- Identifier les risques techniques.

**Phase 2 — Fondations**
- Architecture.
- Authentification.
- Gestion des organisations et exploitations.
- Permissions.
- Modèle de données.
- Design system.
- Navigation générale.

**Phase 3 — Première version commercialisable**
- Gestion des bandes.
- Suivi des effectifs.
- Stocks et alimentation.
- Production selon le type d'élevage.
- Ventes et dépenses.
- Tableau de bord.
- Rapports essentiels.

**Phase 4 — Application mobile**
- Réutilisation de l'API.
- Interface adaptée au tactile.
- Authentification sécurisée.
- Gestion des états réseau.
- Synchronisation hors connexion si validée dans le périmètre.

**Phase 5 — Commercialisation**
- Offres et limites.
- Abonnements ou licences.
- Paiements sécurisés.
- Gestion des renouvellements.
- Essais et démonstrations.
- Support client.
- Sauvegardes et surveillance de production.

**Phase 6 — Évolution**
- Notifications avancées.
- Rapports approfondis.
- Automatisations.
- Intégrations supplémentaires.
- Fonctionnalités premium validées par les utilisateurs.

Cette séquence constitue une feuille de route indicative. L'ordre exact doit être confirmé après l'audit et l'analyse des dépendances.

# 17. FORMAT DE RÉPONSE EXIGÉ DE L'IA

Pour toute tâche importante, répondre dans cet ordre :

**A. Compréhension**
- Objectif exact.
- Comportement attendu.
- Limites de la tâche.

**B. Analyse**
- Éléments existants à réutiliser.
- Fichiers concernés.
- Dépendances et risques.

**C. Plan**
- Étapes courtes.
- Critères de réussite.
- Tests nécessaires.

**D. Implémentation**
- Changements minimaux et cohérents.
- Respect de l'architecture.
- Respect du design system.

**E. Vérification**
- Tests réellement exécutés.
- Résultats.
- Problèmes restants.

**F. Documentation**
- Règles ou décisions à mettre à jour.
- Éventuelles suites recommandées.

Pour une tâche simple, réduire la longueur du compte rendu sans supprimer les vérifications nécessaires.

Ne pas se limiter à proposer du code lorsque l'utilisateur demande une implémentation dans le dépôt. Si l'environnement permet de modifier les fichiers, effectuer le travail et vérifier le résultat.

# 18. PRINCIPE FINAL

La cohérence prime sur la nouveauté. La fiabilité prime sur l'effet visuel. La simplicité d'utilisation prime sur l'accumulation de fonctionnalités.

Chaque écran doit avoir une raison d'exister. Chaque composant doit suivre les règles communes. Chaque opération doit respecter les règles métier. Chaque évolution doit préserver la stabilité du produit.

**Avant de coder, comprendre. Avant de modifier, vérifier. Après avoir modifié, tester. En cas de doute important, demander une décision plutôt que d'improviser.**

Ce document constitue la référence permanente du développement du logiciel de gestion avicole.