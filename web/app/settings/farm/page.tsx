"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Settings,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";

export default function FarmSettingsPage() {
  const { activeFarm, refreshMe } = useAuth();

  // Farm Details Form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [productionType, setProductionType] = useState<"LAYER" | "BROILER" | "MIXED">("LAYER");
  const [locationCity, setLocationCity] = useState("");
  const [locationCountry, setLocationCountry] = useState("BJ");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [ifu, setIfu] = useState("");
  const [rccm, setRccm] = useState("");
  const [description, setDescription] = useState("");
  const [savingFarm, setSavingFarm] = useState(false);
  const [farmSuccessMsg, setFarmSuccessMsg] = useState<string | null>(null);
  const [farmErrorMsg, setFarmErrorMsg] = useState<string | null>(null);

  // Sync form with active farm
  useEffect(() => {
    if (activeFarm) {
      setName(activeFarm.name || "");
      setCode(activeFarm.code || "");
      setProductionType(activeFarm.productionType || "LAYER");
      setLocationCity(activeFarm.locationCity || activeFarm.location || "");
      setLocationCountry(activeFarm.locationCountry || "BJ");
      setPhone(activeFarm.phone || "");
      setEmail(activeFarm.email || "");
      setAddress(activeFarm.address || "");
      setIfu(activeFarm.ifu || "");
      setRccm(activeFarm.rccm || "");
      setDescription(activeFarm.description || "");
    }
  }, [activeFarm]);

  async function handleSaveFarm(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarm?.id || !name.trim()) return;

    setSavingFarm(true);
    setFarmSuccessMsg(null);
    setFarmErrorMsg(null);

    try {
      await api.farms.update(activeFarm.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        productionType,
        locationCity: locationCity.trim() || undefined,
        locationCountry,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        ifu: ifu.trim() || undefined,
        rccm: rccm.trim() || undefined,
        description: description.trim() || undefined,
      });

      await refreshMe();
      setFarmSuccessMsg("Les informations et coordonnées de l'exploitation ont été enregistrées avec succès !");
      setTimeout(() => setFarmSuccessMsg(null), 4000);
    } catch (err: any) {
      setFarmErrorMsg(err?.message || "Erreur lors de la mise à jour de l'exploitation.");
    } finally {
      setSavingFarm(false);
    }
  }

  return (
    <Shell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-primary" />
            <span>Paramètres de l'exploitation</span>
          </h1>
          <p className="mt-1 text-xs text-muted">
            Gérez l'identité légale, la localisation et les coordonnées de facturation de votre ferme.
          </p>
        </div>

        {activeFarm && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Ferme active :</span>
            <span className="rounded-xl bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              {activeFarm.name}
            </span>
          </div>
        )}
      </div>

      {!activeFarm ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center max-w-lg mx-auto">
          <Building2 className="mx-auto h-12 w-12 text-muted mb-3" />
          <h2 className="text-base font-bold text-foreground">Aucune exploitation active</h2>
          <p className="mt-1 text-xs text-muted">
            Veuillez sélectionner ou créer une ferme depuis l'en-tête pour configurer ses paramètres.
          </p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>Identité & Coordonnées</span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Informations principales visibles sur vos reçus de vente, rapports et documents.
                </p>
              </div>
              <Badge variant="success" size="sm">
                Exploitation Active
              </Badge>
            </div>

            {farmSuccessMsg && (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-success/20 bg-success-soft p-3 text-xs text-success font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{farmSuccessMsg}</span>
              </div>
            )}

            {farmErrorMsg && (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-soft p-3 text-xs text-danger font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{farmErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveFarm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Nom de l'exploitation avicole *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex. Ferme Avicole Calavi Élite"
                  className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Slogan & Activité de l'exploitation (visible sur les reçus et PDF)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex. Production Avicole, Vente d'Œufs & Poulets de Chair"
                  className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Sous-titre et activité imprimés sous le nom de votre ferme sur vos reçus de vente et rapports PDF.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Code identifiant court
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ex. FRM-CAL1"
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs font-mono text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Code court préfixant vos bandes et lots.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Type de production avicole
                  </label>
                  <select
                    value={productionType}
                    onChange={(e) => setProductionType(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  >
                    <option value="LAYER">Pondeuses (Œufs de table)</option>
                    <option value="BROILER">Poulets de chair</option>
                    <option value="MIXED">Mixte / Polyvalente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Commune / Ville d'implantation
                  </label>
                  <input
                    type="text"
                    value={locationCity}
                    onChange={(e) => setLocationCity(e.target.value)}
                    placeholder="ex. Calavi, Allada, Parakou"
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Pays
                  </label>
                  <select
                    value={locationCountry}
                    onChange={(e) => setLocationCountry(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  >
                    <option value="BJ">Bénin (BJ)</option>
                    <option value="TG">Togo (TG)</option>
                    <option value="CI">Côte d'Ivoire (CI)</option>
                    <option value="SN">Sénégal (SN)</option>
                    <option value="NG">Nigeria (NG)</option>
                  </select>
                </div>
              </div>

              {/* Coordonnées & Facturation (visibles sur les reçus de vente) */}
              <div className="pt-3 border-t border-border/70 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Coordonnées pour les Reçus de Vente & Documents Officiels</span>
                </div>
                <p className="text-[11px] text-muted">
                  Ces coordonnées figureront automatiquement en en-tête des reçus imprimables délivrés aux clients et revendeuses.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+229 97 00 00 00"
                        className="w-full rounded-xl border border-border bg-surface-muted pl-8 pr-3 py-2 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      E-mail de facturation
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@ferme.bj"
                        className="w-full rounded-xl border border-border bg-surface-muted pl-8 pr-3 py-2 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Adresse physique
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Quartier Dowa, Voie Pavée, Face CEG 2, Porto-Novo"
                    className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      N° IFU (Identifiant Fiscal Unique)
                    </label>
                    <input
                      type="text"
                      value={ifu}
                      onChange={(e) => setIfu(e.target.value)}
                      placeholder="3202012345678"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2 text-xs font-mono text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      N° RCCM (Registre du Commerce)
                    </label>
                    <input
                      type="text"
                      value={rccm}
                      onChange={(e) => setRccm(e.target.value)}
                      placeholder="RB/COT/20-B-1234"
                      className="w-full rounded-xl border border-border bg-surface-muted p-2 text-xs font-mono text-foreground focus:border-primary focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Devise de référence
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-muted">
                  <span className="font-bold text-foreground">Franc CFA (XOF)</span>
                  <span className="text-[11px]">— Devise standard UEMOA sans virgule flottante</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingFarm}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingFarm ? "Enregistrement..." : "Enregistrer les modifications"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
