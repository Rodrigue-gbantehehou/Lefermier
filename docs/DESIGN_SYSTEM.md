# DESIGN SYSTEM — LOGICIEL DE GESTION AVICOLE

**Fichier :** `docs/DESIGN_SYSTEM.md`  
**Statut :** Référence obligatoire pour toute interface web  
**Priorité :** Toute nouvelle page, tout composant et toute modification visuelle doivent respecter ce document.

---

## 1. Objectif et principes fondamentaux

Le logiciel doit être une application de gestion professionnelle destinée aux exploitations avicoles de toutes tailles : petites fermes, exploitations moyennes et grandes structures, qu'elles pratiquent l'élevage de poulets de chair, de pondeuses ou les deux.

L'interface doit permettre de comprendre rapidement la situation de l'exploitation, de réaliser les opérations quotidiennes et de prendre des décisions à partir de données fiables.

### Principes obligatoires

1. **Cohérence :** une même action ou un même type de donnée doit être présenté de manière cohérente dans toute l'application.
2. **Réutilisation :** aucun composant existant ne doit être recréé sans justification.
3. **Lisibilité :** la compréhension des informations prime sur la décoration.
4. **Simplicité :** chaque élément doit avoir une utilité fonctionnelle claire.
5. **Responsive :** toutes les pages doivent fonctionner sur ordinateur, tablette et mobile.
6. **Accessibilité :** les interfaces doivent être utilisables au clavier et compréhensibles par les technologies d'assistance.
7. **Fiabilité :** les chargements, erreurs, validations, permissions et états vides doivent être traités.
8. **Maintenabilité :** les styles, composants et règles visuelles doivent être centralisés autant que possible.

Ne jamais créer une interface uniquement pour remplir l'écran. Ne jamais ajouter de graphiques, d'animations, de cartes ou d'informations fictives pour embellir une page.

## 2. Technologies de conception

### Stack de référence

Si le dépôt ne possède pas déjà une stack fonctionnelle incompatible, utiliser :

- **Next.js :** framework de l'application web.
- **React :** construction des interfaces et composants.
- **TypeScript :** typage strict et réduction des erreurs.
- **Tailwind CSS :** styles, mise en page et responsive design.
- **shadcn/ui :** composants d'interface de base personnalisables.
- **Lucide React :** bibliothèque unique d'icônes.
- **Recharts :** graphiques et visualisations de données.
- **React Hook Form + Zod :** gestion et validation des formulaires, si adaptés au projet.

Les versions installées et leur compatibilité doivent être vérifiées avant toute installation ou mise à niveau.

### Règles d'utilisation

- Ne pas ajouter une bibliothèque UI concurrente sans nécessité démontrée.
- Ne pas remplacer la stack existante uniquement par préférence personnelle.
- Utiliser les composants shadcn/ui comme fondation, pas comme design final imposé.
- Personnaliser les composants selon le système visuel du projet.
- Ne pas écrire du CSS personnalisé lorsqu'une solution Tailwind claire et maintenable existe déjà.
- Ne pas mélanger plusieurs bibliothèques d'icônes.
- Ne pas installer une dépendance pour une fonctionnalité simple pouvant être réalisée proprement avec les outils existants.

## 3. Identité visuelle

L'interface doit évoquer la confiance, la précision, la maîtrise opérationnelle et le secteur agricole, sans ressembler à un site vitrine agricole ni à un tableau de bord générique généré automatiquement.

### Palette de référence

Ces couleurs constituent la palette initiale. Les centraliser dans les variables de thème et les tokens du projet.

