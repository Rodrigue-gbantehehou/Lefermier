<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Role\CreateRoleRequestDto;
use App\Dto\Role\UpdateRoleRequestDto;
use App\Entity\Farm;
use App\Entity\Role;
use App\Repository\RoleRepository;
use App\Security\Permission;
use App\Service\RoleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api', name: 'api_roles_')]
class RoleController extends AbstractController
{
    public function __construct(
        private readonly RoleService $roleService,
        private readonly RoleRepository $roleRepository,
    ) {
    }

    #[Route('/permissions', name: 'permissions_matrix', methods: ['GET'])]
    public function listPermissions(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => [
                'permissions' => Permission::all(),
                'total' => count(Permission::all()),
            ],
        ]);
    }

    #[Route('/farms/{id}/roles', name: 'farm_roles_list', methods: ['GET'])]
    #[IsGranted('FARM_VIEW', subject: 'farm')]
    public function listFarmRoles(Farm $farm): JsonResponse
    {
        $roles = $this->roleService->getRolesForFarm($farm);
        $data = array_map(fn (Role $r) => $this->roleService->serializeRole($r), $roles);

        return $this->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    #[Route('/farms/{id}/roles', name: 'farm_roles_create', methods: ['POST'])]
    #[IsGranted('FARM_EDIT', subject: 'farm')]
    public function createFarmRole(
        Farm $farm,
        #[MapRequestPayload] CreateRoleRequestDto $dto,
    ): JsonResponse {
        $role = $this->roleService->createRole($farm, $dto);

        return $this->json([
            'status' => 'success',
            'message' => 'Rôle créé avec succès dans la matrice de l\'agence.',
            'data' => $this->roleService->serializeRole($role),
        ], Response::HTTP_CREATED);
    }

    #[Route('/farms/{id}/roles/{roleId}', name: 'farm_roles_update', methods: ['PUT'])]
    #[IsGranted('FARM_EDIT', subject: 'farm')]
    public function updateFarmRole(
        Farm $farm,
        string $roleId,
        #[MapRequestPayload] UpdateRoleRequestDto $dto,
    ): JsonResponse {
        $role = $this->roleRepository->find($roleId);
        if (!$role instanceof Role || $role->getFarm()->getId()->toRfc4122() !== $farm->getId()->toRfc4122()) {
            return $this->json([
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Rôle introuvable pour cette exploitation.',
            ], Response::HTTP_NOT_FOUND);
        }

        $updatedRole = $this->roleService->updateRole($role, $dto);

        return $this->json([
            'status' => 'success',
            'message' => 'Rôle et permissions mis à jour avec succès.',
            'data' => $this->roleService->serializeRole($updatedRole),
        ]);
    }

    #[Route('/farms/{id}/roles/{roleId}', name: 'farm_roles_delete', methods: ['DELETE'])]
    #[IsGranted('FARM_EDIT', subject: 'farm')]
    public function deleteFarmRole(
        Farm $farm,
        string $roleId,
    ): JsonResponse {
        $role = $this->roleRepository->find($roleId);
        if (!$role instanceof Role || $role->getFarm()->getId()->toRfc4122() !== $farm->getId()->toRfc4122()) {
            return $this->json([
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Rôle introuvable pour cette exploitation.',
            ], Response::HTTP_NOT_FOUND);
        }

        $this->roleService->deleteRole($role);

        return $this->json([
            'status' => 'success',
            'message' => 'Rôle supprimé de la matrice de l\'agence avec succès.',
        ]);
    }
}
