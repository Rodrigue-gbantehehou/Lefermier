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
use App\Repository\FarmMembershipRepository;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class MemberService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly FarmMembershipRepository $membershipRepository,
        private readonly UserRepository $userRepository,
        private readonly RoleRepository $roleRepository,
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
        $normalizedEmail = mb_strtolower(trim($dto->email));

        // 1. Rechercher si l'utilisateur existe déjà ou le créer
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

        // 2. Vérifier si l'utilisateur est déjà rattaché à cette exploitation
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
        $this->entityManager->persist($membership);
        $this->entityManager->flush();

        return $membership;
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
            'permissions' => $membership->getPermissions(),
            'isActive' => $membership->isActive(),
            'isOwner' => $membership->getRole() === FarmRole::OWNER,
            'createdAt' => $membership->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
