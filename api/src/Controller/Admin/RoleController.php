<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AdminRole;
use App\Repository\AdminRoleRepository;
use App\Security\AdminPermission;
use App\Service\Admin\AdminRoleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Ulid;

/**
 * Gestion de la matrice des rôles et habilitations de la console d'administration.
 *
 * Modèle inspiré de Microsoft RBAC (Scope Platform).
 */
#[Route('/api/admin/roles', name: 'api_admin_roles_')]
#[IsGranted('ROLE_ADMIN')]
class RoleController extends AbstractController
{
    public function __construct(
        private readonly AdminRoleService $roleService,
        private readonly AdminRoleRepository $roleRepository,
    ) {
    }

    /**
     * Catalogue complet des permissions de la console centrale.
     *
     * GET /api/admin/roles/permissions
     */
    #[Route('/permissions', name: 'permissions', methods: ['GET'])]
    public function permissions(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'data' => [
                'permissions' => AdminPermission::all(),
                'total' => count(AdminPermission::all()),
            ],
        ]);
    }

    /**
     * Liste des rôles configurés pour l'équipe plateforme.
     *
     * GET /api/admin/roles
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $roles = $this->roleService->getRoles();
        $data = array_map(fn (AdminRole $r) => $this->roleService->serializeRole($r), $roles);

        return $this->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Création d'un rôle d'administration personnalisé avec cases à cocher.
     *
     * POST /api/admin/roles
     */
    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('admin:roles:manage')]
    public function create(Request $request): JsonResponse
    {
        $body = $request->toArray();
        $name = trim((string) ($body['name'] ?? ''));
        $code = trim((string) ($body['code'] ?? ''));
        $permissions = (array) ($body['permissions'] ?? []);
        $description = isset($body['description']) ? (string) $body['description'] : null;

        if ($name === '' || $code === '') {
            return $this->json([
                'status' => 'error',
                'message' => 'Les champs "name" et "code" sont obligatoires.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $role = $this->roleService->createRole($name, $code, $permissions, $description);

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Rôle "%s" créé avec succès.', $role->getName()),
            'data' => $this->roleService->serializeRole($role),
        ], Response::HTTP_CREATED);
    }

    /**
     * Mise à jour des permissions ou du libellé d'un rôle.
     *
     * PUT /api/admin/roles/{id}
     */
    #[Route('/{id}', name: 'update', methods: ['PUT'])]
    #[IsGranted('admin:roles:manage')]
    public function update(string $id, Request $request): JsonResponse
    {
        $role = $this->findRoleOrFail($id);
        if ($role instanceof JsonResponse) {
            return $role;
        }

        $body = $request->toArray();
        $name = isset($body['name']) ? (string) $body['name'] : null;
        $permissions = isset($body['permissions']) ? (array) $body['permissions'] : null;
        $description = isset($body['description']) ? (string) $body['description'] : null;

        $updated = $this->roleService->updateRole($role, $name, $permissions, $description);

        return $this->json([
            'status' => 'success',
            'message' => sprintf('Rôle "%s" mis à jour.', $updated->getName()),
            'data' => $this->roleService->serializeRole($updated),
        ]);
    }

    /**
     * Suppression d'un rôle personnalisé.
     *
     * DELETE /api/admin/roles/{id}
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted('admin:roles:manage')]
    public function delete(string $id): JsonResponse
    {
        $role = $this->findRoleOrFail($id);
        if ($role instanceof JsonResponse) {
            return $role;
        }

        $this->roleService->deleteRole($role);

        return $this->json([
            'status' => 'success',
            'message' => 'Rôle supprimé avec succès.',
        ]);
    }

    private function findRoleOrFail(string $id): AdminRole|JsonResponse
    {
        try {
            $ulid = Ulid::fromString($id);
        } catch (\InvalidArgumentException) {
            return $this->json([
                'status' => 'error',
                'message' => 'Identifiant de rôle invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $role = $this->roleRepository->find($ulid);
        if (!$role instanceof AdminRole) {
            return $this->json([
                'status' => 'error',
                'message' => 'Rôle introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        return $role;
    }
}
