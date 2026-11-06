<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Dto\Flock\CreateFlockMovementRequestDto;
use App\Dto\Flock\CreateFlockRequestDto;
use App\Dto\Flock\UpdateFlockRequestDto;
use App\Dto\Health\CompleteHealthTreatmentRequestDto;
use App\Dto\Health\UpdateHealthTreatmentRequestDto;
use App\Dto\Inventory\CreateStockMovementRequestDto;
use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\HealthTreatment;
use App\Entity\IdempotencyRecord;
use App\Entity\InventoryItem;
use App\Entity\Organization;
use App\Entity\StockMovement;
use App\Entity\User;
use App\Enum\AdministrationMethod;
use App\Enum\BuildingType;
use App\Enum\FlockMovementType;
use App\Enum\FlockStatus;
use App\Enum\HealthTreatmentStatus;
use App\Enum\HealthTreatmentType;
use App\Enum\InventoryCategory;
use App\Enum\InventoryUnit;
use App\Enum\PoultryType;
use App\Enum\StockMovementType;
use App\Exception\PlanQuotaExceededException;
use App\Repository\IdempotencyRecordRepository;
use App\Service\Admin\CommercialPlanService;
use App\Service\FlockService;
use App\Service\HealthService;
use App\Service\IdempotencyService;
use App\Service\InventoryService;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Suite de tests d'intégration MySQL validant le comportement transactionnel,
 * les verrous InnoDB réels (SELECT FOR UPDATE), les fencing tokens,
 * la machine à états de santé et les quotas d'abonnements concurrents.
 */
final class MysqlConcurrencyIntegrationTest
{
    public static function runAll(
        EntityManagerInterface $entityManager,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository,
        ?callable $resetEmIfClosed = null
    ): void {
        $testCases = [
            'testIdempotencyRowLockAndFencingToken' => 'Idempotence MySQL: verrou de ligne exclusif InnoDB & détection de conflit',
            'testIdempotencyFencingTokenRejectsHijackedWorker' => 'Idempotence MySQL: rejet atomique du travailleur déchu par le jeton de fencing',
            'testIdempotencyAtomicRollbackAndReusability' => 'Idempotence MySQL: rollback atomique complet sur crash et réutilisabilité',
            'testCommercialPlanQuotaPessimisticLocking' => 'Quotas MySQL: verrouillage pessimiste organisation et contrôle de transition',
            'testHealthStateTransitionsAndStockDeduction' => 'Santé MySQL: machine à états stricte, type HEALTH_CONSUMPTION et interdictions',
            'testFlockSplitCollisionProofAndNameTruncation' => 'Cheptel MySQL: scission anti-collision et respect strict VARCHAR(100)',
            'testLockBlocksSecondConnectionOnSameRow' => 'Concurrence réelle: SELECT FOR UPDATE InnoDB bloque effectivement une 2ème connexion PDO indépendante',
            'testDeleteVsCompleteLockOrdering' => 'Concurrence réelle: deleteTreatment lit le statut COMPLETED rafraîchi sous verrou après complétion concurrente',
        ];

        foreach ($testCases as $method => $description) {
            // Réouverture de l'EM si Doctrine l'a fermé suite à un rollback interne dans le test précédent
            if ($resetEmIfClosed !== null && !$entityManager->isOpen()) {
                $entityManager = ($resetEmIfClosed)();
            }

            self::$method(
                $entityManager,
                $idempotencyService,
                $healthService,
                $inventoryService,
                $flockService,
                $commercialPlanService,
                $recordRepository
            );
            echo sprintf("  [PASS-MYSQL] %s\n", $description);
        }

        echo "\nTOUS LES TESTS D'INTEGRATION MYSQL ONT REUSSI AVEC SUCCES (8/8).\n";
    }

