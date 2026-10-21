# Règles de conception — Landing page Lefermier

## 1. Objectif

L'application `landing/` est le site public de présentation de Lefermier.

Son rôle est de présenter le logiciel, expliquer sa valeur, rassurer les visiteurs et les orienter vers une action pertinente : demander une démonstration, créer un compte ou contacter l'équipe.

Ce site est indépendant de l'application de gestion des fermes et du back-office administratif.

## 2. Principes fondamentaux

- Présenter clairement le produit et son utilité.
- Utiliser un langage naturel, professionnel et compréhensible.
- Mettre en avant les bénéfices concrets pour les exploitants.
- Ne jamais inventer une fonctionnalité, un tarif, un témoignage ou une statistique.
- Ne jamais présenter une fonctionnalité future comme déjà disponible.
- Privilégier la performance, l'accessibilité, le responsive et le référencement naturel.
- Réutiliser les composants et les conventions existants lorsqu'ils sont adaptés.
- Ne pas surcharger les pages d'animations ou d'éléments décoratifs.
- Vérifier le contenu réel du produit avant de rédiger les pages commerciales.

## 3. Public cible

Le contenu doit être adapté aux utilisateurs que Lefermier souhaite réellement servir, notamment :

- les propriétaires de fermes ;
- les responsables d'exploitation ;
- les gestionnaires d'élevage ;
- les employés qui participent au suivi des opérations.

Ne pas supposer que tous les visiteurs possèdent des compétences informatiques avancées.

Expliquer les fonctionnalités avec des exemples concrets liés aux activités agricoles et d'élevage réellement prises en charge.

## 4. Organisation des pages

La structure suivante constitue une base à adapter au produit.

### Accueil

Présenter immédiatement :

- le nom Lefermier ;
- une proposition de valeur claire ;
- les principaux problèmes auxquels le logiciel répond ;
- les bénéfices essentiels ;
- une capture réelle de l'application, si disponible ;
- un appel à l'action principal.

### Fonctionnalités

Décrire les modules réellement disponibles, leurs usages et les problèmes qu'ils permettent de résoudre.

Ne pas présenter une simple maquette comme une fonctionnalité opérationnelle.

### Utilisateurs concernés

Expliquer à quels profils et types d'exploitation le logiciel s'adresse.

Ne pas promettre une prise en charge de toutes les activités agricoles si le périmètre actuel est plus limité.

### Fonctionnement

Présenter les principales étapes d'utilisation du logiciel avec des explications simples et, si possible, des captures réelles.

### Tarifs

Créer cette page lorsque les offres commerciales sont définies.

Préciser la devise, la périodicité, les limites des offres et les conditions applicables.

### FAQ

Répondre aux questions réelles concernant les fonctionnalités, l'accès au logiciel, les données, les abonnements et le support.

### Contact ou démonstration

Proposer un formulaire fonctionnel, avec validation, gestion des erreurs et confirmation après réception effective de la demande.

### Pages légales

Prévoir les mentions légales, la politique de confidentialité et les informations relatives aux cookies lorsque nécessaire, selon les obligations applicables.

## 5. Rédaction et communication

- Utiliser un français simple, précis et professionnel.
- Écrire des titres qui expriment clairement le contenu de chaque section.
- Privilégier les bénéfices concrets aux slogans vagues.
- Employer des paragraphes courts.
- Éviter les termes techniques inutiles.
- Expliquer les termes spécialisés lorsqu'ils sont indispensables.
- Éviter les superlatifs non démontrés comme « le meilleur logiciel » ou « la solution numéro un ».
- Ne promettre aucune hausse de rentabilité ou réduction des pertes sans éléments vérifiables.
- Utiliser des appels à l'action explicites et cohérents.
- Relire le contenu avant chaque publication.

### Proposition de valeur provisoire

Cette formulation doit être adaptée aux fonctionnalités effectivement disponibles :

« Lefermier vous aide à organiser le suivi de votre ferme, centraliser vos informations et mieux comprendre les résultats de votre exploitation. »

Ne pas conserver une promesse qui ne correspond pas encore aux capacités réelles du logiciel.

## 6. Identité visuelle et design system

