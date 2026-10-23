<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Auth\RegisterRequestDto;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Organization;
use App\Entity\User;
use App\Enum\FarmRole;
use App\Exception\EmailAlreadyExistsException;
use App\Repository\OrganizationRepository;
use App\Repository\UserRepository;
use App\Service\Admin\AdminAuditService;
use App\Service\Admin\CommercialPlanService;
use App\Service\Admin\PlatformModuleRegistry;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\String\Slugger\SluggerInterface;

class AuthService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly OrganizationRepository $organizationRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly EntityManagerInterface $entityManager,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly SluggerInterface $slugger,
        private readonly AdminAuditService $adminAuditService,
        private readonly CommercialPlanService $commercialPlanService,
    ) {
    }

    /**
     * @return array{token: string, user: User, farm: ?Farm}
     */
    public function register(RegisterRequestDto $dto): array
    {
        $normalizedEmail = mb_strtolower(trim($dto->email));

        if ($this->userRepository->findOneBy(['email' => $normalizedEmail]) !== null) {
            throw new EmailAlreadyExistsException($normalizedEmail);
        }

        return $this->entityManager->wrapInTransaction(function () use ($dto, $normalizedEmail): array {
            // 1. Création de l'utilisateur
            $user = new User($normalizedEmail, $dto->firstName, $dto->lastName);
            $user->setPhone($dto->phone);
            $hashedPassword = $this->passwordHasher->hashPassword($user, $dto->password);
            $user->setPassword($hashedPassword);
            $this->entityManager->persist($user);

            $farm = null;

            // 2. Création de l'exploitation uniquement si farmName a été spécifié (rétro-compatibilité)
            if (!empty($dto->farmName)) {
                $orgName = $dto->organizationName ?: $dto->farmName;
                $baseSlug = $this->slugger->slug($orgName)->lower()->toString();
                if ($baseSlug === '') {
                    $baseSlug = 'organisation';
                }

                $uniqueSlug = $baseSlug;
                $counter = 1;
                while ($this->organizationRepository->findOneBy(['slug' => $uniqueSlug]) !== null) {
                    $uniqueSlug = sprintf('%s-%d', $baseSlug, $counter++);
                }

                $organization = new Organization($orgName, $uniqueSlug);
                $this->entityManager->persist($organization);

                $farm = new Farm($organization, $dto->farmName, $dto->productionType ?? \App\Enum\ProductionType::MIXED);
                $farm->setLocationCity($dto->locationCity);
                $this->entityManager->persist($farm);

                $membership = new FarmMembership($farm, $user, FarmRole::OWNER);
                $this->entityManager->persist($membership);
            }

            $this->entityManager->flush();

            // 3. Génération immédiate du jeton JWT
            $token = $this->jwtManager->create($user);

            return [
                'token' => $token,
                'user' => $user,
                'farm' => $farm,
            ];
        });
    }

    /**
     * Retourne la vue complète du profil et des exploitations autorisées.
     *
     * @return array<string, mixed>
     */
    public function getUserProfile(User $user): array
    {
        $farms = [];
        foreach ($user->getFarmMemberships() as $membership) {
            if ($membership->isActive()) {
                $farm = $membership->getFarm();
                $org = $farm->getOrganization();
                $planSku = strtoupper($org->getSubscriptionPlan());
                $plan = $this->commercialPlanService->getPlan($planSku) ?? $this->commercialPlanService->getPlan('STANDARD');
                $planModules = $plan['modules'] ?? [];
                $planPermissions = PlatformModuleRegistry::getPermissionsForModules($planModules);

                $rawPermissions = $membership->getPermissions();
                if (in_array('*', $rawPermissions, true)) {
                    $effectivePermissions = $planPermissions;
                } else {
                    $effectivePermissions = array_values(array_filter(
                        $rawPermissions,
                        function (string $p) use ($planModules) {
                            $mod = PlatformModuleRegistry::getModuleForPermission($p);
                            return $mod === null || in_array($mod, $planModules, true);
                        }
                    ));
                }

                $farms[] = [
                    'id' => $farm->getId()?->toBase32(),
                    'name' => $farm->getName(),
                    'code' => $farm->getCode(),
                    'productionType' => $farm->getProductionType()->value,
                    'currency' => $farm->getCurrency(),
                    'locationCity' => $farm->getLocationCity(),
                    'locationCountry' => $farm->getLocationCountry(),
                    'phone' => $farm->getPhone(),
                    'email' => $farm->getEmail(),
                    'address' => $farm->getAddress(),
                    'ifu' => $farm->getIfu(),
                    'rccm' => $farm->getRccm(),
                    'description' => $farm->getDescription(),
                    'role' => $membership->getRole()->value,
                    'roleName' => $membership->getRoleDefinition()?->getName() ?? $membership->getRole()->value,
                    'permissions' => $effectivePermissions,
                    'subscription' => [
                        'plan' => $planSku,
                        'planName' => $plan['name'] ?? $planSku,
                        'tier' => $plan['tier'] ?? null,
                        'badge' => $plan['badge'] ?? null,
                        'modules' => $planModules,
                        'quotas' => $plan['quotas'] ?? [
                            'maxFarms' => 1,
                            'maxFlocks' => 2,
                            'maxMembers' => 2,
                            'maxBuildings' => 2,
                            'retentionMonths' => 3,
                        ],
                        'status' => $plan['status'] ?? 'ACTIVE',
                    ],
                ];
            }
        }

        return [
            'id' => $user->getId()?->toBase32(),
            'email' => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName' => $user->getLastName(),
            'fullName' => $user->getFullName(),
            'phone' => $user->getPhone(),
            'roles' => $user->getRoles(),
            'adminRole' => $user->getAdminRole() ? [
                'id' => $user->getAdminRole()->getId()->toBase32(),
                'name' => $user->getAdminRole()->getName(),
                'code' => $user->getAdminRole()->getCode(),
            ] : null,
            'adminPermissions' => $user->getAdminRole()
                ? $user->getAdminRole()->getPermissions()
                : (in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true) ? ['*'] : []),
            'farms' => $farms,
        ];
    }

    /**
     * Demande de réinitialisation de mot de passe par Email ou SMS.
     *
     * @return array<string, mixed>
     */
    public function requestPasswordReset(string $identifier, string $channel = 'email'): array
    {
        $clean = trim($identifier);
        $user = $this->userRepository->findOneBy(['email' => strtolower($clean)]);
        if ($user === null && !empty($clean)) {
            $user = $this->userRepository->findOneBy(['phone' => $clean]);
        }

        if ($user === null) {
            return [
                'message' => 'Si un compte est associé à ces coordonnées, des instructions de réinitialisation ont été envoyées.',
            ];
        }

        $code = sprintf('%06d', random_int(100000, 999999));
        $user->setPasswordResetToken($code);
        $user->setPasswordResetExpiresAt(new \DateTimeImmutable('+15 minutes'));

        $this->entityManager->flush();

        return [
            'message' => 'Si un compte est associé à ces coordonnées, des instructions de réinitialisation ont été envoyées.',
            'devCode' => $code,
            'channel' => $channel,
        ];
    }

    /**
     * Validation du code et changement de mot de passe.
     */
    public function resetPassword(string $identifier, string $code, string $newPassword): void
    {
        $clean = trim($identifier);
        $user = $this->userRepository->findOneBy(['email' => strtolower($clean)]);
        if ($user === null && !empty($clean)) {
            $user = $this->userRepository->findOneBy(['phone' => $clean]);
        }

        if ($user === null || !$user->isPasswordResetTokenValid(trim($code))) {
            throw new \InvalidArgumentException('Le code de réinitialisation est invalide ou a expiré.');
        }

        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException('Le nouveau mot de passe doit comporter au moins 8 caractères.');
        }

        $hashed = $this->passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($hashed);
        $user->setPasswordResetToken(null);
        $user->setPasswordResetExpiresAt(null);

        $this->entityManager->flush();

        $this->adminAuditService->log(
            action: 'PASSWORD_RESET',
            label: 'Réinitialisation de mot de passe',
            targetType: 'User',
            targetId: (string) $user->getId()?->toBase32(),
            targetName: $user->getFullName(),
            details: sprintf('Mot de passe réinitialisé via code de vérification pour %s', $user->getEmail()),
            status: 'SUCCESS',
            actor: $user,
        );
    }

    /**
     * Modification du mot de passe par un utilisateur authentifié.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!$this->passwordHasher->isPasswordValid($user, $currentPassword)) {
            $this->adminAuditService->log(
                action: 'PASSWORD_CHANGE',
                label: 'Échec de changement de mot de passe',
                targetType: 'User',
                targetId: (string) $user->getId()?->toBase32(),
                targetName: $user->getFullName(),
                details: sprintf('Tentative échouée : ancien mot de passe erroné pour %s', $user->getEmail()),
                status: 'FAILED',
                actor: $user,
            );
            throw new \InvalidArgumentException('Le mot de passe actuel saisi est incorrect.');
        }

        if (strlen($newPassword) < 8) {
            throw new \InvalidArgumentException('Le nouveau mot de passe doit comporter au moins 8 caractères.');
        }

        $hashed = $this->passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($hashed);
        $this->entityManager->flush();

        $this->adminAuditService->log(
            action: 'PASSWORD_CHANGE',
            label: 'Changement de mot de passe',
            targetType: 'User',
            targetId: (string) $user->getId()?->toBase32(),
            targetName: $user->getFullName(),
            details: sprintf('Mot de passe mis à jour avec succès par l\'utilisateur %s', $user->getEmail()),
            status: 'SUCCESS',
            actor: $user,
        );
    }
}