| Token | Couleur | Utilisation |
|---|---|---|
| `primary` | `#245C43` | Actions principales, navigation active |
| `primary-hover` | `#194832` | Survol des actions principales |
| `primary-soft` | `#E8F2EC` | Fonds et sélections légères |
| `accent` | `#DDA64B` | Mise en évidence ponctuelle |
| `background` | `#F6F8F6` | Fond général |
| `surface` | `#FFFFFF` | Cartes, tableaux et formulaires |
| `foreground` | `#202923` | Texte principal |
| `muted-foreground` | `#657168` | Texte secondaire |
| `border` | `#DFE6E0` | Bordures et séparations |
| `success` | `#237A4B` | Succès et situations favorables |
| `warning` | `#946200` | Avertissements et seuils à surveiller |
| `danger` | `#B4232C` | Erreurs et situations critiques |
| `info` | `#2463A6` | Informations et indications neutres |

### Règles de couleur

- Le vert est la couleur d'identité, pas un fond à appliquer partout.
- Le fond général reste clair et discret.
- Le blanc sert à distinguer les surfaces de travail.
- L'accent doré doit rester ponctuel.
- Les couleurs sémantiques doivent conserver leur signification dans toute l'application.
- Une couleur ne doit jamais être le seul moyen de transmettre une information.
- Vérifier le contraste entre le texte et son arrière-plan.
- Éviter les dégradés décoratifs, les effets lumineux, les ombres lourdes et les couleurs saturées sans justification fonctionnelle.

## 4. Typographie

Utiliser **Inter** comme police de référence si elle est disponible et correctement intégrée. Sinon, conserver une police sans sérif existante et cohérente.

Hiérarchie indicative :

| Élément | Style |
|---|---|
| Titre principal de page | 24–30 px, semi-gras |
| Titre de section | 18–20 px, semi-gras |
| Titre de carte | 14–16 px, moyen |
| Texte courant | 14–16 px |
| Texte secondaire | 12–14 px |
| Libellé de champ | 13–14 px, moyen |
| KPI principal | 24–32 px, semi-gras |

### Règles

- Ne pas multiplier les familles de polices.
- Ne pas utiliser des titres géants dans une application de gestion.
- Éviter les textes trop petits, notamment dans les tableaux.
- Garder une hiérarchie typographique prévisible.
- Aligner correctement les nombres et faciliter leur comparaison.
- Formater les dates, les quantités, les pourcentages et les montants selon les conventions définies par le produit.

## 5. Espacements, dimensions et surfaces

Utiliser une échelle d'espacement cohérente basée sur des multiples de 4 px, conformément au système Tailwind.

Valeurs de référence : 4, 8, 12, 16, 20, 24, 32 et 40 px.

### Règles de mise en page

- Utiliser des espacements réguliers entre les sections.
- Éviter les interfaces tassées et les espaces vides excessifs.
- Préférer des bordures fines et des ombres discrètes.
- Employer des rayons de bordure cohérents, généralement entre 6 et 12 px.
- Les cartes ne doivent pas toutes être entourées d'une bordure si la hiérarchie peut être obtenue autrement.
- Ne pas imbriquer plusieurs cartes inutilement.
- Éviter de transformer chaque information en une carte indépendante.
- Les contenus longs doivent disposer d'une largeur de lecture confortable.

## 6. Architecture de la bibliothèque de composants

La bibliothèque doit être organisée en quatre catégories.

```text
src/
├── components/
│   ├── ui/                  # Primitives d'interface
│   ├── layout/              # Structure globale
│   ├── shared/              # Composants transversaux
│   └── data-display/        # Données, tableaux, KPI, graphiques
├── features/
│   ├── flocks/
│   │   └── components/
│   ├── production/
│   │   └── components/
│   ├── inventory/
│   │   └── components/
│   ├── health/
│   │   └── components/
│   └── finance/
│       └── components/
└── lib/
    ├── api/
    ├── utils/
    └── constants/
```

Adapter cette organisation à l'architecture réelle du dépôt. Ne pas déplacer ou recréer arbitrairement des fichiers existants.

### Niveau 1 — Composants UI de base

Utiliser shadcn/ui pour les composants appropriés :

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Label
- Card
- Badge
- Dialog
- Alert Dialog
- Dropdown Menu
- Popover
- Tooltip
- Tabs
- Table
- Skeleton
- Alert
- Sheet
- Calendar et composants de date compatibles

