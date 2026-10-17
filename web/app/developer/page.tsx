"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, Copy, Check, AlertTriangle, Terminal, Shield } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { DeveloperApiKey } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DeveloperKeysPage() {
  const { activeFarm, hasPermission } = useAuth();

  const [keys, setKeys] = useState<DeveloperApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate Key Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [submitting, setSubmitting] = useState(false);

  // Success / Raw Key Display Modal
  const [rawKeyModalOpen, setRawKeyModalOpen] = useState(false);
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeFarm?.id) {
      loadKeys();
    }
  }, [activeFarm?.id]);

  async function loadKeys(farmId?: string) {
    const targetFarmId = farmId || activeFarm?.id;
    if (!targetFarmId) return;
    setIsLoading(true);
    try {
      const data = await api.developer.listKeys(targetFarmId);
      setKeys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName || !activeFarm?.id) return;
    setSubmitting(true);
    try {
      const res = await api.developer.createKey(activeFarm.id, {
        name: keyName,
        environment,
      });
      setCreateModalOpen(false);
      setKeyName("");
      setGeneratedRawKey(res.rawKey || null);
      setRawKeyModalOpen(true);
      await loadKeys(activeFarm.id);
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la génération de la clé API");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Voulez-vous vraiment révoquer cette clé API ? Les applications l'utilisant cesseront immédiatement de fonctionner.")) {
      return;
    }
    if (!activeFarm?.id) return;
    try {
      await api.developer.deleteKey(activeFarm.id, id);
      await loadKeys(activeFarm.id);
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la révocation de la clé");
    }
  }

  function handleCopy() {
    if (generatedRawKey) {
      navigator.clipboard.writeText(generatedRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <Shell>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Clés API Développeur
          </h1>
          <p className="mt-1 text-xs text-muted">
            Générez des clés sécurisées (lef_live_... / lef_test_...) pour intégrer vos automates, balances ou ERP.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Générer une Clé API</span>
        </button>
      </div>

      {/* Security Callout */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-xs text-accent">
        <Shield className="h-5 w-5 shrink-0 text-accent" />
        <div>
          <span className="font-bold">Norme de sécurité Lefermier :</span>
          <p className="mt-0.5">
            Les clés API utilisent le préfixe <code className="font-mono font-bold">lef_live_</code> (production) ou <code className="font-mono font-bold">lef_test_</code> (bac à sable). Seul le hash cryptographique SHA-256 est persisté en base.
          </p>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        {keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-6 w-6 text-primary" />}
            title="Aucune clé API active"
            description="Créez votre première clé pour connecter vos capteurs IoT, balances ou applications externes."
            actionLabel="Créer une clé API"
            onAction={() => setCreateModalOpen(true)}
            className="my-4 border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="py-2.5 px-3 font-semibold rounded-l-lg">Intitulé</th>
                  <th className="py-2.5 px-3 font-semibold">Environnement</th>
                  <th className="py-2.5 px-3 font-semibold">Préfixe de la clé</th>
                  <th className="py-2.5 px-3 font-semibold">Dernière utilisation</th>
                  <th className="py-2.5 px-3 font-semibold">Date de création</th>
                  <th className="py-2.5 px-3 font-semibold text-center rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    className="hover:bg-surface-hover transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-foreground">
                      {k.name}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={k.environment === "live" ? "success" : "warning"}
                        size="sm"
                      >
                        {k.environment === "live" ? "Production" : "Test"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-muted">
                      {k.prefix}...
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {k.lastUsedAt ? formatDate(k.lastUsedAt) : "Jamais utilisée"}
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {formatDate(k.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id)}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger-soft transition-colors"
                        title="Révoquer cette clé"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Snippet Example */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Terminal className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Exemple d'appel cURL avec clé développeur
          </h2>
        </div>
        <div className="mt-3 rounded-xl bg-surface-muted p-4 font-mono text-xs text-foreground overflow-x-auto border border-border">
          <code>
            curl -X GET "http://127.0.0.1:8000/api/farms/{activeFarm?.id || '...'}/flocks" \<br />
            &nbsp;&nbsp;-H "X-API-KEY: lef_live_votreCleIci..." \<br />
            &nbsp;&nbsp;-H "Accept: application/json"
          </code>
        </div>
      </div>

      {/* CREATE KEY MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Générer une clé API Développeur"
        description="Donnez un nom d'usage pour identifier l'application ou l'automate qui l'utilisera."
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nom de la clé / Application
            </label>
            <input
              type="text"
              required
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="ex. Balance connectée Hangar 2, Export ERP Odoo"
              className="w-full rounded-xl border border-border bg-surface-muted p-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Environnement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnvironment("live")}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  environment === "live"
                    ? "border-success bg-success text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Production (lef_live_...)
              </button>
              <button
                type="button"
                onClick={() => setEnvironment("test")}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  environment === "test"
                    ? "border-warning bg-warning text-white"
                    : "border-border bg-surface text-muted"
                }`}
              >
                Test / Sandbox (lef_test_...)
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-hover"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              {submitting ? "Génération..." : "Créer la clé"}
            </button>
          </div>
        </form>
      </Modal>

      {/* RAW KEY DISPLAY MODAL */}
      <Modal
        isOpen={rawKeyModalOpen}
        onClose={() => setRawKeyModalOpen(false)}
        title="Clé API Développeur générée !"
        description="Attention : copiez cette clé dès maintenant. Elle ne pourra plus jamais être affichée."
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <span>
              Pour des raisons de sécurité, nous ne stockons pas cette clé en clair. Si vous la perdez, vous devrez en générer une nouvelle.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Votre clé secrète
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedRawKey || ""}
                className="w-full rounded-xl border border-border bg-surface-muted p-2.5 font-mono text-xs text-foreground select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setRawKeyModalOpen(false)}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
            >
              J'ai bien noté ma clé
            </button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
