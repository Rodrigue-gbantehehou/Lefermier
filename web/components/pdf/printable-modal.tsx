"use client";

import React, { useState } from "react";
import { Printer, Download, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Farm } from "@/lib/types";
import { downloadApiFile } from "@/lib/api/client";

export interface PrintableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  farm: Farm | null;
  onPrint?: () => void;
  downloadEndpoint?: string;
  defaultFilename?: string;
  children: React.ReactNode;
}

export function PrintableModal({
  isOpen,
  onClose,
  title,
  description,
  farm,
  onPrint,
  downloadEndpoint,
  defaultFilename = "document.pdf",
  children,
}: PrintableModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function handlePrint() {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  }

  async function handleDownloadBackendPdf() {
    if (!downloadEndpoint) return;
    try {
      setIsDownloading(true);
      setDownloadError(null);
      await downloadApiFile(downloadEndpoint, defaultFilename);
    } catch (err: any) {
      setDownloadError(err?.message || "Erreur lors du téléchargement du PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  const missingCoords = !farm?.phone || !farm?.address;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description || "Format A4 optimisé pour l'impression ou l'export PDF numérique."}
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Missing Farm Coords alert (Screen only) */}
        {missingCoords && (
          <div className="no-print flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-xs text-warning">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
              <span>
                Les coordonnées de la ferme sont incomplètes (Tél, Adresse, IFU).
              </span>
            </div>
            <a
              href="/settings/farm"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline ml-2 shrink-0 hover:text-warning-hover transition-colors"
            >
              Compléter dans Paramètres →
            </a>
          </div>
        )}

        {/* Download Error Alert */}
        {downloadError && (
          <div className="no-print flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Toolbar (Print / PDF + Close) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2 border-b border-border">
          <div className="text-xs text-muted">
            💡 Astuce : Téléchargez le <strong>PDF officiel généré par le serveur</strong> ou imprimez directement.
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Fermer
            </button>

            {downloadEndpoint && (
              <button
                type="button"
                onClick={handleDownloadBackendPdf}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                title="Génère et télécharge le fichier PDF natif côté serveur"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Télécharger PDF (Serveur)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        {/* Printable Document Container (Scrollable on small screens) */}
        <div className="overflow-x-auto py-2 bg-zinc-100/60 dark:bg-zinc-950/40 rounded-xl p-2 sm:p-4">
          {children}
        </div>
      </div>
    </Modal>
  );
}
