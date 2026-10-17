"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bird,
  Egg,
  Package,
  Wallet,
  ShieldCheck,
  KeyRound,
  Users,
  X,
  Sparkles,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, role, hasPermission, activeFarm } = useAuth();

  const navigation = [
    {
      name: "Tableau de bord",
      href: "/",
      icon: LayoutDashboard,
      show: true,
    },
    {
      name: "Poules & Bandes",
      href: "/flocks",
      icon: Bird,
      show: hasPermission("flock:read"),
    },
    {
      name: "Production d'œufs",
      href: "/eggs",
      icon: Egg,
      show: hasPermission("egg:read"),
    },
    {
      name: "Stocks & Aliments",
      href: "/inventory",
      icon: Package,
      show: hasPermission("inventory:read"),
    },
    {
      name: "Trésorerie & Ventes",
      href: "/finances",
      icon: Wallet,
      show: hasPermission("finance:read"),
    },
    {
      name: "Paramètres de la ferme",
      href: "/settings/farm",
      icon: Settings,
      show: true,
    },
    {
      name: "Utilisateurs & Employés",
      href: "/settings/members",
      icon: Users,
      show: true,
    },
    {
      name: "Rôles & Permissions",
      href: "/settings/roles",
      icon: ShieldCheck,
      show: hasPermission("role:read") || user?.roles.includes("ROLE_ADMIN"),
    },
    {
      name: "Clés API Développeur",
      href: "/developer",
      icon: KeyRound,
      show: hasPermission("farm:update") || user?.roles.includes("ROLE_ADMIN"),
    },
  ];

  const filteredNav = navigation.filter((item) => item.show);

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
          {filteredNav.map((item) => {
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
                {item.href === "/developer" && (
                  <span className="ml-auto rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-mono text-accent">
                    API
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Role Badge & Farm info */}
        <div className="border-t border-border p-4">
          <div className="rounded-xl bg-surface-muted p-3">
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span>Rôle actif</span>
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="font-bold text-xs text-foreground truncate">
              {role?.name || (user?.roles.includes("ROLE_ADMIN") ? "Administrateur" : "Utilisateur")}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
              {activeFarm?.name || "Aucune ferme"}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
