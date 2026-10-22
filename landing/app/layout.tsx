import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lefermier — Logiciel de Gestion Avicole en Afrique de l'Ouest",
  description:
    "Organisez le suivi de votre ferme : enregistrez vos pontes en plateaux de 30 alvéoles, gérez vos stocks de provende en sacs ou kg, suivez vos vaccins et tenez votre trésorerie en FCFA.",
  keywords: [
    "aviculture",
    "élevage avicole",
    "poules pondeuses",
    "poulets de chair",
    "gestion de ferme",
    "plateaux 30 oeufs",
    "logiciel avicole Bénin",
    "Afrique de l'Ouest",
    "FCFA",
    "MTN MoMo",
    "Moov Money",
    "prophylaxie aviaire",
    "Lefermier",
  ],
  authors: [{ name: "Lefermier" }],
  creator: "Lefermier",
  publisher: "Lefermier",
  metadataBase: new URL("https://lefermier.app"),
  openGraph: {
    title: "Lefermier — Logiciel de Gestion Avicole en Afrique de l'Ouest",
    description:
      "Suivi complet des élevages de volailles : ponte, provende, prophylaxie et caisse en FCFA.",
    url: "https://lefermier.app",
    siteName: "Lefermier",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lefermier — Gestion Avicole Professionnelle",
    description:
      "Le logiciel de suivi conçu pour les exploitations avicoles en Afrique de l'Ouest.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Lefermier",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Mobile (Android/iOS)",
              description:
                "Logiciel professionnel de gestion pour exploitations avicoles : suivi des pontes en plateaux de 30 alvéoles, gestion de la provende, prophylaxie automatisée et trésorerie en FCFA.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "XOF",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
