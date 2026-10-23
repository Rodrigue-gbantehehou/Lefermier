<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AdminAuditLog;
use App\Security\AdminPermission;
use App\Service\Admin\AdminAuditService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Journal d'audit et traçabilité des opérations administratives sensibles.
 *
 * Conforme à la section 7 de ADMIN_RULES.md.
 */
#[Route('/api/admin/audit-logs', name: 'api_admin_audit_logs_')]
class AuditLogController extends AbstractController
{
    public function __construct(
        private readonly AdminAuditService $auditService,
    ) {
    }

    /**
     * Liste paginée des logs d'audit avec filtres par type d'action et recherche texte.
     *
     * GET /api/admin/audit-logs?page=1&limit=50&action=ORGANIZATION_STATUS_UPDATE&search=ferme
     */
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(AdminPermission::AUDIT_VIEW)]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, max(1, $request->query->getInt('limit', 50)));
        $action = $request->query->get('action');
        $search = $request->query->get('search');

        $result = $this->auditService->listLogs($page, $limit, $action, $search);

        $data = array_map(fn (AdminAuditLog $log) => $log->toArray(), $result['data']);

        return $this->json([
            'status' => 'success',
            'data' => $data,
            'total' => $result['total'],
            'page' => $result['page'],
            'limit' => $result['limit'],
        ]);
    }
}
