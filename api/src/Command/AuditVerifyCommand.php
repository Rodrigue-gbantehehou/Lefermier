<?php

declare(strict_types=1);

namespace App\Command;

use App\Tests\Service\AuditFixesVerificationTest;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:audit:verify',
    description: 'Exécute la suite complète de vérification de sécurité et d\'intégrité métier du backend (audit P0/P1/P2)'
)]
class AuditVerifyCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Exécution de la suite de vérification de l\'audit Poulvia');

        try {
            AuditFixesVerificationTest::runAll();
            $io->success('Tous les tests de conformité et d\'intégrité métier ont réussi avec succès.');

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $io->error(sprintf("Échec d'un test d'audit : %s\n%s", $e->getMessage(), $e->getTraceAsString()));

            return Command::FAILURE;
        }
    }
}
