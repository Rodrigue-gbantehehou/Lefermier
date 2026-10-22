import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accent?: "primary" | "amber" | "rose" | "sky" | "zinc";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = "primary",
  className,
}: StatCardProps) {
  const iconContainerStyles = {
    primary: "bg-primary-soft text-primary border border-primary/20",
    amber: "bg-accent-soft text-accent border border-accent/20",
    rose: "bg-danger-soft text-danger border border-danger/20",
    sky: "bg-info-soft text-info border border-info/20",
    zinc: "bg-surface-muted text-muted border border-border",
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted truncate">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {value}
            </span>
          </div>
        </div>

        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 [&>svg]:h-5 [&>svg]:w-5",
              iconContainerStyles[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          {subtitle && (
            <p className="text-xs text-muted truncate max-w-[75%]">{subtitle}</p>
          )}

          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border shrink-0",
                trend.isPositive
                  ? "bg-success-soft text-success border-success/20"
                  : "bg-danger-soft text-danger border-danger/20"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 shrink-0 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 shrink-0 text-danger" />
              )}
              <span>{trend.value}</span>
              {trend.label && <span className="text-muted ml-0.5 font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
