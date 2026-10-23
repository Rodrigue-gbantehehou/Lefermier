"use client";

import React from "react";
import { ShieldCheck, Search, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function AdminHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Barre de recherche rapide globale */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 text-xs h-9 bg-surface-muted/40"
          />
        </div>

        <button
          className="relative p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  );
}
