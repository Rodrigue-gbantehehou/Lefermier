import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading = false, children, disabled, ...props }, ref) => {
    const variantStyles = {
      default: "bg-primary text-white hover:bg-primary-hover shadow-xs active:scale-[0.99]",
      destructive: "bg-danger text-white hover:opacity-90 shadow-xs",
      outline: "border border-border bg-surface text-foreground hover:bg-surface-hover hover:border-foreground/30",
      secondary: "bg-surface-muted text-foreground hover:bg-surface-hover border border-border/60",
      ghost: "hover:bg-surface-hover text-foreground",
      link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      success: "bg-success text-white hover:opacity-90 shadow-xs",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs font-medium",
      lg: "h-11 rounded-lg px-6 text-base font-semibold",
      icon: "h-9 w-9 p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
