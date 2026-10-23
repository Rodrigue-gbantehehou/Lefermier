<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Enum\OrganizationStatus;
use App\Repository\OrganizationRepository;
use App\Security\AdminPermission;
use App\Service\Admin\CommercialPlanService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Ulid;

/**
 * Contrôleur d'administration des Abonnements, Licences et Quotas Commerciaux.
 *
 * Modèle inspiré de Microsoft 365 Licensing & Azure Subscriptions.
 */
#[Route('/api/admin/subscriptions', name: 'api_admin_subscriptions_')]
class SubscriptionController extends AbstractController
{
    public function __construct(
        private readonly CommercialPlanService $planService,
        private readonly OrganizationRepository $organizationRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly \App\Service\Admin\AdminAuditService $auditService,
    ) {
    }

    /**
     * Catalogue officiel des formules et offres commerciales (SKUs & Quotas).
     *
     * GET /api/admin/subscriptions/plans
     */
    #[Route('/plans', name: 'plans', methods: ['GET'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_VIEW)]
    public function plans(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => array_values($this->planService->getPlans()),
        ]);
    }

    /**
     * Référentiel des modules fonctionnels réels du backend groupés par catégorie.
     *
     * GET /api/admin/subscriptions/modules
     */
    #[Route('/modules', name: 'modules', methods: ['GET'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_VIEW)]
    public function modules(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => \App\Service\Admin\PlatformModuleRegistry::getGroupedByCategory(),
        ]);
    }

    /**
     * Duplique une offre existante en mode brouillon pour faciliter la création de variantes.
     *
     * POST /api/admin/subscriptions/plans/{id}/duplicate
     */
    #[Route('/plans/{id}/duplicate', name: 'duplicate_plan', methods: ['POST'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function duplicatePlan(string $id): JsonResponse
    {
        $plan = $this->planService->findPlanEntity($id);

        if ($plan === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Formule commerciale introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $duplicated = $this->planService->duplicatePlan($plan);

        $this->auditService->log(
            action: 'SUBSCRIPTION_PLAN_CHANGE',
            label: 'Duplication formule commerciale',
            targetType: 'SUBSCRIPTION_PLAN',
            targetId: $duplicated->getSku(),
            targetName: $duplicated->getName(),
            details: sprintf('Duplication de l\'offre "%s" vers la nouvelle formule brouillon "%s" (%s).', $plan->getName(), $duplicated->getName(), $duplicated->getSku()),
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Offre dupliquée en brouillon avec succès : "%s".', $duplicated->getName()),
            'data' => $duplicated->toArray(0),
        ], Response::HTTP_CREATED);
    }

    /**
     * Modification rapide du statut de publication d'une offre (DRAFT, PUBLISHED, ARCHIVED).
     *
     * PATCH /api/admin/subscriptions/plans/{id}/status
     */
    #[Route('/plans/{id}/status', name: 'update_plan_status', methods: ['PATCH'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function updatePlanStatus(string $id, Request $request): JsonResponse
    {
        $plan = $this->planService->findPlanEntity($id);

        if ($plan === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Formule commerciale introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $payload = $request->toArray();
        $newStatus = strtoupper(trim((string) ($payload['status'] ?? '')));

        if (!in_array($newStatus, ['DRAFT', 'PUBLISHED', 'ARCHIVED'], true)) {
            return $this->json([
                'status' => 'error',
                'message' => 'Statut invalide. Valeurs autorisées : DRAFT, PUBLISHED, ARCHIVED.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $oldStatus = $plan->getStatus();
        $plan->setStatus($newStatus);
        $this->entityManager->flush();

        $this->auditService->log(
            action: 'SUBSCRIPTION_PLAN_CHANGE',
            label: 'Changement statut publication offre',
            targetType: 'SUBSCRIPTION_PLAN',
            targetId: $plan->getSku(),
            targetName: $plan->getName(),
            details: sprintf('Statut de publication de l\'offre "%s" modifié : %s -> %s.', $plan->getName(), $oldStatus, $newStatus),
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Statut de l\'offre "%s" mis à jour (%s).', $plan->getName(), $newStatus),
            'data' => $plan->toArray(),
        ]);
    }

    /**
     * Crée une nouvelle formule commerciale dans le catalogue plateforme.
     *
     * POST /api/admin/subscriptions/plans
     */
    #[Route('/plans', name: 'create_plan', methods: ['POST'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function createPlan(Request $request): JsonResponse
    {
        $payload = $request->toArray();

        try {
            $plan = $this->planService->createPlan($payload);

            $this->auditService->log(
                action: 'SUBSCRIPTION_PLAN_CHANGE',
                label: 'Création formule commerciale',
                targetType: 'SUBSCRIPTION_PLAN',
                targetId: $plan->getSku(),
                targetName: $plan->getName(),
                details: sprintf('Création de la formule "%s" (%s) au tarif mensuel de %d FCFA.', $plan->getName(), $plan->getSku(), $plan->getPriceMonthly()),
            );

            return $this->json([
                'status' => 'success',
                'message' => sprintf('Formule commerciale "%s" créée avec succès.', $plan->getName()),
                'data' => $plan->toArray(),
            ], Response::HTTP_CREATED);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Met à jour une formule commerciale existante.
     *
     * PUT /api/admin/subscriptions/plans/{id}
     */
    #[Route('/plans/{id}', name: 'update_plan', methods: ['PUT'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function updatePlan(string $id, Request $request): JsonResponse
    {
        $plan = $this->planService->findPlanEntity($id);

        if ($plan === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Formule commerciale introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $payload = $request->toArray();
        $updated = $this->planService->updatePlan($plan, $payload);

        $this->auditService->log(
            action: 'SUBSCRIPTION_PLAN_CHANGE',
            label: 'Modification formule commerciale',
            targetType: 'SUBSCRIPTION_PLAN',
            targetId: $updated->getSku(),
            targetName: $updated->getName(),
            details: sprintf('Mise à jour des paramètres et quotas de la formule "%s" (%s).', $updated->getName(), $updated->getSku()),
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Formule "%s" mise à jour avec succès.', $updated->getName()),
            'data' => $updated->toArray(),
        ]);
    }

    /**
     * Supprime une formule commerciale personnalisée.
     *
     * DELETE /api/admin/subscriptions/plans/{id}
     */
    #[Route('/plans/{id}', name: 'delete_plan', methods: ['DELETE'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function deletePlan(string $id): JsonResponse
    {
        $plan = $this->planService->findPlanEntity($id);

        if ($plan === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Formule commerciale introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $planName = $plan->getName();
            $planSku = $plan->getSku();
            $this->planService->deletePlan($plan);

            $this->auditService->log(
                action: 'SUBSCRIPTION_PLAN_CHANGE',
                label: 'Suppression formule commerciale',
                targetType: 'SUBSCRIPTION_PLAN',
                targetId: $planSku,
                targetName: $planName,
                details: sprintf('Suppression définitive de la formule commerciale personnalisée "%s" (%s).', $planName, $planSku),
            );

            return $this->json([
                'status' => 'success',
                'message' => sprintf('Formule commerciale "%s" supprimée avec succès.', $planName),
            ]);
        } catch (\LogicException $e) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_CONFLICT,
                'message' => $e->getMessage(),
            ], Response::HTTP_CONFLICT);
        }
    }

    /**
     * Indicateurs financiers globaux (MRR, ARR, conversion, répartition par SKU).
     *
     * GET /api/admin/subscriptions/metrics
     */
    #[Route('/metrics', name: 'metrics', methods: ['GET'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_VIEW)]
    public function metrics(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => $this->planService->getFinancialOverview(),
        ]);
    }

    /**
     * Liste des souscriptions clientes avec compteurs de consommation et quotas.
     *
     * GET /api/admin/subscriptions?status=ACTIVE&plan=PRO&search=allada
     */
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_VIEW)]
    public function list(Request $request): JsonResponse
    {
        $status = $request->query->get('status');
        $planFilter = $request->query->get('plan');
        $search = $request->query->get('search');

        $qb = $this->organizationRepository->createQueryBuilder('o')
            ->orderBy('o.createdAt', 'DESC');

        if ($status !== null && in_array($status, ['ACTIVE', 'SUSPENDED', 'TRIAL'], true)) {
            $qb->andWhere('o.status = :status')
               ->setParameter('status', OrganizationStatus::from($status));
        }

        if ($planFilter !== null && $planFilter !== '') {
            $qb->andWhere('o.subscriptionPlan = :plan')
               ->setParameter('plan', strtoupper($planFilter));
        }

        if ($search !== null && $search !== '') {
            $qb->leftJoin('o.farms', 'f')
               ->andWhere('o.name LIKE :search OR o.slug LIKE :search OR f.name LIKE :search')
               ->setParameter('search', '%' . $search . '%')
               ->distinct();
        }

        $organizations = $qb->getQuery()->getResult();
        $subscriptions = array_map(
            fn (Organization $org) => $this->planService->serializeSubscription($org),
            $organizations
        );

        return $this->json([
            'status' => 'success',
            'data' => $subscriptions,
            'total' => count($subscriptions),
        ]);
    }

    /**
     * Mise à niveau, rétrogradation ou modification du statut de souscription d'une organisation.
     *
     * PUT /api/admin/subscriptions/{id}
     * Body: { "plan": "PRO", "status": "ACTIVE" }
     */
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted(AdminPermission::SUBSCRIPTIONS_MANAGE)]
    public function update(string $id, Request $request): JsonResponse
    {
        try {
            $ulid = Ulid::fromString($id);
        } catch (\InvalidArgumentException) {
            return $this->json([
                'status' => 'error',
                'message' => 'Identifiant d\'organisation invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $organization = $this->organizationRepository->find($ulid);
        if (!$organization instanceof Organization) {
            return $this->json([
                'status' => 'error',
                'message' => 'Organisation introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $body = $request->toArray();
        $newPlan = isset($body['plan']) ? strtoupper(trim((string) $body['plan'])) : null;
        $newStatus = isset($body['status']) ? strtoupper(trim((string) $body['status'])) : null;

        if ($newPlan !== null) {
            $planDef = $this->planService->getPlan($newPlan);
            if ($planDef === null) {
                return $this->json([
                    'status' => 'error',
                    'message' => sprintf('Plan "%s" non reconnu dans le catalogue Lefermier.', $newPlan),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $organization->setSubscriptionPlan($newPlan);
        }

        if ($newStatus !== null) {
            if (!in_array($newStatus, ['ACTIVE', 'SUSPENDED', 'TRIAL'], true)) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'Statut invalide. Valeurs autorisées : ACTIVE, SUSPENDED, TRIAL.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $organization->setStatus(OrganizationStatus::from($newStatus));
        }

        $this->entityManager->flush();

        $this->auditService->log(
            action: 'SUBSCRIPTION_PLAN_CHANGE',
            label: 'Changement d\'offre client',
            targetType: 'ORGANIZATION',
            targetId: $organization->getId()?->toBase32() ?? $id,
            targetName: $organization->getName(),
            details: sprintf(
                'Mise à jour de la souscription de l\'organisation "%s" : Formule %s, Statut %s.',
                $organization->getName(),
                $organization->getSubscriptionPlan(),
                $organization->getStatus()->value
            ),
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Souscription de "%s" mise à jour avec succès.', $organization->getName()),
            'data' => $this->planService->serializeSubscription($organization),
        ]);
    }
}
