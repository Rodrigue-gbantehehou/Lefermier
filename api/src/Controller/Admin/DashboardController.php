<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Service\Admin\AdminStatsService;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Tableau de bord d'administration globale de la plateforme Lefermier.
 *
 * Accessible aux administrateurs et collaborateurs de la plateforme (ROLE_ADMIN, ROLE_SUPER_ADMIN).
 */
#[Route('/api/admin', name: 'api_admin_')]
#[IsGranted('ROLE_ADMIN')]
class DashboardController extends AbstractController
{
    public function __construct(
        private readonly AdminStatsService $statsService,
    ) {
    }

    /**
     * Statistiques globales de la plateforme (comptes, organisations, fermes, bandes).
     *
     * GET /api/admin/stats
     */
    #[Route('/stats', name: 'stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => $this->statsService->getPlatformStats(),
        ]);
    }

    /**
     * État de santé réel des composants plateforme (PHP, Symfony, base de données).
     *
     * GET /api/admin/health
     */
    #[Route('/health', name: 'health', methods: ['GET'])]
    public function health(Connection $connection): JsonResponse
    {
        $dbConnected = false;
        $dbLatencyMs = null;
        $dbError = null;

        $start = microtime(true);
        try {
            $connection->executeQuery('SELECT 1');
            $dbConnected = true;
            $dbLatencyMs = round((microtime(true) - $start) * 1000, 2);
        } catch (\Throwable $e) {
            $dbError = $e->getMessage();
        }

        return $this->json([
            'status' => $dbConnected ? 'HEALTHY' : 'DEGRADED',
            'data' => [
                'php_version' => PHP_VERSION,
                'symfony_version' => Kernel::VERSION,
                'memory_usage_mb' => round(memory_get_usage(true) / (1024 * 1024), 2),
                'memory_peak_mb' => round(memory_get_peak_usage(true) / (1024 * 1024), 2),
                'database' => [
                    'connected' => $dbConnected,
                    'latency_ms' => $dbLatencyMs,
                    'driver' => (new \ReflectionClass($connection->getDatabasePlatform()))->getShortName(),
                    'error' => $dbError,
                ],
                'server_time' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            ],
        ]);
    }
}
