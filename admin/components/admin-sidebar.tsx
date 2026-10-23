"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/context/admin-auth-context";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  Activity,
  LogOut,
  ExternalLink,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navigationItems = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
    permission: "admin:dashboard:view",
  },
  {
    label: "Organisations",
    href: "/organizations",
    icon: Building2,
    permission: "admin:organizations:view",
  },
  {
    label: "Utilisateurs",
    href: "/users",
    icon: Users,
    permission: "admin:users:view",
  },
  {
    label: "Rôles",
    href: "/roles",
    icon: KeyRound,
    permission: "admin:roles:view",
  },
  {
    label: "Abonnements",
    href: "/subscriptions",
    icon: CreditCard,
    permission: "admin:subscriptions:view",
  },
  {
    label: "Journal d'audit",
    href: "/audit",
    icon: ShieldCheck,
    permission: "admin:audit:view",
  },
  {
    label: "État système",
    href: "/health",
    icon: Activity,
    permission: "admin:health:view",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAdminAuth();

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AD"
    : "AD";

  const roleLabel = user?.adminRole?.name || (user?.roles?.includes("ROLE_SUPER_ADMIN") ? "Super-Admin" : "Collaborateur");

  const visibleNavItems = navigationItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-foreground">Lefermier</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-muted">Espace administration</p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1">
          <p className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
            Menu
          </p>
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-muted")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

     
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-border/70 bg-surface-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.fullName || user?.email || "Administrateur"}
              </p>
              <Badge variant="success" className="text-[10px] px-1.5 py-0 truncate max-w-[130px]" title={roleLabel}>
                {roleLabel}
              </Badge>
            </div>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
