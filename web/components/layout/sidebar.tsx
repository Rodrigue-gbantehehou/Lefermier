"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bird,
  Egg,
  HeartPulse,
  Package,
  Wallet,
  ContactRound,
  ShieldCheck,
  Users,
  X,
  Settings,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission, hasModule, activePlan } = useAuth();

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/",
      icon: LayoutDashboard,
      module: undefined,
      show: true,
    },
    {
      name: "Poules & Bandes",
      href: "/flocks",
      icon: Bird,
      module: "flocks",
      show: hasPermission("flock:read"),
    },
    {
      name: "Production d'œufs",
      href: "/eggs",
      icon: Egg,
      module: "eggs",
      show: hasPermission("egg:read"),
    },
    {
      name: "Santé & Vaccins",
      href: "/health",
      icon: HeartPulse,
      module: "health",
      show: hasPermission("health:view") || true,
    },
    {
      name: "Stocks & Aliments",
      href: "/inventory",
      icon: Package,
      module: "inventory",
      show: hasPermission("inventory:read"),
    },
    {
      name: "Trésorerie & Ventes",
      href: "/finances",
      icon: Wallet,
      module: "finance",
      show: hasPermission("finance:read"),
    },
    {
      name: "Contacts & Tiers",
      href: "/contacts",
      icon: ContactRound,
      module: "contacts",
      show: hasPermission("contact:read") || hasPermission("contact:view"),
    },
    {
      name: "Utilisateurs & Employés",
      href: "/settings/members",
      icon: Users,
      module: "team",
      show: true,
    },
    {
      name: "Rôles & Permissions",
      href: "/settings/roles",
      icon: ShieldCheck,
      module: "team",
      show: hasPermission("role:read") || user?.roles.includes("ROLE_ADMIN"),
    },
    {
      name: "Paramètres de la ferme",
      href: "/settings/farm",
      icon: Settings,
      module: undefined,
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header / Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 text-lg font-bold tracking-tight text-foreground"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Bird className="h-6 w-6 text-accent" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-extrabold text-primary">
                Lefermier
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-muted">
                Bénin & Ouest-Afrik
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-muted">
            Exploitation
          </div>
          {navigation.map((item) => {
            const isModuleAllowed = item.module ? hasModule(item.module) : true;

            // Ne pas afficher les modules non concernés par l'offre ou non autorisés par le rôle
            if (!isModuleAllowed || !item.show) {
              return null;
            }

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-muted group-hover:text-primary"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer avec formule active */}
        <div className="border-t border-border p-4">
          <div className="rounded-xl bg-surface-hover/80 border border-border p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Formule de la ferme
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground truncate">
                {activePlan?.planName || "Formule Starter"}
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {activePlan?.badge || activePlan?.plan || "Gratuit"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
