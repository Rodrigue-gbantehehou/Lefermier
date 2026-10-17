# 📐 Spécification Officielle des Unités de Mesure — Lefermier
*Document de référence normatif pour l'API Symfony, la base de données et l'application web frontend.*

---

## 1. Principe Directeur Fondamental

> [!IMPORTANT]
> **Règle d'or de traçabilité et d'ergonomie Lefermier :**
> **Aucune valeur numérique quantitative ne doit être affichée à l'écran, ni traitée dans le système sans son unité de mesure explicite.**
> Une valeur brute comme `50`, `14` ou `1250000` est formellement proscrite sans son suffixe ou badge explicite : `50 sacs (50 kg)`, `14 plateaux (420 œufs)`, `1 250 000 FCFA`.

---

## 2. Taxonomie Complète des Unités de Mesure

Le système classe l'intégralité des flux et actifs avicoles en 6 familles d'unités normalisées :

```
                        Familles d'Unités Avicoles
                                    │
     ┌──────────────┬───────────────┼───────────────┬──────────────┬──────────────┐
     ▼              ▼               ▼               ▼              ▼              ▼
1. MASSE       2. VOLUME       3. SANTÉ VÉTO   4. PONTE       5. CHEPTEL     6. MONNAIE
  (Provende)    (Eau/Intrants)  (Vaccins/Soins) (Plateaux)     (Poules)       (FCFA)
  kg, g, sacs   L, mL           dose, flacon    œuf, plateau   sujet, tête    XOF entier
```

---

## 3. Définition Détaillée par Famille

### 3.1. Famille MASSE (Alimentation, Provende & Matières Premières)
Utilisée pour les matières premières (maïs, tourteau de soja, son de blé, concentrés) et aliments complets (Démarrage, Croissance, Ponte, Finition).

| Code Enum (`InventoryUnit`) | Libellé Complet | Symbole Court | Équivalence Unité de Base (kg) | Contexte d'Utilisation |
| :--- | :--- | :--- | :--- | :--- |
| `KG` | Kilogramme | `kg` | **1,00 kg** *(Unité de base)* | Pesées d'aliments, sacs ouverts, rations partielles |
| `G` | Gramme | `g` | **0,001 kg** | Rations journalières par poule, prémix, additifs |
| `BAG_50KG` | Sac de 50 kg | `sac (50kg)` | **50,00 kg** | Sac standard provenderie commerciale (Vano, etc.) |
| `BAG_25KG` | Sac de 25 kg | `sac (25kg)` | **25,00 kg** | Sac demi-format provenderie |
| `TON` | Tonne métrique | `t` | **1 000,00 kg** *(20 sacs de 50 kg)* | Approvisionnements en vrac, camions de maïs |

#### Règle de Conversion Automatique (Masse) :
$$Q_{\text{cible}} = Q_{\text{source}} \times \left( \frac{\text{Facteur}_{\text{source}}}{\text{Facteur}_{\text{cible}}} \right)$$

*Exemple pratique :*
- Stock géré en `BAG_50KG` : L'éleveur dispose de **10 sacs** (500 kg).
- Sortie de consommation pour le poulailler : **25 kg**.
- Conversion : $25 \text{ kg} / 50 = 0,5 \text{ sac}$.
- Stock restant en base : **9,50 sacs** (soit 475 kg).

---

### 3.2. Famille VOLUME (Liquides, Traitement de l'eau, Désinfectants)
Utilisée pour les vitamines liquides, vermifuges buvables, désinfectants de pédiluve et assainissants d'eau.

| Code Enum | Libellé Complet | Symbole Court | Équivalence Base (L) | Contexte d'Utilisation |
| :--- | :--- | :--- | :--- | :--- |
| `LITER` | Litre | `L` | **1,00 L** *(Unité de base)* | Bidons, fûts, désinfectants de bâtiment |
| `ML` | Millilitre | `mL` | **0,001 L** | Posologies dans l'eau de boisson (ex: 1 mL / L) |

---

### 3.3. Famille SANTÉ & SOINS VÉTÉRINAIRES
Utilisée pour les vaccins (Newcastle, Gumboro, Bronchite Infectieuse), vitamines en poudre et traitements thérapeutiques.

| Code Enum | Libellé Complet | Symbole Court | Caractéristiques |
| :--- | :--- | :--- | :--- |
| `DOSE` | Dose vaccinale | `dose` | Unité biologique individuelle (1 dose = protection pour 1 sujet). |
| `VIAL` | Flacon / Ampoule | `flacon` | Conditionnement vétérinaire (ex: flacon de 500, 1 000 ou 2 500 doses). |
| `SACHET` | Sachet poudre | `sachet` | Sachet hydrosoluble (ex: anti-stress de 100 g). |

---

### 3.4. Famille PRODUCTION D'ŒUFS & PONTE
Conforme aux usages des fermes avicoles au Bénin et en Afrique de l'Ouest.

