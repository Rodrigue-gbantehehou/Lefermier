import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-10 text-center bg-surface/50",
        className
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs text-muted">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
