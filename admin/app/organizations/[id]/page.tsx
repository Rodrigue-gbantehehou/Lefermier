"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  Warehouse,
  Users,
  Calendar,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Mail,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { adminApi, OrganizationItem, OrganizationMember, FarmSummary } from "@/lib/api-client";
import { AdminHeader } from "@/components/admin-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = params?.id;

  const [org, setOrg] = useState<OrganizationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    if (!orgId) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await adminApi.getOrganization(orgId);
      setOrg(data);
      setSelectedPlan(data.subscriptionPlan);
    } catch (err: unknown) {
      setApiError(
        (err as Error).message ||
          "Impossible de joindre le serveur API Symfony sur http://127.0.0.1:8000."
      );
      setOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [orgId]);

  const handleToggleStatus = async () => {
    if (!org) return;
    const nextStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMsg =
      nextStatus === "SUSPENDED"
        ? `Êtes-vous certain de vouloir suspendre "${org.name}" ? L'accès à toutes ses fermes sera immédiatement révoqué.`
        : `Voulez-vous réactiver l'organisation "${org.name}" ?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingStatus(true);
    try {
      await adminApi.setOrganizationStatus(org.id, nextStatus);
      setOrg((prev: OrganizationItem | null) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur de mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!org || !selectedPlan || selectedPlan === org.subscriptionPlan) return;

    setIsUpdatingPlan(true);
    try {
      await adminApi.updateSubscription(org.id, selectedPlan);
      setOrg((prev: OrganizationItem | null) => (prev ? { ...prev, subscriptionPlan: selectedPlan } : prev));
      alert(`Plan d'abonnement mis à jour avec succès : ${selectedPlan}`);
    } catch (err: unknown) {
      alert((err as Error).message || "Erreur lors du changement de plan");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={org ? `Organisation : ${org.name}` : "Détail de l'organisation"}
        description="Fiche administrative complète de l'organisation et de ses exploitations avicoles rattachées."
      />

      <main className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Navigation & Retour */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/organizations"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour à la liste des organisations</span>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrganization}
            isLoading={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Actualiser</span>
          </Button>
        </div>

        {/* État si l'organisation n'est pas trouvée ou API hors-ligne */}
        {!org && !isLoading && (
          <EmptyState
            icon={<Building2 />}
            title={apiError ? "Connexion API indisponible" : "Organisation introuvable"}
            description={
              apiError
                ? `${apiError} Aucune donnée de secours n'est affichée. Veuillez démarrer l'API Symfony.`
                : "Cette organisation n'existe pas dans la base de données de production."
            }
            action={
              <Link href="/organizations">
                <Button variant="outline" size="sm">
                  Retour à la liste des organisations
                </Button>
              </Link>
            }
          />
        )}

        {/* Fiche En-tête Organisation */}
        {org && (
          <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{org.name}</h2>
                    {org.status === "ACTIVE" && <Badge variant="success" dot>Active</Badge>}
                    {org.status === "SUSPENDED" && <Badge variant="destructive" dot>Suspendue</Badge>}
                    {org.status === "TRIAL" && <Badge variant="warning" dot>Essai gratuit</Badge>}
                    <Badge variant="outline" className="font-semibold text-xs">{org.subscriptionPlan}</Badge>
                  </div>
                  <p className="text-xs text-muted font-mono mt-1">Identifiant ULID : {org.id}</p>
                  <p className="text-xs text-muted font-mono">Slug système : {org.slug}</p>
                </div>
              </div>

              {/* Bouton Action Sensible de Suspension */}
              <Button
                variant={org.status === "SUSPENDED" ? "success" : "destructive"}
                size="default"
                isLoading={isUpdatingStatus}
                onClick={handleToggleStatus}
                className="gap-2 text-xs font-semibold"
              >
                {org.status === "SUSPENDED" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Réactiver l'organisation</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="h-4 w-4" />
                    <span>Suspendre l'organisation</span>
                  </>
                )}
              </Button>
            </div>

            {/* KPIs Clés de l'organisation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/60 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Exploitations rattachées</span>
                <span className="text-lg font-bold text-foreground font-mono">{org.farmsCount}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Formule active</span>
                <span className="text-lg font-bold text-foreground">{org.subscriptionPlan}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Date d'inscription</span>
                <span className="font-medium text-foreground">{formatDate(org.createdAt)}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-muted/50 border border-border">
                <span className="text-muted block text-[11px] mb-1">Dernière mise à jour</span>
                <span className="font-medium text-foreground">{formatDate(org.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 1 : Exploitations Avicoles */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Exploitations Avicoles Affiliées ({org?.farms?.length ?? 0})</CardTitle>
                <CardDescription>
                  Fermes avicoles indépendantes enregistrées sous cette organisation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!org?.farms || org.farms.length === 0) ? (
              <EmptyState
                icon={<Warehouse />}
                title="Aucune ferme affiliée"
                description="Cette organisation ne dispose pas encore de fermes enregistrées."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ferme</TableHead>
                    <TableHead>Type de production</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Devise</TableHead>
                    <TableHead>Collaborateurs</TableHead>
                    <TableHead>Date d'ouverture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.farms.map((farm: FarmSummary) => (
                    <TableRow key={farm.id}>
                      <TableCell className="font-medium">
                        <p className="text-sm font-semibold text-foreground">{farm.name}</p>
                        <span className="text-[11px] text-muted font-mono">{farm.code}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {farm.productionType === "LAYERS"
                            ? "Poules Pondeuses"
                            : farm.productionType === "BROILER"
                            ? "Poulets de chair"
                            : farm.productionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {farm.locationCity}, {farm.locationCountry}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {farm.currency}
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {farm.membersCount} collaborateur{farm.membersCount > 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        {formatDate(farm.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Section 2 : Membres & Collaborateurs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Collaborateurs & Éleveurs ({org?.members?.length ?? 0})</CardTitle>
                <CardDescription>
                  Utilisateurs habilités sur les exploitations de cette organisation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(!org?.members || org.members.length === 0) ? (
              <EmptyState
                icon={<Users />}
                title="Aucun membre listé"
                description="Aucun utilisateur n'est actuellement rattaché aux exploitations de cette organisation."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collaborateur</TableHead>
                    <TableHead>Email & Contact</TableHead>
                    <TableHead>Rôles par Exploitation</TableHead>
                    <TableHead>Statut du compte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.members.map((member: OrganizationMember) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-semibold text-xs text-foreground">
                        <Link href={`/users/${member.id}`} className="hover:text-primary hover:underline">
                          {member.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-muted" />
                          <span>{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-muted mt-0.5">
                            <Phone className="h-3 w-3 text-muted" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {member.farms.map((f: { id: string; name: string; role: string; isActive: boolean }) => (
                            <Badge key={f.id} variant="secondary" className="text-[10px]">
                              {f.name} : {f.role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.isActive ? (
                          <Badge variant="success" dot className="text-[10px]">Actif</Badge>
                        ) : (
                          <Badge variant="destructive" dot className="text-[10px]">Désactivé</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Section 3 : Gestion de la Formule d'Abonnement */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Abonnement & Facturation Plateforme</CardTitle>
                <CardDescription>
                  Ajustez la formule commerciale de l'organisation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="FREE">Formule GRATUITE (FREE)</option>
                <option value="STANDARD">Formule STANDARD</option>
                <option value="PRO">Formule PROFESSIONNELLE (PRO)</option>
                <option value="ENTERPRISE">Formule ENTREPRISE (ENTERPRISE)</option>
              </select>

              <Button
                size="default"
                onClick={handleUpdatePlan}
                isLoading={isUpdatingPlan}
                disabled={selectedPlan === org?.subscriptionPlan}
                className="text-xs font-semibold"
              >
                Enregistrer la nouvelle formule
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
