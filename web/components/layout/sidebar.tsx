"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bird,
  Warehouse,
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
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission, hasModule, activePlan, isOwner } = useAuth();

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/",
      icon: LayoutDashboard,
      module: undefined,
      show: true,
    },
    {
      name: "Poulaillers & Bâtiments",
      href: "/buildings",
      icon: Warehouse,
      module: "buildings",
      show: hasPermission("building:manage") || hasPermission("farm:view"),
    },
    {
      name: "Bandes de volailles",
      href: "/flocks",
      icon: Bird,
      module: "flocks",
      show: hasPermission("flock:read") || hasPermission("flock:view"),
    },
    {
      name: "Pontes d'œufs",
      href: "/eggs",
      icon: Egg,
      module: "eggs",
      show: hasPermission("egg:read") || hasPermission("egg:view"),
    },
    {
      name: "Santé & Soins",
      href: "/health",
      icon: HeartPulse,
      module: "health",
      show: hasPermission("health:view") || hasPermission("health:manage"),
    },
    {
      name: "Stocks & Intrants",
      href: "/inventory",
      icon: Package,
      module: "inventory",
      show: hasPermission("inventory:read") || hasPermission("inventory:view"),
    },
    {
      name: "Trésorerie & Ventes",
      href: "/finances",
      icon: Wallet,
      module: "finance",
      show: hasPermission("finance:read") || hasPermission("finance:view"),
    },
    {
      name: "Contacts & Tiers",
      href: "/contacts",
      icon: ContactRound,
      module: "contacts",
      show: hasPermission("contact:read") || hasPermission("contact:view"),
    },
    {
      name: "Équipe & Accès",
      href: "/settings/members",
      icon: Users,
      module: "team",
      show: hasPermission("member:manage") || hasPermission("member:read"),
    },
    {
      name: "Rôles & Permissions",
      href: "/settings/roles",
      icon: ShieldCheck,
      module: "custom_roles",
      show: hasPermission("role:manage") || hasPermission("role:read"),
    },
    {
      name: "Mon abonnement",
      href: "/settings/subscription",
      icon: CreditCard,
      module: undefined,
      show: isOwner,
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col rounded-r-3xl border-r border-white/10 bg-gradient-to-b from-[#1b4331] via-[#163627] to-[#11291d] text-white shadow-2xl transition-transform duration-250 ease-out lg:static lg:w-64 lg:rounded-none lg:shadow-none lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header / Brand */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 text-lg font-bold tracking-tight text-white group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-md border border-white/20 group-hover:scale-105 transition-transform">
              <Bird className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-extrabold text-white tracking-tight">
                Lefermier
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-white/60">
                Bénin & Ouest-Afrik
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-4 scrollbar-thin">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-white/50">
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
                  "group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition-all active:scale-[0.98]",
                  isActive
                    ? "bg-white/15 text-white shadow-xs ring-1 ring-white/20 font-bold"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                {/* Indicateur vertical d'onglet actif */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent shadow-[0_0_8px_rgba(221,166,75,0.9)]" />
                )}

                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-accent" : "text-white/70 group-hover:text-white"
                  )}
                />
                <span className="truncate">{item.name}</span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(221,166,75,0.9)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer avec formule active (réservé au propriétaire) */}
        {isOwner && (
          <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              href="/settings/subscription"
              onClick={onClose}
              className="block rounded-2xl bg-white/10 border border-white/15 p-3.5 hover:bg-white/15 hover:border-accent/40 transition-all group shadow-2xs"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60 group-hover:text-accent transition-colors">
                Formule de la ferme
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">
                  {activePlan?.planName || "Formule Starter"}
                </span>
                <span className="rounded-full bg-accent text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                  {activePlan?.badge || activePlan?.plan || "Gratuit"}
                </span>
              </div>
              <div className="mt-1.5 text-[10px] text-white/70 group-hover:text-accent transition-colors flex items-center gap-1 font-medium">
                <CreditCard className="h-3 w-3 text-accent" />
                Gérer mon abonnement →
              </div>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