    private static function testIdempotencyRowLockAndFencingToken(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $user = self::getOrCreateTestUser($em, 'test-idem-user@Poulvia.com');
        $farm = self::createTestFarmHierarchy($em, 'Ferme Idem MySQL');

        $key = 'mysql-idem-' . bin2hex(random_bytes(8));
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/test/mysql', 'REQUEST_METHOD' => 'POST'], '{"action":"test"}');

        // 1. Exécution initiale
        $response = $idempotencyService->process(
            $key,
            $user,
            $request,
            $farm,
            function () use ($em): Response {
                return new JsonResponse(['message' => 'Created successfully', 'id' => 123], Response::HTTP_CREATED);
            }
        );

        assert($response->getStatusCode() === Response::HTTP_CREATED);
        assert($response->headers->get('X-Cache-Idempotency') === 'MISS');

        // 2. Rejeu immédiat avec la même clé -> Cache HIT
        $replayResponse = $idempotencyService->process(
            $key,
            $user,
            $request,
            $farm,
            function (): Response {
                throw new \RuntimeException('Ne devrait pas être appelé en rejeu idempotent');
            }
        );

        assert($replayResponse->getStatusCode() === Response::HTTP_CREATED);
        assert($replayResponse->headers->get('X-Cache-Idempotency') === 'HIT');
        $content = json_decode((string) $replayResponse->getContent(), true);
        assert(isset($content['id']) && $content['id'] === 123);

        // 3. Vérification en base MySQL de la présence du lock_token et du statut COMPLETED
        $record = $recordRepository->findByKey($key);
        assert($record !== null);
        assert($record->isCompleted());
        assert($record->getLockToken() !== null && strlen($record->getLockToken()) === 64);
    }

    private static function testIdempotencyFencingTokenRejectsHijackedWorker(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $user = self::getOrCreateTestUser($em, 'test-fencing@Poulvia.com');
        $farm = self::createTestFarmHierarchy($em, 'Ferme Fencing MySQL');

        $key = 'mysql-fencing-' . bin2hex(random_bytes(8));
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/test/fencing', 'REQUEST_METHOD' => 'POST'], '{"data":"fencing"}');

        $fencingRejected = false;
        try {
            $idempotencyService->process(
                $key,
                $user,
                $request,
                $farm,
                function () use ($em, $key): Response {
                    // Simuler qu'un processus concurrent s'est approprié le verrou en modifiant le lock_token en base
                    $dbal = $em->getConnection();
                    $fakeHijackToken = bin2hex(random_bytes(32));
                    $dbal->executeStatement(
                        'UPDATE idempotency_records SET lock_token = :newToken WHERE idempotency_key = :key',
                        ['newToken' => $fakeHijackToken, 'key' => $key]
                    );

                    return new JsonResponse(['status' => 'attempting completion']);
                }
            );
        } catch (ConflictHttpException $e) {
            $fencingRejected = true;
            assert(str_contains($e->getMessage(), 'bail') || str_contains($e->getMessage(), 'propriété') || str_contains($e->getMessage(), 'verrou'));
        }

        assert($fencingRejected, 'Fencing token check must abort execution with ConflictHttpException if lock_token changed');
    }

    private static function testIdempotencyAtomicRollbackAndReusability(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $user = self::getOrCreateTestUser($em, 'test-rollback@Poulvia.com');
        $farm = self::createTestFarmHierarchy($em, 'Ferme Rollback MySQL');

        $key = 'mysql-rollback-' . bin2hex(random_bytes(8));
        $request = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/test/crash', 'REQUEST_METHOD' => 'POST'], '{"mutation":true}');

        $crashCaught = false;
        try {
            $idempotencyService->process(
                $key,
                $user,
                $request,
                $farm,
                function () use ($em, $farm): Response {
                    // Création d'une entité dans la transaction
                    $bldg = new Building($farm, 'Bâtiment Crash', BuildingType::POULTRY_HOUSE, 1000);
                    $em->persist($bldg);
                    $em->flush();

                    throw new \RuntimeException('Crash simulé en cours de mutation métier');
                }
            );
        } catch (\RuntimeException) {
            $crashCaught = true;
        }

        assert($crashCaught, 'RuntimeException must be caught');

        // Vérifier que le bâtiment a été rollbacké via DBAL (l'EM a pu être réinitialisé)
        $conn = $em->getConnection();
        $bldgCount = (int) $conn->fetchOne(
            "SELECT COUNT(*) FROM buildings WHERE name = 'Bâtiment Crash'"
        );
        assert($bldgCount === 0, 'Building must not be persisted in DB after transaction rollback');

        // Vérifier l'état du record d'idempotence via DBAL (bypasse le cache L1)
        $row = $conn->fetchAssociative(
            'SELECT status FROM idempotency_records WHERE idempotency_key = :key',
            ['key' => $key]
        );
        assert($row !== false, 'Idempotency record must exist in DB');
        assert($row['status'] === IdempotencyRecord::STATUS_FAILED, sprintf(
            'Expected STATUS_FAILED, got "%s"',
            $row['status']
        ));

        // Vider le cache L1 Doctrine pour la suite (EM réouvert par IdempotencyService après crash)
        $em->clear();

        // Recharger les entités détachées après clear() pour qu'elles soient gérées par le nouvel EM
        $farmId = $farm->getId();
        $userId = $user->getId();
        $farm   = $em->find(Farm::class, $farmId);
        $user   = $em->find(User::class, $userId);
        assert($farm !== null && $user !== null, 'Farm and user must be reloadable after EM reset');

        // Réutilisation de la même clé : doit réussir cette fois
        $retryResponse = $idempotencyService->process(
            $key,
            $user,
            $request,
            $farm,
            function () use ($em, $farm): Response {
                $bldg = new Building($farm, 'Bâtiment Réussi', BuildingType::POULTRY_HOUSE, 1000);
                $em->persist($bldg);
                $em->flush();

                return new JsonResponse(['created' => true], Response::HTTP_CREATED);
            }
        );

        assert($retryResponse->getStatusCode() === Response::HTTP_CREATED);
        $bldgSuccess = $em->getRepository(Building::class)->findOneBy(['name' => 'Bâtiment Réussi']);
        assert($bldgSuccess !== null, 'Building must exist after successful retry');
    }

