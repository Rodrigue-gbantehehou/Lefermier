<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Farm;
use App\Entity\User;
use App\Security\Voter\FarmVoter;
use App\Service\DashboardService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class DashboardController extends AbstractController
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {
    }

    #[Route('/api/farms/{id}/dashboard', name: 'api_farms_dashboard', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function index(
        Farm $farm,
        Request $request,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $startDateParam = $request->query->get('startDate');
        $endDateParam = $request->query->get('endDate');

        $startDate = $startDateParam !== null ? new \DateTimeImmutable((string) $startDateParam) : null;
        $endDate = $endDateParam !== null ? new \DateTimeImmutable((string) $endDateParam) : null;

        $data = $this->dashboardService->getDashboardData($farm, $user, $startDate, $endDate);

        return $this->json([
            'data' => $data,
        ]);
    }
}