Ne créer une implémentation personnalisée que si les besoins du produit ne sont pas correctement couverts par les composants existants.

### Niveau 2 — Composants de structure

Créer et réutiliser notamment :

- `AppSidebar`
- `AppHeader`
- `MobileNavigation`
- `Breadcrumbs`
- `PageHeader`
- `PageContainer`
- `SectionHeader`
- `ContentToolbar`
- `FarmSelector`
- `UserMenu`
- `NotificationMenu`

Ces composants assurent une structure identique sur les pages concernées.

### Niveau 3 — Composants transversaux

Créer des composants communs lorsque plusieurs modules partagent réellement le même besoin :

- `DataTable`
- `SearchInput`
- `FilterBar`
- `Pagination`
- `StatusBadge`
- `ConfirmDialog`
- `FormField`
- `DateRangePicker`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `KpiCard`
- `ChartCard`
- `AlertBanner`
- `ExportMenu`

Les composants doivent proposer des propriétés TypeScript explicites, des valeurs par défaut raisonnables et des comportements prévisibles.

### Niveau 4 — Composants métier

Les composants métier sont construits à partir des composants partagés :

- `FlockCard`
- `FlockStatusBadge`
- `MortalityIndicator`
- `ProductionSummary`
- `ProductionChart`
- `StockAlert`
- `FeedConsumptionSummary`
- `HealthEventCard`
- `VaccinationTimeline`
- `BatchTimeline`
- `FinancialSummary`
- `ExpenseCategoryChart`

Ils doivent rester dans le domaine fonctionnel correspondant, sauf si leur réutilisation dans plusieurs modules justifie leur déplacement vers une catégorie partagée.

### Règle anti-duplication

Avant de créer un composant :

1. Rechercher un composant existant qui remplit le même rôle.
2. Vérifier s'il peut être réutilisé avec ses propriétés actuelles.
3. Si nécessaire, déterminer si une extension générique est pertinente.
4. Ne pas ajouter une propriété abstraite qui complique tous les usages pour satisfaire un cas isolé.
5. Créer un nouveau composant lorsque le comportement ou la responsabilité est réellement distinct.
6. Mettre à jour la documentation et les exemples si le composant devient une référence commune.

Ne pas créer un composant générique universel contenant une multitude de conditions spécifiques à chaque page.

## 7. Règles de construction des pages

Chaque page doit utiliser un modèle de structure cohérent, adapté à sa fonction.

### Structure de référence

1. Navigation globale.
2. En-tête de page avec titre et description utile.
3. Actions principales, lorsque nécessaire.
4. Indicateurs ou résumé, uniquement si utiles.
5. Zone de filtres et de recherche, pour les vues concernées.
6. Contenu principal.
7. Pagination ou actions complémentaires, si nécessaire.

Cette structure est un modèle, pas une obligation d'afficher tous les éléments sur toutes les pages.

### `PageHeader`

Chaque page doit avoir un titre explicite.

L'en-tête peut contenir :

- Un titre.
- Une description courte, si elle apporte une information utile.
- Un fil d'Ariane lorsque la profondeur de navigation le justifie.
- Une action principale.
- Des actions secondaires regroupées dans un menu si nécessaire.

Ne pas ajouter de texte marketing ou de longues descriptions sur les pages opérationnelles.

### Tableaux de bord

Un tableau de bord doit répondre aux questions importantes du rôle de l'utilisateur.

- Afficher les indicateurs pertinents.
- Mettre en évidence les anomalies et actions nécessaires.
- Utiliser les graphiques lorsqu'ils apportent une compréhension supplémentaire.
- Fournir un accès rapide aux opérations fréquentes.
- Adapter les informations aux permissions de l'utilisateur et à la ferme sélectionnée.
- Ne jamais remplir le dashboard de données fictives pour lui donner une apparence complète.

### Pages de liste

Les pages contenant une liste d'entités doivent proposer, selon le besoin :

