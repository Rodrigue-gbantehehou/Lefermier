# 📱 Poulvia Web — Client Web & Application PWA

> **Interface web et Progressive Web App (PWA) pour la gestion d'exploitations avicoles, conçue selon le Design System (`docs/DESIGN_SYSTEM.md`) et les règles fondamentales du projet (`docs/PROJECT_RULES.md`).**

---

## 🛠️ Stack Technologique

- **Framework** : Next.js 16 (App Router)
- **Bibliothèque UI** : React 19
- **Typage** : TypeScript (mode strict)
- **Styles** : Tailwind CSS v4 (Design Tokens centralisés, échelle de 4px, aucun style arbitraire hors échelle)
- **Icônes** : Lucide React (bibliothèque unique et exclusive, aucun emoji dans les contrôles fonctionnels)
- **PWA** : Manifest web W3C, méta-tags autonomes (`display: standalone`), support des zones de sécurité (`safe-area-inset`)

---

## 📐 Conformité avec le Design System (`docs/DESIGN_SYSTEM.md`)

L'application web applique scrupuleusement les exigences des spécifications :

### 1. Grilles & Responsive Design (§11)
- **Réduction du nombre de colonnes** : Les indicateurs et métriques réduisent naturellement leurs colonnes sur mobile sous forme de tuiles compactes en 2 colonnes lisibles d'un coup d'œil (`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`), sans carrousels horizontaux ni largeurs arbitraires (`min-w-[250px]`).
- **Zéro débordement global** : Aucun débordement horizontal involontaire sur écran smartphone (< 640 px).
- **Adaptation des tableaux métier (§8)** : Les tableaux larges (`DataTable`) disposent d'un rendu mobile alternatif en cartes tactiles (`renderMobileCard`), affichant directement les données clés et actions rapides adaptées aux pouces (appel téléphonique en un tap `tel:`, modification, suppression).

### 2. Espacements & Rayons de bordure (§5)
- Échelle d'espacement basée strictement sur des multiples de 4 px (12, 16, 20, 24, 32 px).
- Rayons de bordure cohérents et harmonisés entre 6 et 12 px (`rounded-lg`, `rounded-xl`).

### 3. Accessibilité WCAG (§12)
- **Zoom mobile préservé** : Conformément à la règle explicite du §12 (*"Ne pas désactiver le zoom mobile"*), le viewport autorise l'agrandissement accessible (`initial-scale=1`, sans `user-scalable=no`).
- Tailles de police des champs de formulaire configurées à 16 px sur smartphone pour éliminer l'effet de zoom involontaire lors du focus.

### 4. Clarté & Sobriété Opérationnelle — "Aller à l'essentiel" (§1 & §7)
- **Zéro texte de remplissage** : Suppression systématique des longs paragraphes d'introduction génériques sous les en-têtes de pages opérationnelles.
- **Cartes KPI condensées et directes** : Titres percutants (*Recettes*, *Dépenses*, *Solde de caisse*, *Créances*, *Ponte du jour*), affichage chiffré net en typographie monospace, suppression des badges de tendance verbeux ou redondants (*"Entrées d'argent"*, *"Sur l'ensemble des lots"*).
- **Tableaux et listes épurés** : Titres précis (*Lots en élevage*, *Historique des flux*, *Articles en stock*) sans sous-titres paraphrasant l'évidence.

### 5. Expérience Mobile Native & Ergonomie Terrain (PWA)
- **Dock de Navigation Basse (`BottomNav`) avec Action Rapide centrale** :
  - 5 onglets tactiles naturels : *Accueil*, *Bandes*, *Bouton central surélevé (+)*, *Caisse*, *Menu*.
  - Le bouton central surélevé ouvre une **Feuille d'actions rapides (Bottom Sheet native)** permettant à l'éleveur d'enregistrer instantanément en 2 taps :
    - 🥚 *Ponte d'œufs* (collecte matin, midi, soir)
    - 🌽 *Nourrir le lot* (distribution de sacs d'aliment)
    - ⚠️ *Perte / Mortalité* (ajustement immédiat du cheptel)
    - 💰 *Recette / Vente* (encaissement immédiat)
    - 🧾 *Dépense / Achat* (intrants, matériel)
    - 💉 *Soin / Vaccin* (rappel ou traitement sanitaire)
- **Dashboard Terrain Ultra-Pratique (`app/page.tsx`)** :
  - **4 Tuiles d'action immédiate à 1-tap** sous le pouce (*Ramasser*, *Nourrir*, *Mortalité*, *Encaisser*).
  - **4 Indicateurs vitaux du jour** en tuiles compactes 2×2 (Ponte du jour & plateaux, Cheptel vivant & pertes, Caisse nette, Alertes).
  - **Bannières d'alerte contextuelles** (uniquement en cas de stock critique ou soin en retard).
  - **Mes Lots Actifs** en cartes tactiles interactives (avec bouton *Nourrir* direct, sans tableau lourd).
  - **Journal d'activité unifié** (timeline chronologique épurée des 5 dernières opérations).
- **Barre supérieure native (`Header`)** :
  - Sélecteur d'exploitation en pilule avec puce active clignotante.
  - Bascule de thème sombre/clair et profil utilisateur compact.
  - Respect de la zone de sécurité haute (`safe-area-inset-top`).
- **Modales en Bottom Sheet (`Modal`)** : Sur petit écran, toutes les fenêtres d'action se transforment en feuilles basses avec poignée de glissement et défilement vertical maîtrisé.

---

## 🚀 Démarrage & Développement

### 1. Démarrer le serveur local

```bash
cd web
npm install
npm run dev
```

L'application est disponible sur `http://localhost:3000`.

### 2. Tester sur smartphone (Réseau Local / Wi-Fi)

Pour tester l'application directement depuis un smartphone connecté au même réseau Wi-Fi ou partage de connexion :

1. Identifiez votre adresse IP locale (ex : `192.168.43.195`).
2. Vérifiez que l'adresse IP figure dans `allowedDevOrigins` du fichier `next.config.ts`.
3. Ouvrez le navigateur de votre smartphone et accédez à :
   ```text
   http://192.168.43.195:3000
   ```
4. **Proxy API Transparent** : Le client web Next.js relaie automatiquement toutes les requêtes `/api/*` vers le backend Symfony local (`http://127.0.0.1:8000`), sans configuration manuelle sur le téléphone.

---

## 📲 Installation sur Smartphone (PWA Standalone)

L'application peut être installée comme une véritable application native :

- **Android (Chrome)** : Menu `⋮` > **Ajouter à l'écran d'accueil** ou **Installer l'application**.
- **iOS (Safari)** : Bouton de partage `Partager` > **Sur l'écran d'accueil**.

L'application s'ouvre alors en plein écran sans barre d'adresse de navigateur avec la couleur de thème `#245c43`.
