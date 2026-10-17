<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Inventory\CreateInventoryItemRequestDto;
use App\Dto\Inventory\CreateStockMovementRequestDto;
use App\Dto\Inventory\UpdateInventoryItemRequestDto;
use App\Entity\Farm;
use App\Entity\InventoryItem;
use App\Entity\User;
use App\Enum\InventoryCategory;
use App\Repository\InventoryItemRepository;
use App\Security\Voter\FarmVoter;
use App\Security\Voter\InventoryVoter;
use App\Service\InventoryService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class InventoryController extends AbstractController
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly InventoryItemRepository $itemRepository,
    ) {
    }

    #[Route('/api/farms/{id}/inventory', name: 'api_farms_inventory_list', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function list(
        Farm $farm,
        Request $request,
    ): JsonResponse {
        $categoryParam = $request->query->get('category');
        $lowStockOnly = $request->query->getBoolean('lowStock', false);

        if ($lowStockOnly) {
            $items = $this->itemRepository->findLowStockItems($farm);
        } else {
            $category = $categoryParam !== null ? InventoryCategory::tryFrom(strtoupper((string) $categoryParam)) : null;
            $items = $this->itemRepository->findByFarm($farm, $category);
        }

        $serialized = array_map(fn (InventoryItem $i) => $this->inventoryService->serializeItem($i), $items);

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
            ],
        ]);
    }

    #[Route('/api/farms/{id}/inventory', name: 'api_farms_inventory_create', methods: ['POST'])]
    #[IsGranted(FarmVoter::EDIT, subject: 'farm')]
    public function create(
        Farm $farm,
        #[MapRequestPayload] CreateInventoryItemRequestDto $dto,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $item = $this->inventoryService->createItem($farm, $dto, $user);

        return $this->json([
            'data' => $this->inventoryService->serializeItem($item),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/inventory/{id}', name: 'api_inventory_show', methods: ['GET'])]
    #[IsGranted(InventoryVoter::VIEW, subject: 'item')]
    public function show(
        InventoryItem $item,
    ): JsonResponse {
        return $this->json([
            'data' => $this->inventoryService->serializeItem($item, includeMovements: true),
        ]);
    }

    #[Route('/api/inventory/{id}', name: 'api_inventory_update', methods: ['PUT'])]
    #[IsGranted(InventoryVoter::EDIT, subject: 'item')]
    public function update(
        InventoryItem $item,
        #[MapRequestPayload] UpdateInventoryItemRequestDto $dto,
    ): JsonResponse {
        $updatedItem = $this->inventoryService->updateItem($item, $dto);

        return $this->json([
            'data' => $this->inventoryService->serializeItem($updatedItem),
        ]);
    }

    #[Route('/api/inventory/{id}/movements', name: 'api_inventory_movements_create', methods: ['POST'])]
    #[IsGranted(InventoryVoter::MOVE, subject: 'item')]
    public function recordMovement(
        InventoryItem $item,
        #[MapRequestPayload] CreateStockMovementRequestDto $dto,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $movement = $this->inventoryService->recordMovement($item, $dto, $user);

        return $this->json([
            'data' => [
                'movement' => $this->inventoryService->serializeMovement($movement),
                'item' => $this->inventoryService->serializeItem($item),
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/inventory/{id}/movements', name: 'api_inventory_movements_list', methods: ['GET'])]
    #[IsGranted(InventoryVoter::VIEW, subject: 'item')]
    public function listMovements(
        InventoryItem $item,
    ): JsonResponse {
        $movements = array_map(
            fn ($m) => $this->inventoryService->serializeMovement($m),
            $item->getMovements()->toArray()
        );

        return $this->json([
            'data' => $movements,
            'meta' => [
                'totalItems' => count($movements),
            ],
        ]);
    }
}