- Une recherche.
- Des filtres utiles.
- Un tri pertinent.
- Une pagination adaptée.
- Un état de chargement.
- Un état vide.
- Un état d'erreur.
- Des actions par ligne.
- Des actions groupées si elles sont justifiées.

Ne pas créer une barre de filtres complexe lorsque la liste ne contient que quelques éléments ou que les filtres n'apportent rien.

### Pages de détail

Les pages de détail doivent distinguer clairement :

- Les informations essentielles.
- Le statut actuel.
- Les données associées.
- L'historique ou la chronologie.
- Les opérations disponibles selon les permissions.

Utiliser des onglets uniquement lorsque les groupes d'informations sont suffisamment distincts.

### Formulaires

- Regrouper les champs par sujet.
- Utiliser des libellés explicites.
- Indiquer les champs obligatoires.
- Expliquer les erreurs près des champs concernés.
- Préserver les valeurs saisies en cas d'erreur lorsque cela est possible.
- Désactiver ou protéger les soumissions répétées pendant le traitement.
- Demander une confirmation pour les opérations destructrices ou difficiles à annuler.
- Éviter les formulaires excessivement longs lorsqu'une organisation en étapes est réellement utile.

### Pages d'authentification

Les pages de connexion, d'inscription et de récupération d'accès doivent être sobres, lisibles et concentrées sur leur fonction. Elles peuvent employer une mise en page distincte de l'espace de gestion tout en respectant la même identité visuelle.

## 8. Règles des tableaux et données métier

Les tableaux constituent un élément essentiel du logiciel.

- Utiliser une bibliothèque ou une implémentation partagée lorsqu'elle couvre les besoins.
- Aligner les nombres et les montants de manière cohérente.
- Afficher les unités des quantités lorsque cela est nécessaire.
- Conserver des en-têtes explicites.
- Prévoir un affichage adapté aux petits écrans.
- Éviter les colonnes inutiles.
- Regrouper les actions secondaires dans un menu contextuel si la ligne devient trop chargée.
- Utiliser les badges de statut de manière uniforme.
- Ne pas se reposer uniquement sur une couleur pour distinguer les statuts.
- Ne pas tronquer une donnée importante sans moyen de la consulter intégralement.

Pour les grandes listes, prévoir des stratégies de pagination ou de chargement adaptées au volume des données. Ne pas charger des milliers d'enregistrements dans le navigateur sans justification.

## 9. Graphiques et indicateurs

Utiliser Recharts pour les graphiques, si cette bibliothèque est compatible avec le projet.

Chaque graphique doit avoir :

- Un titre explicite.
- Une période ou un contexte identifiable.
- Des unités claires.
- Des légendes compréhensibles lorsque plusieurs séries existent.
- Des infobulles utiles.
- Un état vide et un état de chargement.
- Une présentation adaptée aux petits écrans.

Choisir le graphique selon le besoin :

- Courbe pour les évolutions temporelles.
- Barres pour les comparaisons.
- Barres empilées pour les répartitions cumulées, si leur lecture reste claire.
- Graphique circulaire uniquement pour une répartition simple et limitée.

Éviter les graphiques décoratifs, les effets 3D et les visualisations difficiles à interpréter.

Les indicateurs métier, notamment la mortalité, la consommation alimentaire, le taux de ponte et les marges, doivent reposer sur les définitions métier validées. L'interface ne doit pas inventer de formule.

## 10. Icônes, boutons et interactions

### Icônes

Utiliser exclusivement Lucide React pour les icônes de l'interface.

- Conserver des tailles cohérentes.
- Associer un libellé aux actions dont le sens n'est pas évident.
- Ne pas utiliser une icône décorative pour remplacer un texte essentiel.
- Prévoir un nom accessible pour les boutons uniquement iconographiques.
- Ne pas mélanger des emojis, des icônes Lucide et d'autres bibliothèques comme système principal d'icônes.

### Boutons

Définir des variantes communes :

- `default` : action principale.
- `secondary` : action secondaire.
- `outline` : action alternative.
- `ghost` : action discrète.
- `destructive` : action dangereuse.
- `link` : navigation présentée comme un lien.

