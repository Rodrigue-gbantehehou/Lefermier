<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service de gestion administrative des utilisateurs de la plateforme.
 */
class AdminUserService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Recherche un utilisateur par son identifiant ULID avec ses appartenances de fermes.
     */
    public function findUser(string $id): ?User
    {
        $users = $this->userRepository->createQueryBuilder('u')
            ->leftJoin('u.farmMemberships', 'fm')
            ->leftJoin('fm.farm', 'f')
            ->leftJoin('f.organization', 'o')
            ->addSelect('fm', 'f', 'o')
            ->where('u.id = :id')
            ->setParameter('id', $id, 'ulid')
            ->getQuery()
            ->getResult();

        return $users[0] ?? null;
    }

    /**
     * Liste paginée des utilisateurs de la plateforme avec filtres d'état et recherche.
     *
     * @return array{data: array<int, array<string, mixed>>, total: int, page: int, limit: int}
     */
    public function listUsers(int $page = 1, int $limit = 25, ?bool $isActive = null, ?string $search = null): array
    {
        $qb = $this->userRepository->createQueryBuilder('u')
            ->orderBy('u.createdAt', 'DESC');

        if ($isActive !== null) {
            $qb->andWhere('u.isActive = :isActive')
               ->setParameter('isActive', $isActive);
        }

        if ($search !== null && $search !== '') {
            $qb->andWhere('u.email LIKE :search OR u.firstName LIKE :search OR u.lastName LIKE :search OR u.phone LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        $total = (clone $qb)->select('COUNT(u.id)')->getQuery()->getSingleScalarResult();

        $users = $qb
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return [
            'data' => array_map(fn (User $user) => $this->serializeUser($user), $users),
            'total' => (int) $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }

    /**
     * Active ou désactive un compte utilisateur.
     */
    public function setUserActive(User $user, bool $isActive): User
    {
        $user->setIsActive($isActive);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Vérifie si un utilisateur est considéré comme Super-Administrateur.
     */
    public function isSuperAdmin(User $user): bool
    {
        if (in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        return $user->getAdminRole() !== null && $user->getAdminRole()->hasPermission('*');
    }

    /**
     * Compte le nombre de super-administrateurs actuellement actifs sur la plateforme.
     */
    public function countActiveSuperAdmins(): int
    {
        $qb = $this->userRepository->createQueryBuilder('u')
            ->leftJoin('u.adminRole', 'r')
            ->select('COUNT(DISTINCT u.id)')
            ->where('u.isActive = true')
            ->andWhere('(u.roles LIKE :superAdminRole OR r.permissions LIKE :wildcard OR r.code = :superAdminCode)')
            ->setParameter('superAdminRole', '%ROLE_SUPER_ADMIN%')
            ->setParameter('wildcard', '%"*"%')
            ->setParameter('superAdminCode', 'SUPER_ADMIN');

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Sauvegarde les modifications d'une entité utilisateur.
     */
    public function saveUser(User $user): void
    {
        $this->entityManager->flush();
    }

    /**
     * Assigne un rôle d'administration plateforme à un utilisateur.
     */
    public function setAdminRole(User $user, ?\App\Entity\AdminRole $role): User
    {
        $user->setAdminRole($role);
        $this->entityManager->flush();

        return $user;
    }

    /**
     * Sérialise un utilisateur pour l'affichage dans le back-office.
     *
     * @return array<string, mixed>
     */
    public function serializeUser(User $user): array
    {
        $farms = [];
        foreach ($user->getFarmMemberships() as $membership) {
            if ($membership->isActive()) {
                $farm = $membership->getFarm();
                $farms[] = [
                    'id' => $farm->getId()?->toBase32(),
                    'name' => $farm->getName(),
                    'role' => $membership->getRole()->value,
                    'organization' => $farm->getOrganization()->getName(),
                ];
            }
        }

        $adminRole = $user->getAdminRole();
        $isSuperAdmin = in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true);

        return [
            'id' => $user->getId()?->toBase32(),
            'email' => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'fullName' => $user->getFullName(),
            'phone' => $user->getPhone(),
            'roles' => $user->getRoles(),
            'isActive' => $user->isActive(),
            'adminRole' => $adminRole ? [
                'id' => $adminRole->getId()->toBase32(),
                'name' => $adminRole->getName(),
                'code' => $adminRole->getCode(),
            ] : null,
            'adminPermissions' => $adminRole ? $adminRole->getPermissions() : ($isSuperAdmin ? ['*'] : []),
            'farmsCount' => count($farms),
            'farms' => $farms,
            'createdAt' => $user->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $user->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
