import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";

export const metadata: Metadata = {
  title: "Lefermier — Gestion Avicole",
  description:
    "Solution professionnelle de gestion d'exploitations avicoles africaine. Suivi des bandes, ponte, stocks et finances.",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lefermier",
  },
  applicationName: "Lefermier",
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#245c43" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1713" },
  ],
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
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
