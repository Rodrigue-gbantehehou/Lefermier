<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Role\CreateRoleRequestDto;
use App\Dto\Role\UpdateRoleRequestDto;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Role;
use App\Repository\RoleRepository;
use App\Security\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class RoleService
{
    public function __construct(
        private readonly RoleRepository $roleRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Crée les rôles de démarrage pour une nouvelle exploitation avicole.
     *
     * @return array<Role>
     */
    public function createDefaultRolesForFarm(Farm $farm): array
    {
        $existing = $this->roleRepository->findForFarm($farm);
        if (!empty($existing)) {
            return $existing;
        }

        $roles = [
            new Role(
                farm: $farm,
                name: 'Propriétaire',
                code: 'OWNER',
                permissions: ['*'],
                description: 'Accès absolu et illimité à toutes les fonctionnalités et paramètres de l\'agence',
                isSystem: true,
            ),
            new Role(
                farm: $farm,
                name: 'Gérant d\'exploitation',
                code: 'MANAGER',
                permissions: array_values(array_diff(array_keys(Permission::all()), [Permission::FARM_DELETE])),
                description: 'Pilotage complet opérationnel, zootechnique, financier et humain',
                isSystem: false,
            ),
            new Role(
                farm: $farm,
                name: 'Chef d\'élevage',
                code: 'PRODUCTION_LEAD',
                permissions: [
                    Permission::FLOCK_VIEW,
                    Permission::FLOCK_CREATE,
                    Permission::FLOCK_MOVEMENT,
                    Permission::EGG_VIEW,
                    Permission::EGG_CREATE,
                    Permission::INVENTORY_VIEW,
                    Permission::INVENTORY_MOVEMENT,
                    Permission::HEALTH_VIEW,
                    Permission::HEALTH_MANAGE,
                    Permission::DASHBOARD_VIEW,
                ],
                description: 'Gestion des lots de volailles, ramassage des œufs, soins et alimentation (données financières masquées)',
                isSystem: false,
            ),
            new Role(
                farm: $farm,
                name: 'Magasinier / Gestionnaire de stock',
                code: 'STOCK_KEEPER',
                permissions: [
                    Permission::INVENTORY_VIEW,
                    Permission::INVENTORY_CREATE,
                    Permission::INVENTORY_MOVEMENT,
                    Permission::INVENTORY_VALUATION,
                    Permission::HEALTH_VIEW,
                    Permission::DASHBOARD_VIEW,
                ],
                description: 'Suivi des réceptions, distributions d\'aliments, vaccins et seuils d\'alerte',
                isSystem: false,
            ),
            new Role(
                farm: $farm,
                name: 'Comptable / Trésorier',
                code: 'ACCOUNTANT',
                permissions: [
                    Permission::FINANCE_VIEW,
                    Permission::FINANCE_CREATE,
                    Permission::FINANCE_MARGIN,
                    Permission::CONTACT_VIEW,
                    Permission::CONTACT_CREATE,
                    Permission::DASHBOARD_VIEW,
                    Permission::DASHBOARD_FINANCIALS,
                ],
                description: 'Facturation, encaissements MoMo/Espèces, dépenses et analyse des marges',
                isSystem: false,
            ),
        ];

        foreach ($roles as $role) {
            $this->entityManager->persist($role);
        }
        $this->entityManager->flush();

        return $roles;
    }

    public function createRole(Farm $farm, CreateRoleRequestDto $dto): Role
    {
        $code = $dto->code !== null && trim($dto->code) !== ''
            ? strtoupper(trim($dto->code))
            : $this->generateCodeFromName($dto->name);

        $existing = $this->roleRepository->findOneByFarmAndCode($farm, $code);
        if ($existing !== null) {
            throw new ConflictHttpException(sprintf('Un rôle avec le code "%s" existe déjà pour cette exploitation.', $code));
        }

        $validPermissions = $this->filterValidPermissions($dto->permissions);

        $role = new Role(
            farm: $farm,
            name: $dto->name,
            code: $code,
            permissions: $validPermissions,
            description: $dto->description,
            isSystem: false,
        );

        $this->entityManager->persist($role);
        $this->entityManager->flush();

        return $role;
    }

    public function updateRole(Role $role, UpdateRoleRequestDto $dto): Role
    {
        if ($role->isSystem() && $role->getCode() === 'OWNER') {
            throw new BadRequestHttpException('Le rôle Propriétaire système ne peut pas être modifié.');
        }

        if ($dto->name !== null && trim($dto->name) !== '') {
            $role->setName(trim($dto->name));
        }

        if ($dto->description !== null) {
            $role->setDescription(trim($dto->description));
        }

        if ($dto->permissions !== null) {
            $role->setPermissions($this->filterValidPermissions($dto->permissions));
        }

        $this->entityManager->flush();

        return $role;
    }

    public function deleteRole(Role $role): void
    {
        if ($role->isSystem()) {
            throw new BadRequestHttpException('Les rôles système prédéfinis ne peuvent pas être supprimés.');
        }

        $this->entityManager->remove($role);
        $this->entityManager->flush();
    }

    public function assignRoleToMembership(FarmMembership $membership, Role $role): void
    {
        if ($membership->getFarm()->getId()->toRfc4122() !== $role->getFarm()->getId()->toRfc4122()) {
            throw new BadRequestHttpException('Le rôle n\'appartient pas à la même exploitation.');
        }

        $membership->setRoleDefinition($role);
        $this->entityManager->flush();
    }

    /**
     * @return array<Role>
     */
    public function getRolesForFarm(Farm $farm): array
    {
        $roles = $this->roleRepository->findForFarm($farm);
        if (empty($roles)) {
            // Initialisation automatique à la volée si la ferme n'a pas encore ses rôles
            $roles = $this->createDefaultRolesForFarm($farm);
        }

        return $roles;
    }

    /**
     * @param array<string> $requestedPermissions
     * @return array<string>
     */
    private function filterValidPermissions(array $requestedPermissions): array
    {
        if (in_array('*', $requestedPermissions, true)) {
            return ['*'];
        }

        $valid = [];
        $allSystem = Permission::all();
        foreach ($requestedPermissions as $perm) {
            if (array_key_exists($perm, $allSystem)) {
                $valid[] = $perm;
            }
        }

        return array_values(array_unique($valid));
    }

    private function generateCodeFromName(string $name): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT', $name);
        $code = preg_replace('/[^a-zA-Z0-9]+/', '_', (string)$ascii);
        return strtoupper(trim((string)$code, '_'));
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeRole(Role $role): array
    {
        return [
            'id' => (string) $role->getId(),
            'name' => $role->getName(),
            'code' => $role->getCode(),
            'description' => $role->getDescription(),
            'permissions' => $role->getPermissions(),
            'isSystem' => $role->isSystem(),
            'createdAt' => $role->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $role->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