Une page ne doit généralement comporter qu'une action visuellement dominante dans sa zone principale.

Les actions doivent avoir un comportement réel. Ne jamais ajouter un bouton qui ne fait rien ou un lien pointant vers une destination inexistante.

### États interactifs

Chaque composant interactif doit gérer les états pertinents :

- Normal.
- Survol.
- Focus clavier.
- Actif ou sélectionné.
- Désactivé.
- Chargement.
- Erreur.
- Succès, lorsque pertinent.

Les animations doivent rester discrètes, rapides et utiles. Respecter la préférence système de réduction des animations lorsque nécessaire.

## 11. Responsive design

Le responsive doit être intégré dès la conception, et non ajouté après la réalisation de toutes les pages.

### Ordre de priorité

Concevoir d'abord une structure fonctionnelle sur les petits écrans, puis l'enrichir sur les écrans plus larges lorsque cela est pertinent.

### Ordres de grandeur indicatifs

- Petit écran : moins de 640 px.
- Écran intermédiaire : 640 à 1023 px.
- Grand écran : 1024 px et plus.

Ces seuils peuvent être ajustés aux points de rupture déjà configurés dans le projet.

### Comportements attendus

- La navigation latérale doit devenir une navigation mobile adaptée.
- Les formulaires doivent utiliser une largeur disponible confortable.
- Les actions importantes doivent rester accessibles.
- Les grilles doivent réduire leur nombre de colonnes.
- Les tableaux larges doivent adopter une solution mobile appropriée : défilement horizontal maîtrisé, colonnes prioritaires ou présentation alternative.
- Les fenêtres modales ne doivent pas dépasser la zone visible.
- Les textes ne doivent pas être coupés de manière imprévisible.
- Aucun écran ne doit présenter de débordement horizontal global non intentionnel.

Tester les pages sur plusieurs tailles d'écran et avec des contenus longs, pas seulement avec des données courtes.

## 12. Accessibilité

Respecter les principes essentiels WCAG :

- Utiliser les éléments HTML appropriés.
- Associer les libellés aux champs.
- Garantir une navigation clavier cohérente.
- Préserver un focus visible.
- Utiliser des contrastes suffisants.
- Fournir des alternatives textuelles aux informations visuelles essentielles.
- Annoncer les erreurs et les changements d'état importants.
- Ne pas désactiver le zoom mobile.
- Respecter les préférences de réduction des animations.

Ne jamais utiliser un élément visuellement cliquable sans comportement accessible correspondant.

## 13. Cohérence fonctionnelle et API

L'interface web consomme l'API backend. Les règles de présentation ne doivent pas devenir une seconde implémentation de la logique métier.

- Centraliser les appels API dans les services appropriés.
- Réutiliser les types et contrats de données définis pour l'API.
- Éviter les appels HTTP directement dispersés dans les composants d'affichage.
- Centraliser la gestion des erreurs et les mécanismes d'authentification appropriés.
- Ne pas placer de secrets dans le code client.
- Ne pas calculer exclusivement dans le navigateur une valeur métier qui doit faire autorité côté serveur.
- Ne pas simuler une réussite lorsque l'API a échoué.
- Ne pas afficher des actions non autorisées comme si elles étaient disponibles.
- Ne jamais considérer le masquage d'un bouton comme un mécanisme de sécurité : les permissions doivent aussi être vérifiées côté serveur.

Les états de chargement, d'erreur et de données absentes doivent être distingués.

## 14. Données fictives et démonstrations

Les données fictives peuvent être utilisées dans des maquettes isolées, des tests et des jeux de démonstration clairement identifiés.

Elles ne doivent pas être présentées comme des données réelles de production.

- Ne pas ajouter de statistiques arbitraires pour rendre une page plus impressionnante.
- Ne pas inventer des fermes, des bandes, des stocks ou des transactions dans l'environnement réel.
- Ne pas remplacer silencieusement une erreur API par des données de démonstration.
- Séparer les données de test des données de production.
- Utiliser des fixtures identifiées et reproductibles lorsque des tests en ont besoin.