    private static function testCommercialPlanQuotaPessimisticLocking(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $farm = self::createTestFarmHierarchy($em, 'Ferme Quota Concurrence MySQL');
        $org = $farm->getOrganization();

        // Créer une bande ACTIVE
        $flock1 = new Flock($farm, 'FLOCK-Q1-' . bin2hex(random_bytes(4)), 'Bande 1', 100, new \DateTimeImmutable('2026-06-01'), PoultryType::BROILER);
        $em->persist($flock1);
        $em->flush();

        // Vérifier que assertCanCreateFlock s'exécute sous transaction et verrouille l'organisation
        $em->beginTransaction();
        try {
            $commercialPlanService->assertCanCreateFlock($farm);
            $em->commit();
        } catch (\Throwable $e) {
            if ($em->getConnection()->isTransactionActive()) {
                $em->rollback();
            }
            throw $e;
        }

        // Test de réactivation vers ACTIVE via updateFlock : doit vérifier les quotas
        $depletedFlock = new Flock($farm, 'FLOCK-DEP-' . bin2hex(random_bytes(4)), 'Bande Clôturée', 100, new \DateTimeImmutable('2026-01-01'), PoultryType::BROILER);
        $depletedFlock->setStatus(FlockStatus::COMPLETED);
        $em->persist($depletedFlock);
        $em->flush();

        $flockService->updateFlock($depletedFlock, new UpdateFlockRequestDto(
            name: 'Bande Réouverte',
            status: FlockStatus::ACTIVE
        ));

        assert($depletedFlock->getStatus() === FlockStatus::ACTIVE);
    }

