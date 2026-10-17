<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\EggProduction\CreateEggProductionRequestDto;
use App\Dto\EggProduction\UpdateEggProductionRequestDto;
use App\Entity\EggProduction;
use App\Entity\Flock;
use App\Entity\User;
use App\Repository\EggProductionRepository;
use App\Security\Voter\EggProductionVoter;
use App\Service\EggProductionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class EggProductionController extends AbstractController
{
    public function __construct(
        private readonly EggProductionService $eggProductionService,
        private readonly EggProductionRepository $eggProductionRepository,
    ) {
    }

    #[Route('/api/flocks/{id}/egg-productions', name: 'api_flocks_egg_productions_list', methods: ['GET'])]
    #[IsGranted(EggProductionVoter::VIEW, subject: 'flock')]
    public function list(
        Flock $flock,
        Request $request,
    ): JsonResponse {
        $startDateParam = $request->query->get('startDate');
        $endDateParam = $request->query->get('endDate');

        $startDate = $startDateParam !== null ? new \DateTimeImmutable((string) $startDateParam) : null;
        $endDate = $endDateParam !== null ? new \DateTimeImmutable((string) $endDateParam) : null;

        $productions = $this->eggProductionRepository->findByFlock($flock, $startDate, $endDate);
        $summary = $this->eggProductionRepository->getSummaryStats($flock, $startDate, $endDate);

        $serialized = array_map(
            fn (EggProduction $p) => $this->eggProductionService->serializeEggProduction($p),
            $productions
        );

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
                'summary' => $summary,
            ],
        ]);
    }

    #[Route('/api/flocks/{id}/egg-productions', name: 'api_flocks_egg_productions_create', methods: ['POST'])]
    #[IsGranted(EggProductionVoter::RECORD, subject: 'flock')]
    public function create(
        Flock $flock,
        #[MapRequestPayload] CreateEggProductionRequestDto $dto,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $production = $this->eggProductionService->recordEggProduction($flock, $dto, $user);

        return $this->json([
            'data' => $this->eggProductionService->serializeEggProduction($production),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/egg-productions/{id}', name: 'api_egg_productions_show', methods: ['GET'])]
    #[IsGranted(EggProductionVoter::VIEW, subject: 'eggProduction')]
    public function show(EggProduction $eggProduction): JsonResponse
    {
        return $this->json([
            'data' => $this->eggProductionService->serializeEggProduction($eggProduction),
        ]);
    }

    #[Route('/api/egg-productions/{id}', name: 'api_egg_productions_update', methods: ['PUT'])]
    #[IsGranted(EggProductionVoter::EDIT, subject: 'eggProduction')]
    public function update(
        EggProduction $eggProduction,
        #[MapRequestPayload] UpdateEggProductionRequestDto $dto,
    ): JsonResponse {
        $updated = $this->eggProductionService->updateEggProduction($eggProduction, $dto);

        return $this->json([
            'data' => $this->eggProductionService->serializeEggProduction($updated),
        ]);
    }

    #[Route('/api/egg-productions/{id}', name: 'api_egg_productions_delete', methods: ['DELETE'])]
    #[IsGranted(EggProductionVoter::DELETE, subject: 'eggProduction')]
    public function delete(EggProduction $eggProduction): JsonResponse
    {
        $this->eggProductionService->deleteEggProduction($eggProduction);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
