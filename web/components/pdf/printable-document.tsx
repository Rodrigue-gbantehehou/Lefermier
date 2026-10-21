"use client";

import React from "react";
import { Farm } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export interface SignatureBlock {
  title: string;
  subtitle?: string;
  signatoryName?: string;
  hasStampBox?: boolean;
}

export interface PrintableDocumentProps {
  id?: string;
  title: string;
  subtitle?: string;
  documentNumber?: string;
  date?: string | Date;
  farm: Farm | null;
  badge?: {
    text: string;
    variant?: "success" | "warning" | "danger" | "info" | "neutral" | "primary";
  };
  recipient?: {
    label: string; // e.g. "Destinataire / Client"
    name: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
  };
  orientation?: "portrait" | "landscape";
  watermark?: string;
  signatures?: SignatureBlock[];
  notes?: string;
  children: React.ReactNode;
  className?: string;
}

export function PrintableDocument({
  id = "printable-document",
  title,
  subtitle,
  documentNumber,
  date = new Date(),
  farm,
  badge,
  recipient,
  orientation = "portrait",
  watermark,
  signatures,
  notes,
  children,
  className = "",
}: PrintableDocumentProps) {
  const formattedDate =
    typeof date === "string" ? formatDate(date) : formatDate(date.toISOString());

  const generationTimestamp = new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const badgeColors = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-300",
    warning: "bg-amber-50 text-amber-800 border-amber-300",
    danger: "bg-rose-50 text-rose-800 border-rose-300",
    info: "bg-sky-50 text-sky-800 border-sky-300",
    neutral: "bg-zinc-100 text-zinc-800 border-zinc-300",
    primary: "bg-emerald-700 text-white border-emerald-800",
  };

  return (
    <>
      {/* High-fidelity Print Styles injected for this document */}
      <style jsx global>{`
        @media print {
          /* Hide all application elements */
          body * {
            visibility: hidden;
          }

          /* Display only this printable document */
          #${id},
          #${id} * {
            visibility: visible;
          }

          #${id} {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            background: #ffffff !important;
            color: #09090b !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: A4 ${orientation};
            margin: 10mm 12mm;
          }

          .no-print {
            display: none !important;
          }

          /* Force page-break safety */
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Main Printable Sheet (Visual paper preview on screen) */}
      <div
        id={id}
        className={`relative mx-auto w-full bg-white text-zinc-900 border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm print:p-0 print:border-none print:shadow-none print:rounded-none font-sans text-xs ${
          orientation === "landscape" ? "max-w-[1000px]" : "max-w-[820px]"
        } ${className}`}
      >
        {/* Optional Watermark */}
        {watermark && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04] print:opacity-[0.06] select-none z-0">
            <span className="text-8xl sm:text-9xl font-black tracking-widest text-zinc-900 -rotate-45 uppercase">
              {watermark}
            </span>
          </div>
        )}

        {/* Content container relative to watermark */}
        <div className="relative z-10 flex flex-col min-h-full">
          {/* =========================================================================
              1. OFFICIAL HEADER (Farm Identity + Document Box)
              ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b-2 border-emerald-700 pb-5 mb-5 gap-4">
            {/* Left: Farm Identity */}
            <div className="space-y-1 sm:max-w-[55%]">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-emerald-800 uppercase">
                  {farm?.name || "Lefermier - Exploitation Avicole"}
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 font-medium">
                {farm?.description || "Production Avicole, Vente d'Œufs & Poulets de Chair"}
              </p>

              <div className="text-[11px] text-zinc-700 space-y-0.5 pt-1">
                {farm?.address && <div>Lieu: {farm.address}{farm.locationCity ? `, ${farm.locationCity}` : ""}</div>}
                {!farm?.address && farm?.locationCity && <div>Lieu: {farm.locationCity}, République du Bénin</div>}
                {!farm?.address && !farm?.locationCity && farm?.location && <div>Lieu: {farm.location}, République du Bénin</div>}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-zinc-600">
                  {farm?.phone && <span>Tél : {farm.phone}</span>}
                  {farm?.email && <span>Email : {farm.email}</span>}
                </div>

                {(farm?.ifu || farm?.rccm) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-500 pt-0.5 font-mono">
                    {farm?.ifu && <span>N° IFU : <strong className="text-zinc-800">{farm.ifu}</strong></span>}
                    {farm?.rccm && <span>RCCM : <strong className="text-zinc-800">{farm.rccm}</strong></span>}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Document Identity Box */}
            <div className="sm:text-right flex flex-col sm:items-end justify-between self-stretch shrink-0">
              <div className="space-y-1">
                <div className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-zinc-900">
                  {title}
                </div>
                {subtitle && (
                  <div className="text-[11px] text-zinc-500 font-medium">{subtitle}</div>
                )}
              </div>

              <div className="mt-3 sm:mt-auto pt-2 space-y-1">
                {documentNumber && (
                  <div className="text-xs font-mono font-bold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md inline-block">
                    Réf : {documentNumber}
                  </div>
                )}

                <div className="text-[11px] text-zinc-600">
                  Date : <span className="font-semibold text-zinc-900">{formattedDate}</span>
                </div>

                {badge && (
                  <div className="pt-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                        badgeColors[badge.variant || "neutral"]
                      }`}
                    >
                      {badge.text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. OPTIONAL RECIPIENT CARD (Client, Partner, Veterinarian)
              ========================================================================= */}
          {recipient && (
            <div className="mb-5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-1 text-xs page-break-avoid">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                {recipient.label} :
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="font-bold text-zinc-900 text-sm">{recipient.name}</span>
                {recipient.phone && (
                  <span className="font-mono text-zinc-700">Tel : {recipient.phone}</span>
                )}
              </div>
              {(recipient.address || recipient.email) && (
                <div className="text-[11px] text-zinc-600 flex flex-wrap gap-x-3">
                  {recipient.address && <span>Lieu : {recipient.address}</span>}
                  {recipient.email && <span>Email : {recipient.email}</span>}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              3. MAIN DOCUMENT BODY (Injected Children)
              ========================================================================= */}
          <div className="flex-1 space-y-5">{children}</div>

          {/* =========================================================================
              4. OPTIONAL FOOTER NOTES
              ========================================================================= */}
          {notes && (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3 text-[11px] text-zinc-600 page-break-avoid">
              <span className="font-bold text-zinc-700 block mb-0.5">Observations & Conditions :</span>
              <p className="whitespace-pre-line leading-relaxed">{notes}</p>
            </div>
          )}

          {/* =========================================================================
              5. OFFICIAL SIGNATURES & STAMPS
              ========================================================================= */}
          {signatures && signatures.length > 0 && (
            <div className="mt-8 pt-4 border-t border-zinc-200 grid grid-cols-2 gap-6 text-xs page-break-avoid">
              {signatures.map((sig, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border border-zinc-200 p-3.5 flex flex-col justify-between min-h-[110px] ${
                    idx === signatures.length - 1 ? "text-right items-end" : "text-left items-start"
                  }`}
                >
                  <div>
                    <span className="font-bold text-zinc-900 block">{sig.title}</span>
                    {sig.subtitle && (
                      <span className="text-[10px] text-zinc-500 block">{sig.subtitle}</span>
                    )}
                  </div>

                  {sig.hasStampBox && (
                    <div className="w-full text-center py-2 text-[10px] text-zinc-400 italic font-mono border-t border-dashed border-zinc-200 mt-4">
                      [ Cachet & Signature ]
                    </div>
                  )}

                  {sig.signatoryName && (
                    <span className="text-[11px] font-semibold text-zinc-700 mt-2">
                      {sig.signatoryName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* =========================================================================
              6. LEGAL FOOTER
              ========================================================================= */}
          <div className="mt-8 pt-3 border-t border-zinc-200 text-[10px] text-zinc-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 page-break-avoid">
            <div>
              Édité le {generationTimestamp} via <strong>Lefermier ERP</strong> • Système avicole certifié
            </div>
            <div className="font-mono text-zinc-500">
              Page 1 / 1
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
