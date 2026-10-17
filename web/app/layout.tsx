import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";

export const metadata: Metadata = {
  title: "Lefermier — Logiciel de Gestion Avicole",
  description:
    "Solution professionnelle de gestion d'exploitations avicoles pour le Bénin et l'Afrique de l'Ouest. Suivi des bandes, ponte, stocks et finances.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
