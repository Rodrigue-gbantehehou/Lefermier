<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Building\UpdateBuildingRequestDto;
use App\Entity\Building;
use App\Security\Voter\FarmVoter;
use App\Service\FarmService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/buildings', name: 'api_buildings_')]
class BuildingController extends AbstractController
{
    public function __construct(
        private readonly FarmService $farmService,
    ) {
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(Building $building): JsonResponse
    {
        $this->denyAccessUnlessGranted(FarmVoter::VIEW, $building->getFarm());

        return $this->json([
            'data' => $this->farmService->serializeBuilding($building),
        ]);
    }

    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    public function update(
        Building $building,
        #[MapRequestPayload] UpdateBuildingRequestDto $dto,
    ): JsonResponse {
        $this->denyAccessUnlessGranted(FarmVoter::EDIT, $building->getFarm());

        $updated = $this->farmService->updateBuilding($building, $dto);

        return $this->json([
            'data' => $this->farmService->serializeBuilding($updated),
        ]);
    }

    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(Building $building): JsonResponse
    {
        $this->denyAccessUnlessGranted(FarmVoter::EDIT, $building->getFarm());

        $this->farmService->deleteBuilding($building);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
