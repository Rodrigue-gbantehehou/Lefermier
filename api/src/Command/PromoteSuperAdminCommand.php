<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:make-super-admin',
    description: 'Accorde les privilèges ROLE_SUPER_ADMIN à un utilisateur pour le back-office admin/'
)]
class PromoteSuperAdminCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly \App\Service\Admin\AdminRoleService $adminRoleService,
        private readonly \App\Service\Admin\AdminAuditService $adminAuditService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Adresse e-mail de l\'utilisateur à promouvoir')
            ->addOption('password', 'p', InputOption::VALUE_OPTIONAL, 'Nouveau mot de passe pour cet utilisateur');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = (string) $input->getArgument('email');
        $newPassword = $input->getOption('password');

        $user = $this->userRepository->findOneBy(['email' => $email]);
        if (!$user) {
            $io->error(sprintf('Utilisateur avec l\'email "%s" introuvable.', $email));
            return Command::FAILURE;
        }

        // Assure que les rôles admin par défaut existent
        $this->adminRoleService->ensureDefaultRoles();
        $superAdminRole = $this->entityManager->getRepository(\App\Entity\AdminRole::class)->findOneBy(['code' => 'SUPER_ADMIN']);
        if ($superAdminRole) {
            $user->setAdminRole($superAdminRole);
        }

        $roles = $user->getRoles();
        if (!in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            $roles[] = 'ROLE_SUPER_ADMIN';
            $user->setRoles(array_values(array_unique($roles)));
        }

        if ($newPassword) {
            $hashed = $this->passwordHasher->hashPassword($user, (string) $newPassword);
            $user->setPassword($hashed);
            $this->adminAuditService->log(
                action: 'PASSWORD_CHANGE',
                label: 'Changement de mot de passe (CLI)',
                targetType: 'User',
                targetId: (string) $user->getId()?->toBase32(),
                targetName: $user->getFullName(),
                details: sprintf('Mot de passe défini via console CLI pour le compte %s', $email),
                status: 'SUCCESS',
                actor: $user,
            );
            $io->note('Mot de passe mis à jour.');
        }

        $this->entityManager->flush();
        $io->success(sprintf('L\'utilisateur %s (%s) est configuré avec ROLE_SUPER_ADMIN et le rôle plateforme SUPER_ADMIN.', $user->getFullName(), $email));

        return Command::SUCCESS;
    }
}
