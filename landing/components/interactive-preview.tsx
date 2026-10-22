"use client";

import React, { useState } from "react";
import {
  Egg,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function InteractivePreview() {
  const [goodEggs, setGoodEggs] = useState<number>(455);
  const [brokenEggs, setBrokenEggs] = useState<number>(5);
  const [flockCount, setFlockCount] = useState<number>(550);
  const [session, setSession] = useState<"matin" | "midi" | "soir">("matin");

  // Zootechnical calculations
  const trays = Math.floor(goodEggs / 30);
  const loose = goodEggs % 30;
  const layingRate = flockCount > 0 ? ((goodEggs / flockCount) * 100).toFixed(1) : "0";

  function formatEggTrays(t: number, l: number, total: number) {
    if (total <= 0) return "0 œuf";
    if (total < 30) return `${total} œuf${total > 1 ? "s" : ""}`;
    if (l === 0) return `${t} plateau${t > 1 ? "x" : ""}`;
    return `${t} plateau${t > 1 ? "x" : ""} + ${l} œuf${l > 1 ? "s" : ""}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section id="preview" className="py-20 bg-surface border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-bold text-accent-hover">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulateur Interactif en direct</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Testez vous-même la précision du calcul en{" "}
            <span className="text-accent-hover">plateaux de 30</span>
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Modifiez le nombre d'œufs récoltés ci-dessous pour voir comment Lefermier
            convertit instantanément vos chiffres et calcule votre taux de ponte.
          </p>
        </div>

        {/* Interactive Box */}
        <div className="mt-12 max-w-4xl mx-auto rounded-3xl border border-border bg-background p-6 sm:p-8 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Input Controls */}
            <div className="lg:col-span-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  1. Moment du ramassage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["matin", "midi", "soir"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSession(s)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${
                        session === s
                          ? "border-accent bg-accent text-white shadow-xs"
                          : "border-border bg-surface text-muted hover:bg-surface-hover"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-foreground">
                    2. Nombre de bons œufs vendables
                  </label>
                  <span className="text-xs font-mono font-bold text-accent">
                    {goodEggs} œufs
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1200"
                  step="5"
                  value={goodEggs}
                  onChange={(e) => setGoodEggs(parseInt(e.target.value) || 0)}
                  className="w-full accent-accent cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted font-mono mt-1">
                  <span>0</span>
                  <span>300 (10 plateaux)</span>
                  <span>600 (20 plateaux)</span>
                  <span>1 200 (40 plateaux)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-danger mb-1">
                    Œufs cassés / fêlés
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={brokenEggs}
                    onChange={(e) => setBrokenEggs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full rounded-xl border border-danger/30 bg-surface p-2 text-xs font-mono font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-primary mb-1">
                    Effectif de poules
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={flockCount}
                    onChange={(e) => setFlockCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-primary/30 bg-surface p-2 text-xs font-mono font-bold text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Live Visual Result */}
            <div className="lg:col-span-6 rounded-2xl border border-accent/20 bg-surface p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Egg className="h-4 w-4 text-accent" />
                  Résultat instantané Lefermier
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent">
                  Session du {session}
                </span>
              </div>

              {/* Main Badge */}
              <div className="p-4 rounded-xl border border-accent/30 bg-accent-soft/40 text-center">
                <span className="text-[11px] font-bold text-muted block uppercase tracking-wider">
                  Total conditionné
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-accent block my-1">
                  {formatEggTrays(trays, loose, goodEggs)}
                </span>
                <span className="text-xs font-mono text-muted">
                  Exactement {goodEggs} bons œufs ({trays} × 30 + {loose})
                </span>
              </div>

              {/* Laying rate & Losses */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-xl border border-border bg-surface-muted">
                  <span className="text-[10px] text-muted block">Taux de ponte calculé</span>
                  <span className="text-base font-bold font-mono text-primary block mt-0.5">
                    {layingRate} %
                  </span>
                  <span className="text-[10px] text-muted">
                    {Number(layingRate) >= 75 ? "Très bonne ponte" : "Ponte modérée"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl border border-border bg-surface-muted">
                  <span className="text-[10px] text-muted block">Pertes (œufs cassés)</span>
                  <span className="text-base font-bold font-mono text-danger block mt-0.5">
                    {brokenEggs > 0 ? `-${brokenEggs}` : "0"}
                  </span>
                  <span className="text-[10px] text-muted">Exclus de la vente</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <a
                  href={`${appUrl}/register`}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <span>Créer ma ferme pour enregistrer mes pontes</span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
