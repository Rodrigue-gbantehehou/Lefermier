<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Organization;
use App\Enum\OrganizationStatus;
use App\Security\AdminPermission;
use App\Service\Admin\AdminAuditService;
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
 * Protégé par les permissions granulaires du modèle Microsoft RBAC.
 */
#[Route('/api/admin/organizations', name: 'api_admin_organizations_')]
class OrganizationController extends AbstractController
{
    public function __construct(
        private readonly AdminOrganizationService $organizationService,
        private readonly AdminAuditService $auditService,
    ) {
    }

    /**
     * Liste paginée de toutes les organisations avec filtres de statut et recherche.
     *
     * GET /api/admin/organizations?page=1&limit=25&status=ACTIVE&search=ferme
     */
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(AdminPermission::ORGANIZATIONS_VIEW)]
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
    #[IsGranted(AdminPermission::ORGANIZATIONS_VIEW)]
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
    #[IsGranted(AdminPermission::ORGANIZATIONS_SUSPEND)]
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

        $previousStatus = $organization->getStatus()->value;
        $updated = $this->organizationService->setOrganizationStatus($organization, OrganizationStatus::from($statusValue));

        $this->auditService->log(
            action: 'ORGANIZATION_STATUS_UPDATE',
            label: $statusValue === 'SUSPENDED' ? 'Suspension d\'organisation' : 'Réactivation d\'organisation',
            targetType: 'ORGANIZATION',
            targetId: $updated->getId()?->toBase32() ?? $id,
            targetName: $updated->getName(),
            details: sprintf('Statut opérationnel modifié de %s vers %s.', $previousStatus, $statusValue),
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Statut de l\'organisation "%s" mis à jour vers %s.', $updated->getName(), $statusValue),
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
