"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bird,
  Wallet,
  Menu,
  Plus,
  Egg,
  Utensils,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  HeartPulse,
  Package,
  Warehouse,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasModule, hasPermission, activeFarm, isOwner } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  function triggerAction(actionKey: string) {
    setSheetOpen(false);

    if (actionKey === "health") {
      router.push("/health");
      return;
    }

    if (pathname === "/") {
      window.dispatchEvent(
        new CustomEvent("open-dashboard-action", { detail: { action: actionKey } })
      );
    } else {
      router.push(`/?action=${actionKey}`);
    }
  }

  const isBroiler = activeFarm?.productionType === "BROILER";

  // ─── VÉRIFICATIONS STRICTES : ABONNEMENT DE LA FERME (MODULES) & DROITS UTILISATEUR ───
  const canViewEgg = hasModule("eggs") && !isBroiler && (hasPermission("egg:read") || hasPermission("egg:view") || isOwner);
  const canCreateEgg = hasModule("eggs") && !isBroiler && (hasPermission("egg:create") || isOwner);

  const canFeed = (hasModule("inventory") || hasModule("feed_rationing")) && (hasPermission("inventory:movement") || hasPermission("flock:update") || isOwner);
  const canRecordMovement = hasPermission("flock:movement") || hasPermission("flock:create") || hasPermission("flock:update") || isOwner;

  const canViewFinance = hasModule("finance") && (hasPermission("finance:read") || hasPermission("finance:view") || isOwner);
  const canCreateFinance = hasModule("finance") && (hasPermission("finance:create") || isOwner);

  const canViewHealth = hasModule("health") && (hasPermission("health:view") || hasPermission("health:read") || isOwner);
  const canManageHealth = hasModule("health") && (hasPermission("health:manage") || hasPermission("health:create") || isOwner);

  const canViewInventory = hasModule("inventory") && (hasPermission("inventory:read") || hasPermission("inventory:view") || isOwner);

  // Onglet 4 adaptatif selon les modules souscrits par la ferme et les autorisations
  const dynamicTab = (() => {
    if (canViewFinance) {
      return { href: "/finances", label: "Caisse", icon: Wallet, active: pathname.startsWith("/finances") };
    }
    if (canViewEgg) {
      return { href: "/eggs", label: "Œufs", icon: Egg, active: pathname.startsWith("/eggs") };
    }
    if (canViewInventory) {
      return { href: "/inventory", label: "Stocks", icon: Package, active: pathname.startsWith("/inventory") };
    }
    if (canViewHealth) {
      return { href: "/health", label: "Santé", icon: HeartPulse, active: pathname.startsWith("/health") };
    }
    return { href: "/buildings", label: "Bâtiments", icon: Warehouse, active: pathname.startsWith("/buildings") };
  })();

  const DynamicTabIcon = dynamicTab.icon;
  const isHomeActive = pathname === "/";
  const isFlocksActive = pathname.startsWith("/flocks");

  // Nombre d'actions permises dans la feuille
  const hasAnyAction = canCreateEgg || canFeed || canRecordMovement || canCreateFinance || canManageHealth;

  return (
    <>
      {/* ─── BARRE DE FOND INFÉRIEURE ANTI-DÉFILEMENT (MASQUE TOUT CONTENU SOUS LE BOTTOMBAR) ─── */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 z-38 lg:hidden pointer-events-none select-none"
      >
        {/* Dégradé doux supérieur pour estomper les éléments au défilement */}
        <div className="h-6 w-full bg-gradient-to-t from-background via-background/80 to-transparent" />

        {/* Barre avec fond protecteur opaque qui masque le défilement sous le bottombar */}
        <div
          className="w-full bg-surface border-t border-border/70 "
          style={{ height: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
        />
      </div>

      {/* ─── DOCK FLOTTANT ULTRA-MODERNE AUX COULEURS DE LA PLATEFORME (ISLAND DOCK) ─── */}
      <nav
        aria-label="Navigation mobile"
        className="fixed bottom-2.5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[430px] z-40 lg:hidden pointer-events-none"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="pointer-events-auto flex h-16 items-center justify-between px-2.5 rounded-[26px] bg-gradient-to-r from-[#1d4d38] via-primary to-[#184431] dark:from-[#1b4331] dark:via-primary dark:to-[#143627] backdrop-blur-2xl border border-white/20 text-white">
          {/* 1. Accueil */}
          <Link
            href="/"
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90",
              isHomeActive
                ? "text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200",
                isHomeActive
                  ? "bg-white/20 text-accent scale-110 ring-1 ring-white/30"
                  : "bg-transparent text-white/75 group-hover:bg-white/10 group-hover:text-white"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "text-[10px] leading-none mt-1 tracking-tight",
                isHomeActive ? "font-bold text-accent" : "font-medium text-white/80"
              )}
            >
              Accueil
            </span>
            {isHomeActive && (
              <span className="h-1 w-1 rounded-full bg-accent mt-0.5 animate-in zoom-in-50" />
            )}
          </Link>

          {/* 2. Bandes */}
          <Link
            href="/flocks"
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90",
              isFlocksActive
                ? "text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200",
                isFlocksActive
                  ? "bg-white/20 text-accent scale-110 ring-1 ring-white/30"
                  : "bg-transparent text-white/75 group-hover:bg-white/10 group-hover:text-white"
              )}
            >
              <Bird className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "text-[10px] leading-none mt-1 tracking-tight",
                isFlocksActive ? "font-bold text-accent" : "font-medium text-white/80"
              )}
            >
              Bandes
            </span>
            {isFlocksActive && (
              <span className="h-1 w-1 rounded-full bg-accent mt-0.5 animate-in zoom-in-50" />
            )}
          </Link>

          {/* 3. Bouton Central Joyau (+) avec micro-rotation */}
          <div className="relative flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setSheetOpen(!sheetOpen)}
              aria-label="Enregistrer une opération"
              className="relative -mt-6 flex flex-col items-center justify-center group active:scale-90 transition-transform cursor-pointer focus:outline-none"
            >
              <div
                className={cn(
                  "flex h-13 w-13 items-center justify-center rounded-full text-white border-[3.5px] border-[#1d4d38] ring-2 ring-white/20 transition-all duration-300",
                  sheetOpen
                    ? "rotate-45 bg-danger"
                    : "bg-accent group-hover:scale-105 group-hover:bg-accent-hover"
                )}
              >
                <Plus className="h-6 w-6 stroke-[2.5]" />
              </div>
              <span className="text-[9px] font-extrabold text-white mt-0.5 uppercase tracking-wider">
                Action
              </span>
            </button>
          </div>

          {/* 4. Onglet adaptatif selon l'offre de la ferme (Caisse, Œufs, Stocks, Santé ou Bâtiments) */}
          <Link
            href={dynamicTab.href}
            className={cn(
              "group relative flex flex-1 flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90",
              dynamicTab.active
                ? "text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200",
                dynamicTab.active
                  ? "bg-white/20 text-accent scale-110 ring-1 ring-white/30"
                  : "bg-transparent text-white/75 group-hover:bg-white/10 group-hover:text-white"
              )}
            >
              <DynamicTabIcon className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "text-[10px] leading-none mt-1 tracking-tight",
                dynamicTab.active ? "font-bold text-accent" : "font-medium text-white/80"
              )}
            >
              {dynamicTab.label}
            </span>
            {dynamicTab.active && (
              <span className="h-1 w-1 rounded-full bg-accent mt-0.5 animate-in zoom-in-50" />
            )}
          </Link>

          {/* 5. Menu Complet */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="group relative flex flex-1 flex-col items-center justify-center py-1.5 text-white/75 hover:text-white transition-all duration-200 active:scale-90 focus:outline-none cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-transparent text-white/75 group-hover:bg-white/10 group-hover:text-white transition-all">
              <Menu className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium leading-none mt-1 tracking-tight text-white/80">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* ─── ACTION SHEET MOBILE NATIVE (CONDITIONNÉE STRICTEMENT PAR L'ABONNEMENT ET LES RÔLES) ─── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          {/* Backdrop avec flou doux */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet Drawer */}
          <div
            className="relative z-10 w-full rounded-t-[32px] border-t border-border bg-surface p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}
          >
            {/* Grab handle bar */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

            {/* En-tête de la feuille */}
            <div className="flex items-center justify-between pb-3.5 border-b border-border">
              <div>
                <h3 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Saisie rapide</span>
                </h3>

              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground transition-colors active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Grille d'actions tactiles strictement filtrées */}
            {!hasAnyAction ? (
              <div className="py-8 text-center text-xs text-muted">
                Aucune action
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {/* 1. Ramassage d'œufs (Module 'eggs' + permission egg:create) */}
                {canCreateEgg && (
                  <button
                    type="button"
                    onClick={() => triggerAction("egg")}
                    className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-left transition-all active:scale-95 hover:bg-amber-500/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-500/20">
                      <Egg className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Ponte d'œufs</div>
                      <div className="text-[10px] text-muted">Ramassage du lot</div>
                    </div>
                  </button>
                )}

                {/* 2. Nourrir / Alimentation (Module 'inventory' ou 'feed_rationing' + permission) */}
                {canFeed && (
                  <button
                    type="button"
                    onClick={() => triggerAction("feed")}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-left transition-all active:scale-95 hover:bg-emerald-500/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                      <Utensils className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Nourrir</div>
                      <div className="text-[10px] text-muted">Distribution aliment</div>
                    </div>
                  </button>
                )}

                {/* 3. Mortalité ou Sortie (Permission flock:movement / flock:update) */}
                {canRecordMovement && (
                  <button
                    type="button"
                    onClick={() => triggerAction("movement")}
                    className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-left transition-all active:scale-95 hover:bg-rose-500/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 border border-rose-500/20">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Mortalité</div>
                      <div className="text-[10px] text-muted">Perte ou sortie</div>
                    </div>
                  </button>
                )}

                {/* 4. Vente / Encaissement (Module 'finance' + permission finance:create) */}
                {canCreateFinance && (
                  <button
                    type="button"
                    onClick={() => triggerAction("income")}
                    className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-left transition-all active:scale-95 hover:bg-primary/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/20">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Vente / Recette</div>
                      <div className="text-[10px] text-muted">Encaissement client</div>
                    </div>
                  </button>
                )}

                {/* 5. Dépense / Achat (Module 'finance' + permission finance:create) */}
                {canCreateFinance && (
                  <button
                    type="button"
                    onClick={() => triggerAction("expense")}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface-muted/60 p-3.5 text-left transition-all active:scale-95 hover:bg-surface-muted"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-foreground border border-border">
                      <ArrowDownRight className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Dépense</div>
                      <div className="text-[10px] text-muted">Achat ou charge</div>
                    </div>
                  </button>
                )}

                {/* 6. Soin / Traitement (Module 'health' + permission health:manage) */}
                {canManageHealth && (
                  <button
                    type="button"
                    onClick={() => triggerAction("health")}
                    className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 text-left transition-all active:scale-95 hover:bg-sky-500/10"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 border border-sky-500/20">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Soin / Vaccin</div>
                      <div className="text-[10px] text-muted">Suivi vétérinaire</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
