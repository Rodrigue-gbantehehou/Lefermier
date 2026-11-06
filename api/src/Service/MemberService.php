<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Member\CreateMemberRequestDto;
use App\Dto\Member\UpdateMemberRequestDto;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Role;
use App\Entity\User;
use App\Enum\FarmRole;
use App\Entity\Building;
use App\Repository\BuildingRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use App\Service\Admin\CommercialPlanService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Uid\Ulid;

class MemberService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FarmMembershipRepository $membershipRepository,
        private readonly UserRepository $userRepository,
        private readonly RoleRepository $roleRepository,
        private readonly BuildingRepository $buildingRepository,
        private readonly CommercialPlanService $commercialPlanService,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getMembersForFarm(Farm $farm): array
    {
        $memberships = $this->membershipRepository->findByFarm($farm);

        return array_map([$this, 'serializeMember'], $memberships);
    }

    public function addMember(Farm $farm, CreateMemberRequestDto $dto): FarmMembership
    {
        return $this->entityManager->wrapInTransaction(function () use ($farm, $dto): FarmMembership {
            $normalizedEmail = mb_strtolower(trim($dto->email));

            // 1. Rechercher si l'utilisateur existe déjà ou le créer
            // (fait avant le contrôle de quota pour pouvoir passer le candidat à assertCanAddMember)
            $user = $this->userRepository->findOneBy(['email' => $normalizedEmail]);
            if ($user === null) {
                $user = new User(
                    $normalizedEmail,
                    trim($dto->firstName),
                    trim($dto->lastName)
                );
                if ($dto->phone !== null && trim($dto->phone) !== '') {
                    $user->setPhone(trim($dto->phone));
                }

                $rawPassword = $dto->password ?? 'Lefermier@' . date('Y');
                $hashed = $this->passwordHasher->hashPassword($user, $rawPassword);
                $user->setPassword($hashed);

                $this->entityManager->persist($user);
            }

            // 0. Contrôle de quota sous verrou de l'organisation.
            // Le candidat est passé pour exclure les utilisateurs déjà membres de l'organisation
            // (ajout à une 2ème ferme sans nouveau collaborateur distinct → autoriser même si quota atteint).
            $this->commercialPlanService->assertCanAddMember($farm, $user->getId() !== null ? $user : null);

            // 2. Vérifier si l'utilisateur est déjà rattaché à cette exploitation spécifique
            $existing = $this->membershipRepository->findOneBy([
                'farm' => $farm,
                'user' => $user,
            ]);
            if ($existing !== null) {
                throw new BadRequestHttpException('Cet utilisateur est déjà collaborateur de cette exploitation.');
            }

            // 3. Déterminer le rôle
            $roleEnum = FarmRole::MANAGER;
            if ($dto->role !== null) {
                $parsed = FarmRole::tryFrom(strtoupper(trim($dto->role)));
                if ($parsed !== null && $parsed !== FarmRole::OWNER) {
                    $roleEnum = $parsed;
                }
            }

            $roleDefinition = null;
            if ($dto->roleId !== null) {
                $foundRole = $this->roleRepository->find($dto->roleId);
                if ($foundRole instanceof Role && $foundRole->getFarm()->getId()?->toRfc4122() === $farm->getId()?->toRfc4122()) {
                    $roleDefinition = $foundRole;
                }
            }

            // 4. Créer l'association FarmMembership
            $membership = new FarmMembership($farm, $user, $roleEnum, $roleDefinition);

            if (!empty($dto->buildingIds)) {
                foreach ($dto->buildingIds as $bId) {
                    try {
                        $ulid = Ulid::fromString((string) $bId);
                        $building = $this->buildingRepository->find($ulid);
                    } catch (\Throwable) {
                        $building = $this->buildingRepository->find($bId);
                    }
                    if ($building instanceof Building && $building->getFarm()->getId()?->toRfc4122() === $farm->getId()?->toRfc4122()) {
                        $membership->addAssignedBuilding($building);
                    }
                }
            }

            $this->entityManager->persist($membership);
            $this->entityManager->flush();

            return $membership;
        });
    }

    public function updateMember(FarmMembership $membership, UpdateMemberRequestDto $dto): FarmMembership
    {
        if ($membership->getRole() === FarmRole::OWNER) {
            throw new BadRequestHttpException('Le rôle ou statut du propriétaire de l\'exploitation ne peut pas être modifié.');
        }

        if ($dto->roleId !== null) {
            $foundRole = $this->roleRepository->find($dto->roleId);
            if ($foundRole instanceof Role && $foundRole->getFarm()->getId()?->toRfc4122() === $membership->getFarm()->getId()?->toRfc4122()) {
                $membership->setRoleDefinition($foundRole);
            }
        }

        if ($dto->role !== null) {
            $parsed = FarmRole::tryFrom(strtoupper(trim($dto->role)));
            if ($parsed !== null && $parsed !== FarmRole::OWNER) {
                $membership->setRole($parsed);
            }
        }

        if ($dto->isActive !== null) {
            $membership->setIsActive($dto->isActive);
        }

        if ($dto->buildingIds !== null) {
            $membership->clearAssignedBuildings();
            foreach ($dto->buildingIds as $bId) {
                try {
                    $ulid = Ulid::fromString((string) $bId);
                    $building = $this->buildingRepository->find($ulid);
                } catch (\Throwable) {
                    $building = $this->buildingRepository->find($bId);
                }
                if ($building instanceof Building && $building->getFarm()->getId()?->toRfc4122() === $membership->getFarm()->getId()?->toRfc4122()) {
                    $membership->addAssignedBuilding($building);
                }
            }
        }

        $this->entityManager->flush();

        return $membership;
    }

    public function removeMember(FarmMembership $membership): void
    {
        if ($membership->getRole() === FarmRole::OWNER) {
            throw new BadRequestHttpException('Le propriétaire initial de l\'exploitation ne peut pas être supprimé.');
        }

        $this->entityManager->remove($membership);
        $this->entityManager->flush();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeMember(FarmMembership $membership): array
    {
        $user = $membership->getUser();
        $roleDef = $membership->getRoleDefinition();

        $assignedBuildings = [];
        foreach ($membership->getAssignedBuildings() as $b) {
            $assignedBuildings[] = [
                'id' => $b->getId()?->toBase32(),
                'name' => $b->getName(),
                'type' => $b->getType()->value,
                'capacity' => $b->getCapacity(),
            ];
        }

        return [
            'id' => $membership->getId()?->toRfc4122(),
            'userId' => $user->getId()?->toRfc4122(),
            'email' => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'fullName' => $user->getFirstName() . ' ' . $user->getLastName(),
            'phone' => $user->getPhone(),
            'role' => $membership->getRole()->value,
            'roleDefinition' => $roleDef !== null ? [
                'id' => $roleDef->getId()?->toRfc4122(),
                'name' => $roleDef->getName(),
                'code' => $roleDef->getCode(),
                'isSystem' => $roleDef->isSystem(),
                'permissions' => $roleDef->getPermissions(),
            ] : null,
            'assignedBuildings' => $assignedBuildings,
            'assignedBuildingIds' => array_map(fn($ab) => $ab['id'], $assignedBuildings),
            'permissions' => $membership->getPermissions(),
            'isActive' => $membership->isActive(),
            'isOwner' => $membership->getRole() === FarmRole::OWNER,
            'createdAt' => $membership->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