- Conserver une identité visuelle cohérente avec l'application web.
- Définir une hiérarchie visuelle claire entre titres, textes, illustrations et appels à l'action.
- Utiliser une palette de couleurs cohérente et des contrastes suffisants.
- Maintenir des espacements et une typographie réguliers.
- Utiliser des composants réutilisables pour les boutons, cartes, sections, formulaires et éléments de navigation.
- Si Tailwind CSS et shadcn/ui sont déjà utilisés dans le projet, respecter leurs conventions et les règles de design existantes.
- Ne pas créer plusieurs variantes d'un même composant sans nécessité.
- Utiliser les captures réelles de l'application lorsqu'elles améliorent la compréhension du produit.
- Ne pas utiliser d'illustrations trompeuses laissant croire à l'existence de fonctionnalités inexistantes.
- Éviter les carrousels automatiques, les animations excessives et les fenêtres intrusives.
- Prévoir une version statique ou simplifiée des éléments décoratifs lorsque cela améliore les performances.

## 7. Responsive et accessibilité

Le site doit être conçu pour les téléphones, les tablettes et les ordinateurs.

- Adopter une approche mobile-first.
- Éviter les débordements horizontaux.
- Adapter les menus, les images, les tableaux et les formulaires aux petits écrans.
- Utiliser une structure HTML sémantique.
- Respecter la hiérarchie des titres.
- Fournir des textes alternatifs pertinents pour les images informatives.
- Utiliser un texte alternatif vide pour les images purement décoratives.
- Assurer un focus clavier visible.
- Rendre les menus et les formulaires accessibles au clavier.
- Vérifier les contrastes des textes et des éléments interactifs.
- Ne jamais transmettre une information uniquement par la couleur.
- Respecter la préférence de réduction des animations du système.

## 8. Performance

- Optimiser les images avant leur publication.
- Utiliser des formats modernes lorsque la chaîne de build le permet.
- Charger les images non essentielles de manière différée.
- Éviter les bibliothèques JavaScript inutiles.
- Réduire le JavaScript envoyé au navigateur lorsque le framework le permet.
- Éviter les vidéos en lecture automatique.
- Limiter les scripts externes.
- Prévoir des dimensions pour les images afin de réduire les déplacements de mise en page.
- Tester les performances sur une connexion mobile modeste.
- Corriger les erreurs importantes de chargement et de console avant la mise en production.

Ne pas sacrifier la lisibilité ou l'accessibilité pour obtenir artificiellement un meilleur score de performance.

## 9. Référencement naturel

Chaque page publique importante doit disposer de :

- un titre HTML unique ;
- une description pertinente ;
- une URL lisible ;
- une hiérarchie de titres cohérente ;
- des liens internes pertinents ;
- des métadonnées de partage social lorsque nécessaire.

Prévoir également :

- un sitemap XML correspondant aux pages publiques ;
- un fichier `robots.txt` cohérent ;
- des URL canoniques lorsque nécessaire ;
- une configuration empêchant l'indexation des environnements de test et des pages privées.

Ne pas générer des pages presque identiques uniquement pour multiplier les mots-clés.

N'ajouter des données structurées que lorsqu'elles correspondent réellement au contenu de la page.

## 10. Formulaires et collecte des données

- Ne demander que les informations nécessaires.
- Associer chaque champ à un libellé explicite.
- Valider les données côté client et côté serveur.
- Protéger les formulaires contre le spam et les abus.
- Afficher les erreurs à proximité des champs concernés.
- Préserver les saisies lorsqu'une erreur permet une nouvelle tentative.
- Empêcher les doubles soumissions.
- Afficher un message de réussite uniquement après confirmation du serveur.
- Ne jamais exposer de secret dans le frontend.
- Expliquer l'utilisation des données personnelles et fournir un accès à la politique de confidentialité.
- Respecter les obligations applicables en matière de consentement et de traceurs.

Un formulaire ne doit jamais être considéré comme fonctionnel si aucune destination opérationnelle n'est configurée pour recevoir les données.

## 11. Intégration avec les autres applications

