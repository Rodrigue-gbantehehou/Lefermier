<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Farm;
use App\Entity\User;
use App\Security\Voter\FarmVoter;
use App\Service\SyncPullService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class SyncController extends AbstractController
{
    public function __construct(
        private readonly SyncPullService $syncPullService,
    ) {
    }

    #[Route('/api/farms/{id}/sync/pull', name: 'api_farms_sync_pull', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function pull(
        Farm $farm,
        Request $request,
        #[CurrentUser] User $user
    ): JsonResponse {
        $sinceParam = $request->query->get('since');
        $since = null;

        if ($sinceParam !== null && is_string($sinceParam) && trim($sinceParam) !== '') {
            try {
                $since = new \DateTimeImmutable(trim($sinceParam));
            } catch (\Throwable) {
                return $this->json([
                    'title' => 'Paramètre invalide',
                    'detail' => "Le paramètre 'since' doit être une date valide au format ISO 8601 (ex: 2026-10-30T00:00:00Z).",
                ], JsonResponse::HTTP_BAD_REQUEST);
            }
        }

        $delta = $this->syncPullService->getDeltaForFarm($farm, $user, $since);

        return $this->json([
            'data' => $delta,
        ]);
    }
}
