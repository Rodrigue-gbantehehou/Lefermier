<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Enum\OrganizationStatus;
use App\Repository\OrganizationRepository;
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
#[IsGranted('ROLE_ADMIN')]
class SubscriptionController extends AbstractController
{
    public function __construct(
        private readonly CommercialPlanService $planService,
        private readonly OrganizationRepository $organizationRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Catalogue officiel des formules et offres commerciales (SKUs & Quotas).
     *
     * GET /api/admin/subscriptions/plans
     */
    #[Route('/plans', name: 'plans', methods: ['GET'])]
    public function plans(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => array_values($this->planService->getPlans()),
        ]);
    }

    /**
     * Crée une nouvelle formule commerciale dans le catalogue plateforme.
     *
     * POST /api/admin/subscriptions/plans
     */
    #[Route('/plans', name: 'create_plan', methods: ['POST'])]
    public function createPlan(Request $request): JsonResponse
    {
        $payload = $request->toArray();

        try {
            $plan = $this->planService->createPlan($payload);

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
            $this->planService->deletePlan($plan);

            return $this->json([
                'status' => 'success',
                'message' => sprintf('Formule commerciale "%s" supprimée avec succès.', $plan->getName()),
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
            $qb->andWhere('o.name LIKE :search OR o.slug LIKE :search')
               ->setParameter('search', '%' . $search . '%');
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
    #[IsGranted('admin:subscriptions:manage')]
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

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Souscription de "%s" mise à jour avec succès.', $organization->getName()),
            'data' => $this->planService->serializeSubscription($organization),
        ]);
    }
}
