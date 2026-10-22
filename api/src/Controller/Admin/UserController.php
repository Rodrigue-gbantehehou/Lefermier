<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\User;
use App\Service\Admin\AdminUserService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Gestion administrative des utilisateurs de la plateforme.
 *
 * Réservé exclusivement aux super-administrateurs système (ROLE_SUPER_ADMIN).
 */
#[Route('/api/admin/users', name: 'api_admin_users_')]
#[IsGranted('ROLE_SUPER_ADMIN')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly AdminUserService $userService,
    ) {
    }

    /**
     * Liste paginée des utilisateurs de la plateforme avec filtres d'état et recherche.
     *
     * GET /api/admin/users?page=1&limit=25&active=true&search=koffi
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, max(1, $request->query->getInt('limit', 25)));
        $search = $request->query->get('search');

        $isActive = null;
        if ($request->query->has('active')) {
            $isActive = $request->query->getBoolean('active');
        }

        $result = $this->userService->listUsers($page, $limit, $isActive, $search);

        return $this->json(array_merge(['status' => 'success'], $result));
    }

    /**
     * Détail complet d'un utilisateur avec ses exploitations et rôles.
     *
     * GET /api/admin/users/{id}
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $user = $this->findUserOrFail($id);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->json([
            'status' => 'success',
            'data' => $this->userService->serializeUser($user),
        ]);
    }

    /**
     * Active ou désactive le compte d'un utilisateur.
     *
     * PUT /api/admin/users/{id}/active
     * Body: { "isActive": false }
     */
    #[Route('/{id}/active', name: 'active', methods: ['PUT'])]
    public function setActive(string $id, Request $request): JsonResponse
    {
        $user = $this->findUserOrFail($id);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $body = $request->toArray();

        if (!array_key_exists('isActive', $body)) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Le champ "isActive" (booléen) est requis.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = $this->userService->setUserActive($user, (bool) $body['isActive']);

        return $this->json([
            'status' => 'success',
            'message' => sprintf(
                'Compte de %s %s.',
                $updated->getFullName(),
                $updated->isActive() ? 'réactivé' : 'désactivé',
            ),
            'data' => $this->userService->serializeUser($updated),
        ]);
    }

    /**
     * Accorde ou retire le rôle super-admin à un utilisateur.
     *
     * PUT /api/admin/users/{id}/super-admin
     * Body: { "isSuperAdmin": true }
     */
    #[Route('/{id}/super-admin', name: 'super_admin', methods: ['PUT'])]
    public function setSuperAdmin(string $id, Request $request): JsonResponse
    {
        $user = $this->findUserOrFail($id);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $body = $request->toArray();

        if (!array_key_exists('isSuperAdmin', $body)) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Le champ "isSuperAdmin" (booléen) est requis.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $updated = $this->userService->setUserSuperAdmin($user, (bool) $body['isSuperAdmin']);

        return $this->json([
            'status' => 'success',
            'message' => sprintf(
                'Rôle super-admin %s pour %s.',
                in_array('ROLE_SUPER_ADMIN', $updated->getRoles(), true) ? 'accordé' : 'retiré',
                $updated->getFullName(),
            ),
            'data' => $this->userService->serializeUser($updated),
        ]);
    }

    /**
     * Assigne ou révoque un rôle d'administration plateforme pour un utilisateur.
     *
     * PUT /api/admin/users/{id}/role
     * Body: { "roleId": "01J..." | null }
     */
    #[Route('/{id}/role', name: 'set_role', methods: ['PUT'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function updateAdminRole(
        string $id,
        Request $request,
        \App\Repository\AdminRoleRepository $roleRepository
    ): JsonResponse {
        $user = $this->findUserOrFail($id);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $body = $request->toArray();
        $roleId = $body['roleId'] ?? null;

        $role = null;
        if ($roleId !== null && $roleId !== '') {
            try {
                $ulid = \Symfony\Component\Uid\Ulid::fromString((string) $roleId);
                $role = $roleRepository->find($ulid);
            } catch (\Throwable) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'Identifiant de rôle invalide.',
                ], Response::HTTP_BAD_REQUEST);
            }

            if (!$role) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'Rôle d\'administration introuvable.',
                ], Response::HTTP_NOT_FOUND);
            }
        }

        $updated = $this->userService->setAdminRole($user, $role);

        return $this->json([
            'status' => 'success',
            'message' => $role
                ? sprintf('Rôle d\'administration "%s" assigné à %s.', $role->getName(), $updated->getFullName())
                : sprintf('Rôle d\'administration retiré pour %s.', $updated->getFullName()),
            'data' => $this->userService->serializeUser($updated),
        ]);
    }

    private function findUserOrFail(string $id): User|JsonResponse
    {
        $user = $this->userService->findUser($id);

        if ($user === null) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Utilisateur introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        return $user;
    }
}
