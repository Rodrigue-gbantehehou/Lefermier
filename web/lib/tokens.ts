/**
 * DESIGN TOKENS — LOGICIEL DE GESTION AVICOLE LEFERMIER
 * 
 * Référence centrale des tokens du design system (docs/DESIGN_SYSTEM.md).
 * Tous les styles visuels, palettes, typographies et élévations sont centralisés ici.
 */

export const DESIGN_TOKENS = {
  // 1. Couleurs Principales (docs/DESIGN_SYSTEM.md § 3)
  colors: {
    // Identité avicole (Vert émeraude profond)
    primary: {
      DEFAULT: "#245C43",
      hover: "#194832",
      soft: "#E8F2EC",
    },
    // Mise en évidence ponctuelle (Doré / Jaune maïs / Œuf)
    accent: {
      DEFAULT: "#DDA64B",
      hover: "#C48E37",
      soft: "#FBF4E8",
    },
    // Surfaces et structure CLAIRE par défaut (fond jamais noir par défaut)
    light: {
      background: "#F6F8F6",        // Fond général clair et discret
      surface: "#FFFFFF",           // Cartes, tableaux et formulaires
      surfaceElevated: "#FFFFFF",   // Modales et popovers
      foreground: "#202923",        // Texte principal fort contraste
      mutedForeground: "#657168",   // Texte secondaire / descriptions
      border: "#DFE6E0",            // Bordures fines et séparateurs
    },
    // Mode sombre (uniquement activable manuellement par l'utilisateur)
    dark: {
      background: "#0F1713",
      surface: "#16221C",
      surfaceElevated: "#1C2B24",
      foreground: "#F1F5F2",
      mutedForeground: "#98A79D",
      border: "#24382C",
    },
    // Sémantiques d'exploitation avicole
    status: {
      success: "#237A4B",           // Situations favorables, effectif sain
      warning: "#946200",           // Seuils à surveiller, alerte ponte
      danger: "#B4232C",            // Mortalité, rupture de stock, perte
      info: "#2463A6",              // Indications et transferts neutres
    },
    // Moyens de paiement régionaux Bénin / Afrique de l'Ouest
    payment: {
      mtnMoMo: "#FFCC00",
      moovMoney: "#006699",
      celtiisCash: "#1A8A42",
      cash: "#657168",
    },
  },

  // 2. Typographie (docs/DESIGN_SYSTEM.md § 4)
  typography: {
    fontFamily: {
      sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    scale: {
      pageTitle: "text-xl sm:text-2xl font-bold tracking-tight",
      sectionTitle: "text-base font-bold",
      cardTitle: "text-sm font-semibold",
      body: "text-xs sm:text-sm leading-normal",
      caption: "text-[11px] text-muted",
      kpiValue: "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
    },
  },

  // 3. Espacements & Rayons de bordure (docs/DESIGN_SYSTEM.md § 5)
  radius: {
    badge: "rounded-full",
    button: "rounded-xl",
    input: "rounded-xl",
    card: "rounded-2xl",
    modal: "rounded-2xl",
  },

  // 4. Ombres
  shadows: {
    card: "shadow-xs hover:shadow-md transition-shadow",
    modal: "shadow-2xl",
    dropdown: "shadow-xl",
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
