"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  icon,
  actions,
  backHref,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2.5 pb-2.5 sm:pb-3.5",
        className
      )}
    >
      {/* Gauche : Retour optionnel + Icône + Titre & Sous-titre */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-2xs hover:bg-surface-hover active:scale-90 transition-transform cursor-pointer"
            title="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <div className="text-[11px] font-medium text-muted truncate leading-tight">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Droite : Actions mobiles compactes (pills tactiles arrondies) */}
      {actions && (
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
