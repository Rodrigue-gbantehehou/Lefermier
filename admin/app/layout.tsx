import type { Metadata } from "next";
import "./globals.css";
import { AdminAuthProvider } from "@/context/admin-auth-context";
import { AdminGuard } from "@/components/admin-guard";

export const metadata: Metadata = {
  title: "Poulvia — Console d'Administration Centrale",
  description: "Back-office privé de supervision et gouvernance de la plateforme avicole Poulvia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <AdminAuthProvider>
          <AdminGuard>{children}</AdminGuard>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