## 15. Organisation et qualité du code UI

- Utiliser TypeScript avec un typage strict autant que le projet le permet.
- Éviter `any` sans justification.
- Éviter les composants excessivement volumineux.
- Séparer l'affichage, les interactions et les appels aux services lorsque cela améliore réellement la clarté.
- Extraire les comportements partagés au lieu de copier-coller du code.
- Éviter les conditions de rendu profondément imbriquées.
- Centraliser les tokens visuels, les variantes et les constantes communes.
- Éviter les styles en ligne dispersés.
- Ne pas créer de propriétés inutilisées ou de composants inutiles.
- Conserver les conventions de nommage du projet.

Ne pas abstraire prématurément chaque élément : une abstraction doit résoudre un problème réel de réutilisation, de cohérence ou de maintenance.

## 16. Tests visuels et fonctionnels

Toute nouvelle page doit être vérifiée sur les points suivants :

- Rendu sans erreur.
- Respect du système visuel.
- Navigation fonctionnelle.
- Boutons et formulaires opérationnels.
- Chargement et affichage correct des données.
- Gestion des erreurs API.
- États vides et chargements.
- Permissions et visibilité des actions.
- Affichage responsive.
- Navigation clavier et focus.
- Absence de débordement et de régression évidente.

Les composants partagés doivent être testés sur plusieurs cas d'utilisation afin qu'une modification ne casse pas les pages qui les utilisent.

Utiliser les outils de test déjà présents dans le dépôt. Ajouter de nouveaux outils seulement si un besoin concret le justifie.

## 17. Procédure obligatoire avant de créer une page

L'assistant IA doit suivre cet ordre :

1. Examiner l'architecture actuelle et les conventions du projet.
2. Identifier les composants existants et les composants métier disponibles.
3. Examiner les pages comparables pour conserver la même structure visuelle.
4. Identifier les données, contrats API, permissions et états nécessaires.
5. Réutiliser les composants existants avant d'en créer de nouveaux.
6. Construire la page avec les composants et tokens du design system.
7. Implémenter les états de chargement, d'erreur, de réussite et d'absence de données.
8. Vérifier le responsive et l'accessibilité.
9. Exécuter les vérifications et tests pertinents.
10. Documenter toute nouvelle convention ou tout nouveau composant partagé.

Avant de modifier un composant partagé, l'assistant doit identifier les usages susceptibles d'être affectés et vérifier qu'ils restent fonctionnels.

## 18. Critères d'acceptation d'une page

Une page est considérée comme terminée uniquement si :

- [ ] Elle respecte l'identité visuelle et la hiérarchie typographique.
- [ ] Elle utilise les composants existants lorsque c'est pertinent.
- [ ] Elle n'introduit pas de duplication inutile.
- [ ] Ses actions ont un comportement réel.
- [ ] Elle utilise les contrats API prévus.
- [ ] Elle traite les états de chargement, d'erreur et de données absentes.
- [ ] Elle respecte les permissions applicables.
- [ ] Elle fonctionne sur ordinateur, tablette et mobile.
- [ ] Elle respecte les principes d'accessibilité.
- [ ] Elle ne contient pas de données fictives présentées comme réelles.
- [ ] Les vérifications pertinentes ont été exécutées.
- [ ] Les éventuels écarts au système visuel sont justifiés et documentés.

## 19. Règle finale

Le design system est la référence commune de toute l'application web.

Aucun module ne doit introduire sa propre palette, sa propre typographie, une nouvelle bibliothèque d'icônes ou un nouveau système de boutons sans décision explicite.

L'objectif est de construire une application cohérente, opérationnelle et durable, dans laquelle les nouveaux modules s'intègrent naturellement à l'existant.

**Principe directeur : réutiliser avant de recréer, simplifier avant de complexifier et privilégier l'utilité avant la décoration.**