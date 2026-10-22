import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  dot?: boolean;
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-primary text-white",
    secondary: "border-border bg-surface-muted text-foreground",
    destructive: "border-danger/30 bg-danger-soft text-danger",
    outline: "border-border text-foreground bg-transparent",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    info: "border-info/30 bg-info-soft text-info",
  };

  const dotColors = {
    default: "bg-white",
    secondary: "bg-muted",
    destructive: "bg-danger",
    outline: "bg-foreground",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </div>
  );
}
