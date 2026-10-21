"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4500) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = {
    success: (msg: string, title?: string) => addToast("success", msg, title || "Succès"),
    error: (msg: string, title?: string) => addToast("error", msg, title || "Erreur"),
    warning: (msg: string, title?: string) => addToast("warning", msg, title || "Attention"),
    info: (msg: string, title?: string) => addToast("info", msg, title || "Information"),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      {/* Container Toast Notifications */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex max-w-sm w-full flex-col gap-2.5 pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-top-3 duration-200 ${
              t.type === "error"
                ? "bg-danger/10 border-danger/30 text-danger"
                : t.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : t.type === "warning"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                : "bg-primary/10 border-primary/30 text-primary"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "error" && <AlertCircle className="h-5 w-5" />}
              {t.type === "success" && <CheckCircle2 className="h-5 w-5" />}
              {t.type === "warning" && <AlertTriangle className="h-5 w-5" />}
              {t.type === "info" && <Info className="h-5 w-5" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="font-bold text-xs tracking-tight mb-0.5">{t.title}</div>
              )}
              <div className="text-xs font-medium text-foreground leading-relaxed break-words">
                {t.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded-lg p-1 text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
