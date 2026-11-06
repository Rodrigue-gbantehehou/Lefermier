<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\IdempotencyRecordRepository;
use App\Service\Admin\CommercialPlanService;
use App\Service\FlockService;
use App\Service\HealthService;
use App\Service\IdempotencyService;
use App\Service\InventoryService;
use App\Tests\Integration\MysqlConcurrencyIntegrationTest;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:audit:integration',
    description: 'Exécute la suite de tests d\'intégration MySQL pour les verrous InnoDB réels, idempotence atomique, fencing et transitions sanitaires'
)]
class AuditIntegrationCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly IdempotencyService $idempotencyService,
        private readonly HealthService $healthService,
        private readonly InventoryService $inventoryService,
        private readonly FlockService $flockService,
        private readonly CommercialPlanService $commercialPlanService,
        private readonly IdempotencyRecordRepository $recordRepository,
        private readonly ManagerRegistry $managerRegistry,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Exécution de la suite de tests d\'intégration MySQL Poulvia (InnoDB / Verrous réels / Fencing)');

        // Callback de réouverture de l'EntityManager si Doctrine l'a fermé suite à un rollback interne
        $resetEmIfClosed = function (): EntityManagerInterface {
            $this->managerRegistry->resetManager();
            /** @var EntityManagerInterface $em */
            $em = $this->managerRegistry->getManager();

            return $em;
        };

        try {
            MysqlConcurrencyIntegrationTest::runAll(
                $this->entityManager,
                $this->idempotencyService,
                $this->healthService,
                $this->inventoryService,
                $this->flockService,
                $this->commercialPlanService,
                $this->recordRepository,
                $resetEmIfClosed
            );

            $io->success('Tous les tests d\'intégration MySQL ont été validés avec succès.');

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $io->error(sprintf("Échec d'un test d'intégration MySQL : %s\n%s", $e->getMessage(), $e->getTraceAsString()));

            return Command::FAILURE;
        }
    }
}