| Entité | Nom usuel | Ratio Unitaire | Définition Zootechnique |
| :--- | :--- | :--- | :--- |
| `EGG` | **Œuf** *(Unité de base)* | **1 œuf** | Œuf récolté au nidoir ou au tapis. |
| `TRAY` | **Plateau d'alvéoles** | **30 œufs** | Standard ouest-africain de conditionnement et de vente. |
| `CARTON` | **Carton d'expédition** | **360 œufs** *(12 plateaux)* | Emballage de grossiste pour le transport sécurisé. |

#### Formules de Décomposition Normalisée :
Pour toute collecte de $N$ bons œufs :
$$\text{Plateaux pleins} = \lfloor N / 30 \rfloor$$
$$\text{Œufs libres (hors plateau)} = N \pmod{30}$$
$$\text{Taux de ponte (\%) } = \left( \frac{\text{Total œufs récoltés (bons + déclassés)}}{\text{Effectif vivant du jour}} \right) \times 100$$

*Affichage obligatoire :*
- **Si $N < 30$ œufs** *(moins d'un plateau)* : afficher directement `X œuf(s)` (ex: `29 œufs`, `1 œuf`, `0 œuf`). **Interdiction formelle d'afficher `0 plateau + 29 œufs` ou `0 plat. + 29`**.
- **Si $N \ge 30$ œufs sans reste** : `14 plateaux` (format compact : `14 plat.`)
- **Si $N \ge 30$ œufs avec reste** : `14 plateaux + 5 œufs` (format compact : `14 plat. + 5`)
- **Format détaillé d'inventaire** : `14 plateaux (420 œufs)` ou `14 plateaux de 30 alvéoles`

---

### 3.5. Famille CHEPTEL & VOLAILLES
Utilisée pour le suivi des effectifs, de la croissance et de la mortalité.

| Concept | Unité Recommandée | Format d'Affichage |
| :--- | :--- | :--- |
| **Effectif vivant** | `poules` (pour pondeuses), `poulets` (pour chair), `sujets` (générique) | `499 poules`, `1 200 sujets` |
| **Pertes / Mortalité** | Nombre entier de têtes + Pourcentage | `-1 poule (0.2 %)` |
| **Consommation journalière** | Grammes par sujet par jour | `115 g / sujet / jour` |
| **Poids vif moyen** | Gramme ou Kilogramme | `1 850 g` ou `1.85 kg` |
| **Densité au sol** | Sujets par mètre carré | `7.5 sujets / m²` (seuil max : 9/m²) |

---

### 3.6. Famille MONNAIE & VALEUR (XOF)
- **Devise** : Franc CFA d'Afrique de l'Ouest (`FCFA` / `XOF`).
- **Précision** : Entier strict (`BIGINT` en base de données, `number` arrondi à l'unité en JSON/TypeScript). Aucun centime flottant.
- **Séparateur de milliers** : Espace insécable fine (Norme française ISO : `1 250 000 FCFA`).
- **Prix unitaires** : Doivent systématiquement préciser l'unité de référence sous-jacente :
  - `18 500 FCFA / sac (50kg)`
  - `370 FCFA / kg`
  - `2 100 FCFA / plateau`
  - `3 500 FCFA / poule réformée`

---

## 4. Règles de Gestion et Algorithmes Métier

### 4.1. Algorithme de Mouvement de Stock Multi-Unités
Lors de l'enregistrement d'un mouvement de stock (`StockMovement`) sur un article (`InventoryItem`) :

1. Si l'unité du mouvement est **identique** à l'unité de l'article :
   $$\Delta \text{Stock} = Q_{\text{mouvement}}$$
2. Si l'unité du mouvement est **compatible** (même famille physique, ex: `KG` et `BAG_50KG`) :
   $$\text{Facteur} = \frac{\text{BaseMultiplier}(U_{\text{mouvement}})}{\text{BaseMultiplier}(U_{\text{article}})}$$
   $$\Delta \text{Stock} = Q_{\text{mouvement}} \times \text{Facteur}$$
3. Si l'unité du mouvement est **incompatible** (ex: `LITER` vers `BAG_50KG`) :
   - L'API rejette immédiatement l'opération avec un code HTTP **`422 Unprocessable Content`** (`IncompatibleUnitException`) :
     > *« Impossible d'imputer un mouvement en 'Litre' sur un article stocké en 'Sac de 50 kg'. Les unités appartiennent à des familles incompatibles (Volume vs Masse). »*

---

## 5. Matrice Récapitulative des Équivalences

```
1 Tonne (t)        = 1 000 kg   = 20 sacs de 50 kg = 40 sacs de 25 kg
1 Sac de 50 kg     = 50 kg      = 50 000 g
1 Sac de 25 kg     = 25 kg      = 25 000 g
1 Kilogramme (kg)  = 1 000 g    = 0.02 sac de 50 kg
1 Carton d'œufs    = 12 plateaux = 360 œufs
1 Plateau d'œufs   = 30 œufs
1 Litre (L)        = 1 000 mL
```
