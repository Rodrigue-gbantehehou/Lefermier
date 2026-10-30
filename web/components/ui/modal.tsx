"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "lg",
  className = "",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[9999] overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centering wrapper on desktop, bottom sheet on mobile */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-6 text-center">
        {/* Modal Dialog Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative z-10 w-full transform rounded-t-2xl sm:rounded-xl border-t sm:border border-border bg-surface p-5 sm:p-6 text-left shadow-2xl transition-all max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200",
            maxWidthStyles[maxWidth],
            className
          )}
        >
          {/* Mobile swipe handle */}
          <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 rounded-full bg-border/80 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-border shrink-0">
            <div>
              <h3 id="modal-title" className="text-base sm:text-lg font-bold text-foreground">
                {title}
              </h3>
              {description && (
                <p className="mt-1 text-xs text-muted">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors ml-4 shrink-0"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Fermer</span>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto py-4 flex-1">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="mt-4 pt-3 border-t border-border shrink-0 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
