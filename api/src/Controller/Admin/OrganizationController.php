<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Enum\OrganizationStatus;
use App\Service\Admin\AdminOrganizationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Gestion administrative des organisations et exploitations de la plateforme.
 *
 * Accessible aux collaborateurs habilités (ROLE_ADMIN_SUPPORT, ROLE_ADMIN, ROLE_SUPER_ADMIN).
 */
#[Route('/api/admin/organizations', name: 'api_admin_organizations_')]
#[IsGranted('ROLE_ADMIN_SUPPORT')]
class OrganizationController extends AbstractController
{
    public function __construct(
        private readonly AdminOrganizationService $organizationService,
    ) {
    }

    /**
     * Liste paginée de toutes les organisations avec filtres de statut et recherche.
     *
     * GET /api/admin/organizations?page=1&limit=25&status=ACTIVE&search=ferme
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, max(1, $request->query->getInt('limit', 25)));
        $status = $request->query->get('status');
        $search = $request->query->get('search');

        if ($status !== null && !in_array($status, ['ACTIVE', 'SUSPENDED', 'TRIAL'], true)) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_BAD_REQUEST,
                'message' => 'Statut invalide. Valeurs acceptées : ACTIVE, SUSPENDED, TRIAL.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->organizationService->listOrganizations($page, $limit, $status, $search);

        return $this->json(array_merge(['status' => 'success'], $result));
    }

    /**
     * Détail complet d'une organisation avec ses exploitations et collaborateurs.
     *
     * GET /api/admin/organizations/{id}
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $organization = $this->findOrganizationOrFail($id);
        if ($organization instanceof JsonResponse) {
            return $organization;
        }

        return $this->json([
            'status' => 'success',
            'data' => $this->organizationService->getOrganizationDetail($organization),
        ]);
    }

    /**
     * Suspend ou réactive une organisation (bloque l'accès à toutes ses exploitations).
     *
     * PUT /api/admin/organizations/{id}/status
     * Body: { "status": "SUSPENDED" | "ACTIVE" | "TRIAL" }
     */
    #[Route('/{id}/status', name: 'status', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function updateStatus(string $id, Request $request): JsonResponse
    {
        $organization = $this->findOrganizationOrFail($id);
        if ($organization instanceof JsonResponse) {
            return $organization;
        }

        $body = $request->toArray();
        $statusValue = $body['status'] ?? null;

        if (!in_array($statusValue, ['ACTIVE', 'SUSPENDED', 'TRIAL'], true)) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Le champ "status" est requis. Valeurs acceptées : ACTIVE, SUSPENDED, TRIAL.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = $this->organizationService->setOrganizationStatus($organization, OrganizationStatus::from($statusValue));

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Statut de l\'organisation "%s" mis à jour vers %s.', $updated->getName(), $statusValue),
            'data' => $this->organizationService->serializeOrganization($updated),
        ]);
    }

    /**
     * Met à jour le plan d'abonnement d'une organisation.
     *
     * PUT /api/admin/organizations/{id}/subscription
     * Body: { "plan": "FREE" | "STANDARD" | "PRO" }
     */
    #[Route('/{id}/subscription', name: 'subscription', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN_FINANCE')]
    public function updateSubscription(string $id, Request $request): JsonResponse
    {
        $organization = $this->findOrganizationOrFail($id);
        if ($organization instanceof JsonResponse) {
            return $organization;
        }

        $body = $request->toArray();
        $plan = trim((string) ($body['plan'] ?? ''));

        if ($plan === '') {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Le champ "plan" est requis.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = $this->organizationService->updateSubscriptionPlan($organization, strtoupper($plan));

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Plan d\'abonnement de "%s" mis à jour vers %s.', $updated->getName(), $updated->getSubscriptionPlan()),
            'data' => $this->organizationService->serializeOrganization($updated),
        ]);
    }

    private function findOrganizationOrFail(string $id): Organization|JsonResponse
    {
        $organization = $this->organizationService->findOrganization($id);

        if ($organization === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Organisation introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        return $organization;
    }
}