- Ne pas intégrer dans `landing/` la logique métier de gestion des fermes.
- Ne pas accéder directement à la base de données.
- Utiliser l'API Symfony uniquement pour les opérations qui en ont réellement besoin.
- Respecter les contrats API existants.
- Centraliser les appels réseau dans une couche dédiée lorsqu'ils sont nécessaires.
- Gérer les erreurs réseau et les réponses du serveur.
- Configurer les URL de l'API et de l'application web par environnement.
- Éviter de disperser les URL en dur dans les composants.
- Diriger les utilisateurs vers l'application web avec une URL configurée.
- Ne jamais supposer qu'une inscription ou une demande a réussi sans réponse confirmée.

Les pages purement informatives doivent privilégier un rendu statique ou une stratégie adaptée au framework utilisé, plutôt que d'effectuer des appels API inutiles.

## 12. Tarifs et transparence commerciale

- Ne publier les tarifs qu'après validation des offres.
- Indiquer clairement la devise et la périodicité.
- Expliquer les limites et les conditions importantes de chaque offre.
- Préciser les modalités d'essai, de renouvellement ou de résiliation lorsqu'elles existent.
- Ne pas afficher de fonctionnalités incluses dans un forfait si elles ne le sont pas.
- Ne pas afficher de certification, de partenariat ou de garantie sans preuve.
- Ne publier des témoignages qu'avec des sources réelles et les autorisations nécessaires.
- Ne pas utiliser de faux compte à rebours ni de fausse rareté commerciale.

## 13. Tests avant mise en production

Vérifier systématiquement :

- le fonctionnement des liens et des boutons ;
- les menus sur mobile et ordinateur ;
- les formulaires et leurs différents états ;
- l'affichage sur plusieurs tailles d'écran ;
- l'accessibilité au clavier ;
- les contrastes et les textes alternatifs ;
- les titres, descriptions et URL ;
- le sitemap et le fichier `robots.txt` ;
- les performances et les erreurs de console ;
- les liens vers l'application web ;
- l'exactitude des tarifs et des coordonnées ;
- l'absence de secrets dans le code livré.

Ne pas déclarer un contrôle réussi sans l'avoir effectué.

## 14. Méthode de travail pour l'assistant IA

Avant de modifier le code :

1. Lire ce document et les règles générales du projet.
2. Examiner le framework, les composants et les dépendances existants.
3. Vérifier les fonctionnalités réellement disponibles dans Lefermier.
4. Identifier l'objectif de la page et son appel à l'action principal.
5. Proposer un plan limité avant une refonte importante.

Pendant le développement :

- respecter l'architecture existante ;
- réutiliser les composants adaptés ;
- ne pas inventer de fonctionnalités, de tarifs ou de témoignages ;
- ne pas ajouter de dépendance sans justification ;
- ne pas modifier l'API ou l'application de gestion sans nécessité ;
- préserver la cohérence visuelle et fonctionnelle.

Après le développement :

- exécuter les tests disponibles ;
- vérifier les liens et les formulaires ;
- contrôler l'affichage mobile et desktop ;
- vérifier les métadonnées SEO ;
- signaler les tests non exécutés ;
- documenter les décisions techniques importantes.

## 15. Critères de validation

Une page est prête à être publiée lorsque :

- son objectif est clair ;
- son contenu est exact et relu ;
- son appel à l'action fonctionne ;
- son affichage est correct sur mobile et ordinateur ;
- les critères essentiels d'accessibilité sont respectés ;
- ses métadonnées sont correctement renseignées ;
- ses formulaires ont été testés ;
- ses liens sont fonctionnels ;
- aucune donnée ou promesse fictive n'est présentée comme réelle ;
- aucune information confidentielle n'est exposée.

## 16. Hors périmètre

- Pas de tableau de bord réservé aux administrateurs.
- Pas de gestion quotidienne des élevages.
- Pas de logique métier dupliquée depuis Symfony.
- Pas de faux témoignages ni de statistiques inventées.
- Pas de tarifs ou de fonctionnalités non validés.
- Pas de formulaires sans traitement opérationnel.
- Pas de secrets dans le code frontend.
- Pas de pages privées indexées par les moteurs de recherche.
