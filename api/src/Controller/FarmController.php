<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Building\CreateBuildingRequestDto;
use App\Dto\Farm\CreateFarmRequestDto;
use App\Dto\Farm\UpdateFarmRequestDto;
use App\Entity\Farm;
use App\Entity\User;
use App\Security\Voter\FarmVoter;
use App\Service\FarmService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/farms', name: 'api_farms_')]
class FarmController extends AbstractController
{
    public function __construct(
        private readonly FarmService $farmService,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function list(
        #[CurrentUser] User $user,
    ): JsonResponse {
        return $this->json([
            'data' => $this->farmService->getFarmsForUser($user),
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        #[CurrentUser] User $user,
        #[MapRequestPayload] CreateFarmRequestDto $dto,
    ): JsonResponse {
        $farm = $this->farmService->createFarm($user, $dto);

        return $this->json([
            'data' => $this->farmService->serializeFarm($farm, 'OWNER'),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function show(
        Farm $farm,
    ): JsonResponse {
        return $this->json([
            'data' => $this->farmService->serializeFarm($farm),
        ]);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted(FarmVoter::EDIT, subject: 'farm')]
    public function update(
        Farm $farm,
        #[MapRequestPayload] UpdateFarmRequestDto $dto,
    ): JsonResponse {
        $updatedFarm = $this->farmService->updateFarm($farm, $dto);

        return $this->json([
            'data' => $this->farmService->serializeFarm($updatedFarm),
        ]);
    }

    #[Route('/{id}/buildings', name: 'buildings_list', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function listBuildings(
        Farm $farm,
    ): JsonResponse {
        return $this->json([
            'data' => $this->farmService->getBuildingsForFarm($farm),
        ]);
    }

    #[Route('/{id}/buildings', name: 'buildings_create', methods: ['POST'])]
    #[IsGranted(FarmVoter::EDIT, subject: 'farm')]
    public function createBuilding(
        Farm $farm,
        #[MapRequestPayload] CreateBuildingRequestDto $dto,
    ): JsonResponse {
        $building = $this->farmService->createBuilding($farm, $dto);

        return $this->json([
            'data' => $this->farmService->serializeBuilding($building),
        ], Response::HTTP_CREATED);
    }
}