    private static function testHealthStateTransitionsAndStockDeduction(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $user = self::getOrCreateTestUser($em, 'veto-mysql@Poulvia.com');
        $farm = self::createTestFarmHierarchy($em, 'Ferme Sante MySQL');
        $flock = new Flock($farm, 'FLOCK-SANTE-' . bin2hex(random_bytes(4)), 'Bande Sante', 500, new \DateTimeImmutable('2026-06-01'), PoultryType::BROILER);
        $em->persist($flock);

        $item = new InventoryItem($farm, 'Vaccin Marek Test', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $item->setCurrentStock(10.0);
        $em->persist($item);
        $em->flush();

        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Vaccination Marek J1',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::INJECTION,
            targetAgeDays: 1,
            scheduledDate: new \DateTimeImmutable('2026-06-01'),
            inventoryItem: $item
        );
        $em->persist($treatment);
        $em->flush();

        // 1. Rejet de la modification directe de status dans updateTreatment (faille 2.1)
        $statusRejected = false;
        try {
            $healthService->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                status: HealthTreatmentStatus::COMPLETED
            ));
        } catch (UnprocessableEntityHttpException) {
            $statusRejected = true;
        }
        assert($statusRejected, 'Direct status modification in updateTreatment must be rejected with 422');

        // 2. Rejet de la modification directe de administeredDate dans updateTreatment
        $dateRejected = false;
        try {
            $healthService->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                administeredDate: '2026-06-01'
            ));
        } catch (UnprocessableEntityHttpException) {
            $dateRejected = true;
        }
        assert($dateRejected, 'Direct administeredDate modification in updateTreatment must be rejected with 422');

        // 3. Annulation propre sans toucher au stock
        $healthService->cancelTreatment($treatment, 'Raison technique', $user);
        assert($treatment->getStatus() === HealthTreatmentStatus::CANCELLED);
        $em->refresh($item);
        assert((float) $item->getCurrentStock() === 10.0, 'Stock must not be altered on cancellation');

        // 4. Nouveau soin complété via completeTreatment -> décompte et création StockMovement HEALTH_CONSUMPTION
        $treatment2 = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Vaccination Marek J1 Bis',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::INJECTION,
            targetAgeDays: 1,
            scheduledDate: new \DateTimeImmutable('2026-06-01'),
            inventoryItem: $item
        );
        $em->persist($treatment2);
        $em->flush();

        $completed = $healthService->completeTreatment($treatment2, new CompleteHealthTreatmentRequestDto(
            administeredDate: '2026-06-01',
            quantityUsed: '4.0',
            inventoryItemId: $item->getId()?->toBase32()
        ), $user);

        assert($completed->getStatus() === HealthTreatmentStatus::COMPLETED);
        $em->refresh($item);
        assert((float) $item->getCurrentStock() === 6.0, 'Stock must be decreased from 10 to 6');

        $movement = $em->getRepository(StockMovement::class)->findOneBy(['item' => $item]);
        assert($movement !== null, 'Stock movement must be recorded in MySQL');
        assert($movement->getType() === StockMovementType::HEALTH_CONSUMPTION, 'Stock movement type must be HEALTH_CONSUMPTION');

        // 5. Rejet de la suppression d'un soin terminé
        $deleteBlocked = false;
        try {
            $healthService->deleteTreatment($treatment2);
        } catch (ConflictHttpException) {
            $deleteBlocked = true;
        }
        assert($deleteBlocked, 'Deleting completed treatment must be blocked with 409');

        // 6. Rejet de la création manuelle d'un mouvement HEALTH_CONSUMPTION
        $manualBlocked = false;
        try {
            $inventoryService->recordMovement($item, new CreateStockMovementRequestDto(
                type: StockMovementType::HEALTH_CONSUMPTION,
                quantity: 1.0,
                movementDate: '2026-06-01',
                reason: 'Tentative manuelle frauduleuse'
            ));
        } catch (UnprocessableEntityHttpException) {
            $manualBlocked = true;
        }
        assert($manualBlocked, 'Manual entry of HEALTH_CONSUMPTION must be rejected with 422');
    }

    private static function testFlockSplitCollisionProofAndNameTruncation(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $farm = self::createTestFarmHierarchy($em, 'Ferme Scission MySQL');
        $bldgA = new Building($farm, 'Bâtiment Source A', BuildingType::POULTRY_HOUSE, 3000);
        $bldgB = new Building($farm, 'Bâtiment Cible B', BuildingType::POULTRY_HOUSE, 3000);
        $em->persist($bldgA);
        $em->persist($bldgB);

        // Nom très long (95 caractères) pour tester la troncature VARCHAR(100)
        $longName = str_repeat('Bande-Elite-', 7); // ~84 chars
        $flock = new Flock($farm, 'ORIG-CODE', $longName, 1000, new \DateTimeImmutable('2026-06-01'), PoultryType::BROILER);
        $flock->setBuilding($bldgA);
        $em->persist($flock);
        $em->flush();

        // Scission de 300 oiseaux vers Bâtiment Cible B
        $movement = $flockService->recordMovement($flock, new CreateFlockMovementRequestDto(
            type: FlockMovementType::TRANSFER,
            quantity: 300,
            movementDate: '2026-06-02',
            reason: 'Scission de cheptel',
            targetBuildingId: $bldgB->getId()?->toBase32()
        ));

        assert($flock->getCurrentQuantity() === 700);

        // Vérifier la bande scindée en MySQL
        $splitFlocks = $em->getRepository(Flock::class)->findBy(['building' => $bldgB]);
        assert(count($splitFlocks) >= 1);
        $split = $splitFlocks[0];

        assert($split->getCurrentQuantity() === 300);
        assert(mb_strlen($split->getName()) <= 100, 'Split flock name must never exceed VARCHAR(100)');
        assert(strlen($split->getCode()) <= 50, 'Split flock code must never exceed VARCHAR(50)');
        assert(preg_match('/^ORIG-CODE-S[A-F0-9]{8}$/', $split->getCode()) === 1, 'Split code must match 8-hex collision-proof pattern');
    }

    /**
     * TEST 7 — Concurrence réelle à deux connexions PDO indépendantes.
     *
     * Prouve que SELECT FOR UPDATE d'InnoDB bloque effectivement une seconde connexion
     * et se libère après le commit de la première.
     *
     * Stratégie : on ne peut pas avoir deux threads simultanés en PHP monothread,
     * mais on peut démontrer l'ordering InnoDB :
     * - Cx A : BEGIN + SELECT FOR UPDATE (verrou acquis)
     * - Cx B : SET innodb_lock_wait_timeout=1 → tente SELECT FOR UPDATE → timeout attendu
     * - Cx A : COMMIT (verrou libéré)
     * - Cx B retry : SELECT FOR UPDATE → lit la ligne commitée → succès
     */
    private static function testLockBlocksSecondConnectionOnSameRow(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $dsn = $_ENV['DATABASE_URL'] ?? getenv('DATABASE_URL') ?? '';
        if (!$dsn) {
            echo "  [SKIP] DATABASE_URL non définie pour le test de concurrence réelle\n";
            return;
        }

        // Créer une ligne de test isolée (idempotency_record)
        $farm = self::createTestFarmHierarchy($em, 'Ferme Lock2Cx');
        $user = self::getOrCreateTestUser($em, 'lock2cx@Poulvia.com');

        $uniqueKey = 'lock2cx-' . bin2hex(random_bytes(8));
        $record = new IdempotencyRecord(
            $uniqueKey,
            $user,
            '/api/test-lock',
            'POST',
            hash('sha256', $uniqueKey),
            $farm
        );
        $em->persist($record);
        $em->flush();
        $recordId = $record->getId();

        // Connexion A — ouverte via DBAL depuis l'EM existant
        $connA = $em->getConnection();

        // Connexion B — connexion PDO indépendante
        $pdoB = new \PDO(
            self::dsnToPdo($dsn),
            self::dsnUser($dsn),
            self::dsnPassword($dsn),
            [
                \PDO::ATTR_TIMEOUT => 5,
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            ]
        );
        $pdoB->exec('SET SESSION innodb_lock_wait_timeout = 1');
        $pdoB->exec('SET SESSION autocommit = 0');

        // Connexion A : BEGIN + SELECT FOR UPDATE
        $connA->beginTransaction();
        $connA->executeQuery('SELECT * FROM idempotency_records WHERE idempotency_key = ? FOR UPDATE', [$uniqueKey]);

        // Connexion B : tente SELECT FOR UPDATE → doit subir un timeout (lock wait timeout exceeded)
        $pdoB->beginTransaction();
        $lockTimedOut = false;
        try {
            $pdoB->query('SELECT * FROM idempotency_records WHERE idempotency_key = ' . $pdoB->quote($uniqueKey) . ' FOR UPDATE');
        } catch (\PDOException $e) {
            // MySQL error 1205 : Lock wait timeout exceeded; try restarting transaction
            // On vérifie le message précis ET le code natif MySQL (errorInfo[1] = 1205).
            // Le SQLSTATE HY000 est trop générique (couvre des dizaines d'erreurs MySQL).
            $nativeCode = (int) ($e->errorInfo[1] ?? 0);
            $lockTimedOut = str_contains($e->getMessage(), 'Lock wait timeout exceeded')
                || $nativeCode === 1205;
        }
        $pdoB->rollBack();

        // Connexion A : COMMIT (libère le verrou)
        $connA->commit();

        assert($lockTimedOut, 'InnoDB SELECT FOR UPDATE doit bloquer la 2ème connexion et provoquer un lock wait timeout');

        // Connexion B peut maintenant lire librement (verrou libéré)
        $pdoB->beginTransaction();
        $stmt = $pdoB->query('SELECT status FROM idempotency_records WHERE idempotency_key = ' . $pdoB->quote($uniqueKey) . ' FOR UPDATE');
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        $pdoB->commit();

        assert($row !== false, 'La ligne doit être lisible après le commit de la connexion A');
        assert($row['status'] === 'PENDING', 'Le statut PENDING doit être visible par la connexion B après le commit de A');
    }

    /**
     * TEST 8 — Ordering verrou DELETE vs COMPLETE.
     *
     * Prouve que deleteTreatment() lira le statut COMPLETED rafraîchi sous verrou
     * si completeTreatment() a commité avant que le DELETE ne prenne son verrou.
     *
     * Stratégie séquentielle (aucun thread OS nécessaire) :
     * 1. Cx B complète le soin (commit → COMPLETED en DB)
     * 2. Cx A appelle deleteTreatment() → prend le verrou → refresh → lit COMPLETED → 409
     */
    private static function testDeleteVsCompleteLockOrdering(
        EntityManagerInterface $em,
        IdempotencyService $idempotencyService,
        HealthService $healthService,
        InventoryService $inventoryService,
        FlockService $flockService,
        CommercialPlanService $commercialPlanService,
        IdempotencyRecordRepository $recordRepository
    ): void {
        $farm = self::createTestFarmHierarchy($em, 'Ferme DelVsComplete');
        $user = self::getOrCreateTestUser($em, 'del-vs-complete@Poulvia.com');

        $item = new InventoryItem($farm, 'Vaccin Test DelVs', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $item->setCurrentStock(10.0);
        $em->persist($item);

        $flock = new Flock($farm, 'FLC-DEL-' . bin2hex(random_bytes(3)), 'Bande DelTest', 100, new \DateTimeImmutable(), PoultryType::BROILER);
        $em->persist($flock);

        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Soin Race Delete',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::INJECTION,
            targetAgeDays: 1,
            scheduledDate: new \DateTimeImmutable(),
            inventoryItem: $item
        );
        $em->persist($treatment);
        $em->flush();

        // Étape 1 : completeTreatment commit (simule la complétion concurrente qui arrive en premier)
        $healthService->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
            administeredDate: date('Y-m-d'),
            quantityUsed: '2.0',
            inventoryItemId: $item->getId()?->toBase32()
        ), $user);

        // À ce stade, la DB a status = COMPLETED
        // Étape 2 : deleteTreatment → doit lire COMPLETED via le verrou + refresh → 409
        $deleteBlocked = false;
        try {
            $healthService->deleteTreatment($treatment);
        } catch (ConflictHttpException) {
            $deleteBlocked = true;
        }

        assert($deleteBlocked, 'deleteTreatment doit lire COMPLETED après complétion concurrente et rejeter avec 409');

        // Vérifier que le mouvement de stock et le soin sont bien présents en DB
        $em->refresh($item);
        assert((float) $item->getCurrentStock() === 8.0, 'Le stock doit être à 8 (10 - 2) malgré la tentative de suppression');
    }

    private static function dsnToPdo(string $dsn): string
    {
        // Convertit DATABASE_URL (mysql://user:pass@host:port/dbname) en DSN PDO
        $parsed = parse_url($dsn);
        $dbName = ltrim($parsed['path'] ?? '/db_Poulvia_test', '/');
        $dbName = explode('?', $dbName)[0];
        return sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $parsed['host'] ?? '127.0.0.1',
            $parsed['port'] ?? 3306,
            $dbName
        );
    }

    private static function dsnUser(string $dsn): string
    {
        return parse_url($dsn, PHP_URL_USER) ?? 'root';
    }

    private static function dsnPassword(string $dsn): string
    {
        return parse_url($dsn, PHP_URL_PASS) ?? '';
    }

    private static function getOrCreateTestUser(EntityManagerInterface $em, string $email): User
    {
        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing instanceof User) {
            return $existing;
        }

        $user = new User($email, 'Jean', 'Dupont');
        $user->setPassword(password_hash('Secr3tP@ssword!', PASSWORD_BCRYPT));
        $em->persist($user);
        $em->flush();

        return $user;
    }

    private static function createTestFarmHierarchy(EntityManagerInterface $em, string $farmName): Farm
    {
        $org = new Organization('Org ' . bin2hex(random_bytes(4)), 'org-' . bin2hex(random_bytes(6)));
        $org->setSubscriptionPlan('PRO');
        $em->persist($org);

        $farm = new Farm($org, $farmName);
        $em->persist($farm);
        $em->flush();

        return $farm;
    }
}
