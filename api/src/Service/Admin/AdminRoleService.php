<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Entity\AdminRole;
use App\Entity\User;
use App\Repository\AdminRoleRepository;
use App\Security\AdminPermission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class AdminRoleService
{
    public function __construct(
        private readonly AdminRoleRepository $roleRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Initialise les rôles modèles par défaut pour l'équipe plateforme.
     *
     * @return array<AdminRole>
     */
    public function ensureDefaultRoles(): array
    {
        $existing = $this->roleRepository->findAllOrdered();
        if (!empty($existing)) {
            return $existing;
        }

        $allPermKeys = array_keys(AdminPermission::all());

        $defaults = [
            new AdminRole(
                name: 'Super-Administrateur',
                code: 'SUPER_ADMIN',
                permissions: ['*'],
                description: 'Accès absolu et illimité à l\'ensemble des fonctions de la console centrale.',
                isSystem: true,
            ),
            new AdminRole(
                name: 'Administrateur Général',
                code: 'ADMIN_GENERAL',
                permissions: array_values(array_diff($allPermKeys, [AdminPermission::ROLES_MANAGE])),
                description: 'Supervision complète des organisations, fermes, abonnements et utilisateurs.',
                isSystem: true,
            ),
            new AdminRole(
                name: 'Support Client & Fermes',
                code: 'ADMIN_SUPPORT',
                permissions: [
                    AdminPermission::DASHBOARD_VIEW,
                    AdminPermission::ORGANIZATIONS_VIEW,
                    AdminPermission::USERS_VIEW,
                ],
                description: 'Accompagnement et assistance aux éleveurs sans droits de suspension.',
                isSystem: true,
            ),
            new AdminRole(
                name: 'Responsable Facturation & MRR',
                code: 'ADMIN_FINANCE',
                permissions: [
                    AdminPermission::DASHBOARD_VIEW,
                    AdminPermission::ORGANIZATIONS_VIEW,
                    AdminPermission::SUBSCRIPTIONS_VIEW,
                    AdminPermission::SUBSCRIPTIONS_MANAGE,
                ],
                description: 'Gestion des formules commerciales, quotas et suivi du revenu récurrent.',
                isSystem: true,
            ),
        ];

        foreach ($defaults as $role) {
            $this->entityManager->persist($role);
        }
        $this->entityManager->flush();

        return $defaults;
    }

    /**
     * @return array<AdminRole>
     */
    public function getRoles(): array
    {
        $roles = $this->roleRepository->findAllOrdered();
        if (empty($roles)) {
            return $this->ensureDefaultRoles();
        }
        return $roles;
    }

    public function createRole(string $name, string $code, array $permissions, ?string $description = null): AdminRole
    {
        $cleanCode = strtoupper(trim($code));
        if ($this->roleRepository->findByCode($cleanCode) !== null) {
            throw new ConflictHttpException(sprintf('Un rôle d\'administration avec le code "%s" existe déjà.', $cleanCode));
        }

        $validPermissions = $this->filterValidPermissions($permissions);

        $role = new AdminRole(
            name: trim($name),
            code: $cleanCode,
            permissions: $validPermissions,
            description: $description ? trim($description) : null,
            isSystem: false,
        );

        $this->entityManager->persist($role);
        $this->entityManager->flush();

        return $role;
    }

    public function updateRole(AdminRole $role, ?string $name = null, ?array $permissions = null, ?string $description = null): AdminRole
    {
        if ($name !== null) {
            $role->setName(trim($name));
        }

        if ($description !== null) {
            $role->setDescription(trim($description));
        }

        if ($permissions !== null) {
            if ($role->isSystem() && in_array('*', $role->getPermissions(), true)) {
                // Le super-admin système conserve le wildcard
                $role->setPermissions(['*']);
            } else {
                $role->setPermissions($this->filterValidPermissions($permissions));
            }
        }

        $this->entityManager->flush();

        return $role;
    }

    public function deleteRole(AdminRole $role): void
    {
        if ($role->isSystem()) {
            throw new BadRequestHttpException('Impossible de supprimer un rôle système protégé de la plateforme.');
        }

        $this->entityManager->remove($role);
        $this->entityManager->flush();
    }

    public function serializeRole(AdminRole $role): array
    {
        return [
            'id' => $role->getId()->toBase32(),
            'name' => $role->getName(),
            'code' => $role->getCode(),
            'description' => $role->getDescription(),
            'permissions' => $role->getPermissions(),
            'isSystem' => $role->isSystem(),
            'createdAt' => $role->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $role->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function filterValidPermissions(array $permissions): array
    {
        if (in_array('*', $permissions, true)) {
            return ['*'];
        }

        return array_values(array_filter($permissions, fn ($p) => AdminPermission::isValid($p)));
    }
}
