<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AdminRole;
use App\Entity\User;
use App\Repository\AdminRoleRepository;
use App\Security\AdminPermission;
use App\Service\Admin\AdminUserService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Ulid;

/**
 * Gestion administrative des utilisateurs de la plateforme.
 *
 * Protégé par les permissions granulaires du modèle Microsoft RBAC.
 */
#[Route('/api/admin/users', name: 'api_admin_users_')]
class UserController extends AbstractController
{
    public function __construct(
        private readonly AdminUserService $userService,
        private readonly \App\Service\Admin\AdminAuditService $auditService,
    ) {
    }

    /**
     * Liste paginée des utilisateurs de la plateforme avec filtres d'état et recherche.
     *
     * GET /api/admin/users?page=1&limit=25&active=true&search=koffi
     */
    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(AdminPermission::USERS_VIEW)]
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
    #[IsGranted(AdminPermission::USERS_VIEW)]
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
    #[IsGranted(AdminPermission::USERS_MANAGE)]
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

        $targetIsActive = (bool) $body['isActive'];

        /** @var User|null $currentUser */
        $currentUser = $this->getUser();

        // C3 : Garde "soi-même" : interdiction de désactiver son propre compte
        if (!$targetIsActive && $currentUser instanceof User && $user->getId()?->equals($currentUser->getId())) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Opération interdite : vous ne pouvez pas désactiver votre propre compte administrateur.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // C3 : Garde "dernier super-admin" : interdiction de désactiver le dernier super-administrateur actif
        if (!$targetIsActive && $this->userService->isSuperAdmin($user)) {
            if ($this->userService->countActiveSuperAdmins() <= 1) {
                return $this->json([
                    'status' => 'error',
                    'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                    'message' => 'Opération interdite : impossible de désactiver le dernier super-administrateur actif de la plateforme.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $updated = $this->userService->setUserActive($user, $targetIsActive);

        $this->auditService->log(
            action: 'USER_STATUS_TOGGLE',
            label: $targetIsActive ? 'Activation de compte' : 'Désactivation de compte',
            targetType: 'USER',
            targetId: $updated->getId()?->toBase32() ?? $id,
            targetName: $updated->getFullName(),
            details: sprintf('Compte utilisateur %s (%s).', $targetIsActive ? 'réactivé' : 'désactivé', $updated->getEmail()),
        );

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
     * Assigne ou révoque un rôle d'administration plateforme pour un utilisateur.
     *
     * PUT /api/admin/users/{id}/role
     * Body: { "roleId": "01J..." | null }
     */
    #[Route('/{id}/role', name: 'set_role', methods: ['PUT'])]
    #[IsGranted(AdminPermission::ROLES_MANAGE)]
    public function updateAdminRole(
        string $id,
        Request $request,
        AdminRoleRepository $roleRepository
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
                $ulid = Ulid::fromString((string) $roleId);
                $role = $roleRepository->find($ulid);
            } catch (\Throwable) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'Identifiant de rôle invalide.',
                ], Response::HTTP_BAD_REQUEST);
            }

            if (!$role instanceof AdminRole) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'Rôle d\'administration introuvable.',
                ], Response::HTTP_NOT_FOUND);
            }
        }

        /** @var User|null $currentUser */
        $currentUser = $this->getUser();
        $isSelf = $currentUser instanceof User && $user->getId()?->equals($currentUser->getId());
        $targetWasSuperAdmin = $this->userService->isSuperAdmin($user);
        $newRoleIsSuperAdmin = $role !== null && $role->hasPermission('*');

        // C3 : Garde "soi-même" : interdiction de se rétrograder soi-même ou de révoquer ses droits
        if ($isSelf && $targetWasSuperAdmin && !$newRoleIsSuperAdmin) {
            return $this->json([
                'status' => 'error',
                'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'message' => 'Opération interdite : vous ne pouvez pas modifier ou révoquer vos propres privilèges de super-administrateur.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // C3 : Garde "dernier super-admin" : impossible de retirer le statut super-admin du dernier super-admin actif
        if ($targetWasSuperAdmin && !$newRoleIsSuperAdmin) {
            if ($this->userService->countActiveSuperAdmins() <= 1) {
                return $this->json([
                    'status' => 'error',
                    'code' => Response::HTTP_UNPROCESSABLE_ENTITY,
                    'message' => 'Opération interdite : impossible de révoquer les privilèges du dernier super-administrateur actif de la plateforme.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $updated = $this->userService->setAdminRole($user, $role);

        // Si rôle Super-Admin, synchroniser ROLE_SUPER_ADMIN
        if ($role !== null && $role->hasPermission('*')) {
            $roles = $updated->getRoles();
            if (!in_array('ROLE_SUPER_ADMIN', $roles, true)) {
                $roles[] = 'ROLE_SUPER_ADMIN';
                $updated->setRoles(array_values(array_unique($roles)));
                $this->userService->saveUser($updated);
            }
        } elseif ($targetWasSuperAdmin && !$newRoleIsSuperAdmin) {
            // Retirer ROLE_SUPER_ADMIN s'il était présent dans roles
            $roles = array_values(array_filter($updated->getRoles(), fn (string $r) => $r !== 'ROLE_SUPER_ADMIN' && $r !== 'ROLE_USER'));
            $roles[] = 'ROLE_USER';
            $updated->setRoles($roles);
            $this->userService->saveUser($updated);
        }

        $this->auditService->log(
            action: 'ADMIN_ROLE_ASSIGNMENT',
            label: $role ? 'Attribution rôle plateforme' : 'Révocation rôle plateforme',
            targetType: 'USER',
            targetId: $updated->getId()?->toBase32() ?? $id,
            targetName: $updated->getFullName(),
            details: $role
                ? sprintf('Attribution du rôle "%s" (%s) à %s.', $role->getName(), $role->getCode(), $updated->getEmail())
                : sprintf('Révocation de tout rôle d\'administration pour %s.', $updated->getEmail()),
        );

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
