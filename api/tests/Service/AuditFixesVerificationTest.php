<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Dto\Flock\CreateFlockMovementRequestDto;
use App\Dto\Inventory\CreateStockMovementRequestDto;
use App\Dto\Inventory\UpdateInventoryItemRequestDto;
use App\Dto\Transaction\UpdateTransactionRequestDto;
use App\Dto\Flock\UpdateFlockRequestDto;
use App\Dto\Health\CompleteHealthTreatmentRequestDto;
use App\Entity\ApiKey;
use App\Entity\Building;
use App\Entity\DeviceRefreshToken;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\HealthTreatment;
use App\Entity\IdempotencyRecord;
use App\Entity\InventoryItem;
use App\Entity\Organization;
use App\Entity\Transaction;
use App\Entity\User;
use App\Enum\AdministrationMethod;
use App\Enum\BuildingType;
use App\Enum\FlockMovementType;
use App\Enum\FlockStatus;
use App\Enum\HealthTreatmentStatus;
use App\Enum\HealthTreatmentType;
use App\Enum\InventoryCategory;
use App\Enum\InventoryUnit;
use App\Enum\PaymentMethod;
use App\Enum\PaymentStatus;
use App\Enum\PoultryType;
use App\Enum\StockMovementType;
use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use App\Exception\IncompatibleUnitException;
use App\Exception\InsufficientFlockQuantityException;
use App\Exception\InsufficientStockException;
use App\Repository\BuildingRepository;
use App\Repository\ContactRepository;
use App\Repository\DeviceRefreshTokenRepository;
use App\Repository\EggProductionRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\FlockMovementRepository;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\StockMovementRepository;
use App\Repository\TransactionRepository;
use App\Security\ApiKeySecurityChecker;
use App\Security\Permission;
use App\Service\Admin\CommercialPlanService;
use App\Service\DashboardService;
use App\Service\DeviceAuthService;
use App\Service\FlockService;
use App\Service\HealthService;
use App\Service\InventoryService;
use App\Service\TransactionService;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

/**
 * Suite de vérification complète couvrant les anomalies de l'audit backend :
 * - Transactions et verrous pessimistes (stock, bandes, soins sanitaires)
 * - Scission de bandes et transferts de cheptel avec traçabilité
 * - Révocation atomique des familles de refresh tokens
 * - Filtrage des données dashboard et isolation sanitaire par bâtiment
 * - Dédoublonnage et idempotence des opérations critiques
 */
final class AuditFixesVerificationTest
{
    public static function runAll(): void
    {
        $tests = [
            'testInventoryConcurrencyLocking' => 'Verrouillage pessimiste inventaire (SELECT FOR UPDATE)',
            'testFlockConcurrencyLocking' => 'Verrouillage pessimiste cheptel (SELECT FOR UPDATE)',
            'testInventoryUnitConversionAndProtection' => 'Conversion automatique d\'unités & protection du stock',
            'testFlockTransferWithHistoryAndValidation' => 'Transferts de bandes & traçabilité source/cible',
            'testFlockMortalityVsSalesAndCullingRates' => 'Séparation stricte mortalités, ventes et réformes',
            'testTransactionUpdateAndPaymentReconciliation' => 'Réconciliation automatique des paiements et soldes',
            'testApiKeyScopeEnforcement' => 'Isolation des exploitations & scopes des clés API',
            'testIdempotencyLockRenewal' => 'Renouvellement atomique et libération des verrous d\'idempotence',
            'testGranularPermissionsMatrix' => 'Matrice granulaire des permissions et actions',
            'testTreatmentCompletionDeductsStockAtomicallyAndRejectsInsufficient' => 'Soins: décompte atomique du stock, rejet insuffisant & dédoublonnage',
            'testStandardProgramGenerationIdempotency' => 'Prophylaxie: idempotence de la génération de calendrier',
            'testFlockPartialTransferSplitsFlockAccurately' => 'Cheptel: scission exacte d\'une bande lors d\'un transfert partiel',
            'testFlockUpdatePreservesBuildingAndStatusWhenOmitted' => 'Cheptel: préservation statut/bâtiment et rejet bâtiment inactif',
            'testRefreshTokenFamilyRevocationCommittedOnReuse' => 'Sécurité JWT: commit immédiat de révocation de famille sur réutilisation',
            'testDashboardApiKeyScopesAndSanitaryBuildingIsolation' => 'Dashboard: filtrage strict clés API et isolation sanitaire des bâtiments',
            'testInventoryPrecisionValidationAndRounding' => 'Inventaire: arrondi à 2 décimales et contrôle de précision',
        ];

        foreach ($tests as $method => $description) {
            self::$method();
            echo sprintf("  [PASS] %s\n", $description);
        }

        echo "\nALL AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY (16/16).\n";
    }

    private static function createTestFarm(string $name = 'Ferme Test'): Farm
    {
        $org = new Organization('Org Test', 'org-test-' . uniqid());
        return new Farm($org, $name);
    }

    private static function createMockEntityManager(
        array &$lockedEntities,
        ?array &$persistedEntities = null,
        ?callable $onCommit = null
    ): EntityManagerInterface {
        return new class($lockedEntities, $persistedEntities, $onCommit) implements EntityManagerInterface {
            /** @var array<int, array{entity: object, lockMode: mixed}> */
            private array $locks;
            private ?array $persisted;
            private mixed $onCommit;

            public function __construct(array &$lockedEntities, ?array &$persistedEntities = null, ?callable $onCommit = null)
            {
                $this->locks = &$lockedEntities;
                $this->persisted = &$persistedEntities;
                $this->onCommit = $onCommit;
            }

            public function wrapInTransaction(callable $func): mixed
            {
                return $func($this);
            }

            public function lock(object $entity, LockMode|int $lockMode, \DateTimeInterface|int|null $lockVersion = null): void
            {
                $this->locks[] = ['entity' => $entity, 'lockMode' => $lockMode];
            }

            public function refresh(object $object, LockMode|int|null $lockMode = LockMode::NONE): void
            {
            }

            public function contains(object $object): bool
            {
                return true;
            }

            public function persist(object $object): void
            {
                if ($this->persisted !== null) {
                    $this->persisted[] = $object;
                }
            }

            public function remove(object $object): void
            {
            }

            public function flush(): void
            {
            }

            public function clear(): void
            {
            }

            public function detach(object $object): void
            {
            }

            public function initializeObject(object $obj): void
            {
            }

            public function isUninitializedObject(mixed $value): bool
            {
                return false;
            }

            public function getRepository(string $className): \Doctrine\ORM\EntityRepository
            {
                throw new \BadMethodCallException();
            }

            public function getCache(): ?\Doctrine\ORM\Cache
            {
                return null;
            }

            public function getConnection(): \Doctrine\DBAL\Connection
            {
                return (new \ReflectionClass(\Doctrine\DBAL\Connection::class))->newInstanceWithoutConstructor();
            }

            public function getMetadataFactory(): \Doctrine\ORM\Mapping\ClassMetadataFactory
            {
                throw new \BadMethodCallException();
            }

            public function getExpressionBuilder(): \Doctrine\ORM\Query\Expr
            {
                throw new \BadMethodCallException();
            }

            public function beginTransaction(): void
            {
            }

            public function commit(): void
            {
                if ($this->onCommit !== null) {
                    ($this->onCommit)();
                }
            }

            public function rollback(): void
            {
            }

            public function createQuery(string $dql = ''): \Doctrine\ORM\Query
            {
                throw new \BadMethodCallException();
            }

            public function createNativeQuery(string $sql, \Doctrine\ORM\Query\ResultSetMapping $rsm): \Doctrine\ORM\NativeQuery
            {
                throw new \BadMethodCallException();
            }

            public function createQueryBuilder(): \Doctrine\ORM\QueryBuilder
            {
                throw new \BadMethodCallException();
            }

            public function find(string $className, mixed $id, LockMode|int|null $lockMode = LockMode::NONE, ?int $lockVersion = null): ?object
            {
                return null;
            }

            public function getReference(string $entityName, mixed $id): ?object
            {
                return null;
            }

            public function close(): void
            {
            }

            public function getEventManager(): \Doctrine\Common\EventManagerInterface
            {
                throw new \BadMethodCallException();
            }

            public function getConfiguration(): \Doctrine\ORM\Configuration
            {
                throw new \BadMethodCallException();
            }

            public function isOpen(): bool
            {
                return true;
            }

            public function getUnitOfWork(): \Doctrine\ORM\UnitOfWork
            {
                throw new \BadMethodCallException();
            }

            public function newHydrator(string|int $hydrationMode): \Doctrine\ORM\Internal\Hydration\AbstractHydrator
            {
                throw new \BadMethodCallException();
            }

            public function getProxyFactory(): \Doctrine\ORM\Proxy\ProxyFactory
            {
                throw new \BadMethodCallException();
            }

            public function getFilters(): \Doctrine\ORM\Query\FilterCollection
            {
                throw new \BadMethodCallException();
            }

            public function isFiltersStateClean(): bool
            {
                return true;
            }

            public function hasFilters(): bool
            {
                return false;
            }

            public function getClassMetadata(string $className): \Doctrine\ORM\Mapping\ClassMetadata
            {
                throw new \BadMethodCallException();
            }
        };
    }

    private static function testInventoryConcurrencyLocking(): void
    {
        $farm = self::createTestFarm();
        $item = new InventoryItem($farm, 'Aliment Ponte', InventoryCategory::FEED, InventoryUnit::BAG_50KG);
        $item->setCurrentStock(10.0);

        $locks = [];
        $em = self::createMockEntityManager($locks);

        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();
        $movRepo = new class extends StockMovementRepository {
            public function __construct()
            {
            }

            public function count(array $criteria = []): int
            {
                return 1;
            }
        };
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new InventoryService($itemRepo, $movRepo, $flockRepo, $em);

        $dto = new CreateStockMovementRequestDto(
            type: StockMovementType::FEEDING,
            quantity: 6.0,
            movementDate: '2026-11-05',
            unit: InventoryUnit::BAG_50KG,
        );

        $service->recordMovement($item, $dto);

        assert(count($locks) === 1, 'Expected PESSIMISTIC_WRITE lock on InventoryItem during movement');
        assert($locks[0]['entity'] === $item);
        assert($locks[0]['lockMode'] === LockMode::PESSIMISTIC_WRITE);
        assert(abs($item->getCurrentStock() - 4.0) < 0.001);

        // Un second mouvement de 6 sacs doit échouer avec InsufficientStockException
        $insufficientThrown = false;
        try {
            $service->recordMovement($item, $dto);
        } catch (InsufficientStockException) {
            $insufficientThrown = true;
        }
        assert($insufficientThrown, 'Expected InsufficientStockException on second distribution');
    }

    private static function testFlockConcurrencyLocking(): void
    {
        $farm = self::createTestFarm();
        $flock = new Flock($farm, 'LOT-01', 'Bande Chair 1', 100, new \DateTimeImmutable('2026-10-01'), PoultryType::BROILER);

        $locks = [];
        $em = self::createMockEntityManager($locks);

        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $bldgRepo = (new \ReflectionClass(BuildingRepository::class))->newInstanceWithoutConstructor();
        $planService = (new \ReflectionClass(CommercialPlanService::class))->newInstanceWithoutConstructor();

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        $dto = new CreateFlockMovementRequestDto(
            type: FlockMovementType::SALE,
            quantity: 60,
            movementDate: '2026-11-05',
            reason: 'Vente lot 1',
        );

        $service->recordMovement($flock, $dto);

        assert(count($locks) === 1, 'Expected PESSIMISTIC_WRITE lock on Flock during movement');
        assert($locks[0]['entity'] === $flock);
        assert($locks[0]['lockMode'] === LockMode::PESSIMISTIC_WRITE);
        assert($flock->getCurrentQuantity() === 40);

        $insufficientThrown = false;
        try {
            $service->recordMovement($flock, $dto);
        } catch (InsufficientFlockQuantityException) {
            $insufficientThrown = true;
        }
        assert($insufficientThrown, 'Expected InsufficientFlockQuantityException on second concurrent sale');
    }

    private static function testInventoryUnitConversionAndProtection(): void
    {
        $farm = self::createTestFarm();
        // Exemple exact de l'audit : 20 sacs de 50 kg (1 000 kg), seuil = 2 sacs (100 kg), prix = 15 000 FCFA/sac (300 FCFA/kg)
        $item = new InventoryItem($farm, 'Maïs Concassé', InventoryCategory::FEED, InventoryUnit::BAG_50KG);
        $item->setCurrentStock(20.0);
        $item->setAlertThreshold(2.0);
        $item->setUnitPrice(15000);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();
        $movRepo = new class extends StockMovementRepository {
            public function __construct()
            {
            }

            public function count(array $criteria = []): int
            {
                return 1;
            }
        };
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new InventoryService($itemRepo, $movRepo, $flockRepo, $em);

        // Changement vers KG : doit convertir 20 sacs -> 1000 kg, seuil 2 -> 100 kg, prix 15000 -> 300 FCFA/kg
        $updateDto = new UpdateInventoryItemRequestDto(
            name: 'Maïs Concassé',
            category: InventoryCategory::FEED,
            unit: InventoryUnit::KG,
            alertThreshold: 2.0,
            unitPrice: 15000,
        );

        $service->updateItem($item, $updateDto);

        assert($item->getUnit() === InventoryUnit::KG);
        assert(abs($item->getCurrentStock() - 1000.0) < 0.01, 'Expected 20 bags of 50kg to convert to 1000 kg, got ' . $item->getCurrentStock());
        assert(abs(($item->getAlertThreshold() ?? 0.0) - 100.0) < 0.01, 'Expected alertThreshold 2 bags to convert to 100 kg');
        assert($item->getUnitPrice() === 300, 'Expected unitPrice 15000 FCFA/bag to convert to 300 FCFA/kg');

        // Changement vers une unité incompatible (LITER) : doit lever IncompatibleUnitException
        $incompatibleThrown = false;
        try {
            $service->updateItem($item, new UpdateInventoryItemRequestDto(
                name: 'Maïs Concassé',
                category: InventoryCategory::FEED,
                unit: InventoryUnit::LITER,
            ));
        } catch (IncompatibleUnitException) {
            $incompatibleThrown = true;
        }
        assert($incompatibleThrown, 'Expected IncompatibleUnitException when converting KG to LITER');

        // Changement entre unités vétérinaires discrètes (VIAL -> DOSE) sur un stock existant : doit lever ConflictHttpException
        $vetItem = new InventoryItem($farm, 'Vaccin Gumboro', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $vetItem->setCurrentStock(5.0);
        $conflictThrown = false;
        try {
            $service->updateItem($vetItem, new UpdateInventoryItemRequestDto(
                name: 'Vaccin Gumboro',
                category: InventoryCategory::VACCINE,
                unit: InventoryUnit::DOSE,
            ));
        } catch (ConflictHttpException) {
            $conflictThrown = true;
        }
        assert($conflictThrown, 'Expected ConflictHttpException when changing VIAL to DOSE with existing stock');
    }

    private static function testFlockTransferWithHistoryAndValidation(): void
    {
        $farm = self::createTestFarm('Ferme Principale');
        $otherFarm = self::createTestFarm('Autre Ferme');

        $bldgA = new Building($farm, 'Bâtiment Poussinière A', BuildingType::BROODER, 1000);
        $bldgB = new Building($farm, 'Bâtiment Ponte B', BuildingType::POULTRY_HOUSE, 1000);
        $bldgOtherFarm = new Building($otherFarm, 'Bâtiment Externe', BuildingType::POULTRY_HOUSE, 1000);

        $flock = new Flock($farm, 'PONTE-01', 'Lot Pondeuses', 500, new \DateTimeImmutable('2026-09-01'), PoultryType::LAYER);
        $flock->setBuilding($bldgA);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $planService = (new \ReflectionClass(CommercialPlanService::class))->newInstanceWithoutConstructor();

        $buildingsMap = [
            $bldgA->getId()?->toBase32() => $bldgA,
            $bldgB->getId()?->toBase32() => $bldgB,
            $bldgOtherFarm->getId()?->toBase32() => $bldgOtherFarm,
        ];

        $bldgRepo = new class($buildingsMap) extends BuildingRepository {
            /** @var array<string, Building> */
            private array $map;

            public function __construct(array $map)
            {
                $this->map = $map;
            }

            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object
            {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        // 1. Transfert sans targetBuildingId -> UnprocessableEntityHttpException
        $missingTargetThrown = false;
        try {
            $service->recordMovement($flock, new CreateFlockMovementRequestDto(
                type: FlockMovementType::TRANSFER,
                quantity: 500,
                movementDate: '2026-11-05',
            ));
        } catch (UnprocessableEntityHttpException) {
            $missingTargetThrown = true;
        }
        assert($missingTargetThrown, 'Expected UnprocessableEntityHttpException when targetBuildingId is missing');

        // 2. Transfert vers un bâtiment d'une autre ferme -> NotFoundHttpException
        $crossFarmThrown = false;
        try {
            $service->recordMovement($flock, new CreateFlockMovementRequestDto(
                type: FlockMovementType::TRANSFER,
                quantity: 500,
                movementDate: '2026-11-05',
                targetBuildingId: $bldgOtherFarm->getId()?->toBase32(),
            ));
        } catch (NotFoundHttpException) {
            $crossFarmThrown = true;
        }
        assert($crossFarmThrown, 'Expected NotFoundHttpException when transferring to a building from another farm');

        // 3. Transfert valide de Bâtiment A vers Bâtiment B
        $movement = $service->recordMovement($flock, new CreateFlockMovementRequestDto(
            type: FlockMovementType::TRANSFER,
            quantity: 500,
            movementDate: '2026-11-05',
            reason: 'Transfert en bâtiment de ponte',
            targetBuildingId: $bldgB->getId()?->toBase32(),
        ));

        assert($flock->getBuilding() === $bldgB, 'Flock building should be updated to target building B');
        assert($movement->getSourceBuilding() === $bldgA, 'Movement should record source building A');
        assert($movement->getTargetBuilding() === $bldgB, 'Movement should record target building B');
        assert($flock->getCurrentQuantity() === 500, 'Transfer should not reduce living flock quantity');
    }

    private static function testFlockMortalityVsSalesAndCullingRates(): void
    {
        $farm = self::createTestFarm();
        $flock = new Flock($farm, 'CHAIR-02', 'Lot Chair', 1000, new \DateTimeImmutable('2026-09-15'), PoultryType::BROILER);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $bldgRepo = (new \ReflectionClass(BuildingRepository::class))->newInstanceWithoutConstructor();
        $planService = (new \ReflectionClass(CommercialPlanService::class))->newInstanceWithoutConstructor();

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        // 20 mortalités naturelles (2.0%), 10 réformes (1.0%), 800 ventes (80.0%)
        $service->recordMovement($flock, new CreateFlockMovementRequestDto(FlockMovementType::MORTALITY, 20, '2026-10-01'));
        $service->recordMovement($flock, new CreateFlockMovementRequestDto(FlockMovementType::CULLING, 10, '2026-10-10'));
        $service->recordMovement($flock, new CreateFlockMovementRequestDto(FlockMovementType::SALE, 800, '2026-11-01'));

        assert($flock->getCurrentQuantity() === 170);
        assert(abs($flock->getMortalityRate() - 2.0) < 0.001, 'Mortality rate must be 2.0%, not 83.0%');
        assert(abs($flock->getCullingRate() - 1.0) < 0.001, 'Culling rate must be 1.0%');
        assert(abs($flock->getSalesRate() - 80.0) < 0.001, 'Sales rate must be 80.0%');
        assert(abs($flock->getLossRate() - 3.0) < 0.001, 'Loss rate (mortality + culling) must be 3.0%');
        assert($flock->getNetAdjustmentDelta() === 0);

        // Ajustement sans motif : doit être rejeté
        $missingReasonThrown = false;
        try {
            $service->recordMovement($flock, new CreateFlockMovementRequestDto(FlockMovementType::ADJUSTMENT, 175, '2026-11-02'));
        } catch (UnprocessableEntityHttpException) {
            $missingReasonThrown = true;
        }
        assert($missingReasonThrown, 'Expected UnprocessableEntityHttpException when adjustment reason is missing');

        // Ajustement d'inventaire à 175 (+5 sujets) avec motif explicite
        $service->recordMovement($flock, new CreateFlockMovementRequestDto(
            type: FlockMovementType::ADJUSTMENT,
            quantity: 175,
            movementDate: '2026-11-02',
            reason: 'Comptage physique contradictoire'
        ));
        assert($flock->getNetAdjustmentDelta() === 5);
        assert($flock->getAdjustmentsCount() === 1);
    }

    private static function testTransactionUpdateAndPaymentReconciliation(): void
    {
        $farm = self::createTestFarm();
        $locks = [];
        $em = self::createMockEntityManager($locks);
        $contactRepo = (new \ReflectionClass(ContactRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new TransactionService($contactRepo, $flockRepo, $em);

        // 1. Transaction initialement PAID de 50 000 FCFA -> modification du montant à 35 000 FCFA
        $tx = new Transaction(
            $farm,
            TransactionType::INCOME,
            TransactionCategory::EGG_SALE,
            50000,
            new \DateTimeImmutable('2026-11-01'),
            PaymentMethod::CASH,
            null,
            'Vente plateaux',
            null,
            null,
            null,
            PaymentStatus::PAID
        );
        assert($tx->getPaidAmount() === 50000);

        $service->updateTransaction($tx, new UpdateTransactionRequestDto(
            type: TransactionType::INCOME,
            category: TransactionCategory::EGG_SALE,
            amount: 35000,
            transactionDate: '2026-11-01',
        ));

        assert($tx->getAmount() === 35000);
        assert($tx->getPaidAmount() === 35000, 'Paid amount must be automatically reconciled to 35000 when amount decreases');
        assert($tx->getRemainingAmount() === 0);
        assert($tx->getPaymentStatus() === PaymentStatus::PAID);

        // 2. Passage en règlement partiel (acompte de 15 000 FCFA sur 35 000 FCFA) avec échéance
        $service->updateTransaction($tx, new UpdateTransactionRequestDto(
            type: TransactionType::INCOME,
            category: TransactionCategory::EGG_SALE,
            amount: 35000,
            transactionDate: '2026-11-01',
            paymentStatus: PaymentStatus::PARTIAL,
            paidAmount: 15000,
            dueDate: '2026-11-20',
        ));

        assert($tx->getPaymentStatus() === PaymentStatus::PARTIAL);
        assert($tx->getPaidAmount() === 15000);
        assert($tx->getRemainingAmount() === 20000);
        assert($tx->getDueDate()?->format('Y-m-d') === '2026-11-20');

        // 3. Si le montant total est abaissé à 12 000 FCFA (inférieur à l'acompte précédent de 15 000 FCFA),
        // le montant payé est plafonné à 12 000 FCFA et la transaction passe automatiquement en PAID
        $service->updateTransaction($tx, new UpdateTransactionRequestDto(
            type: TransactionType::INCOME,
            category: TransactionCategory::EGG_SALE,
            amount: 12000,
            transactionDate: '2026-11-01',
        ));

        assert($tx->getAmount() === 12000);
        assert($tx->getPaidAmount() === 12000, 'Paid amount cannot exceed the new transaction amount');
        assert($tx->getPaymentStatus() === PaymentStatus::PAID, 'Transaction must become PAID when paidAmount covers the new amount');
        assert($tx->getDueDate() === null, 'Due date must be cleared when transaction becomes PAID');
    }

    private static function testApiKeyScopeEnforcement(): void
    {
        $org = new Organization('Org Test', 'org-test-' . uniqid());
        $farmA = new Farm($org, 'Ferme A');
        $farmB = new Farm($org, 'Ferme B');
        $user = new User('owner@example.com', 'Alice', 'Owner');

        // Clé A sur Ferme A avec scope limité aux bandes
        $keyA = new ApiKey($farmA, $user, 'Capteur Poulailler', 'lef_live_', '9999', 'hash_test', ['flocks:read', 'flocks:write']);

        assert($keyA->supportsPermission('flock:view') === true, 'flocks:read should support flock:view');
        assert($keyA->supportsPermission('flock:create') === true, 'flocks:write should support flock:create');
        assert($keyA->supportsPermission('flock:edit') === true, 'flocks:write should support flock:edit');
        assert($keyA->supportsPermission('finance:view') === false, 'flocks scope must not allow finance:view');
        assert($keyA->supportsPermission('farm:delete') === false, 'Sensitive permission farm:delete must be blocked');

        $requestStack = new RequestStack();
        $checker = new ApiKeySecurityChecker($requestStack);

        $request = new Request();
        $request->attributes->set('current_api_key', $keyA);
        $requestStack->push($request);

        assert($checker->isApiKeyRequest() === true);
        assert($checker->isFarmAllowed($farmA) === true);
        assert($checker->isFarmAllowed($farmB) === false, 'ApiKey must be strictly isolated to its assigned farm');
        assert($checker->isAccessAllowed($farmA, 'flock:view') === true);
        assert($checker->isAccessAllowed($farmB, 'flock:view') === false, 'Cross-farm access must be denied');
        assert($checker->isAccessAllowed($farmA, 'finance:create') === false, 'Out-of-scope operation must be denied');
    }

    private static function testIdempotencyLockRenewal(): void
    {
        $farm = self::createTestFarm();
        $user = new User('user@example.com', 'Bob', 'Smith');

        $record = new IdempotencyRecord(
            idempotencyKey: 'idem-test-' . uniqid(),
            user: $user,
            requestPath: '/api/farms/1/health-treatments',
            requestMethod: 'POST',
            requestHash: 'hash-xyz',
            farm: $farm,
            lockDurationSeconds: 1
        );

        sleep(2);
        assert($record->isLocked() === false, 'Record lock must expire after 1 second');

        $record->renewLock(30);
        assert($record->isLocked() === true, 'renewLock must re-lock record for concurrent executions');
        assert($record->getStatus() === IdempotencyRecord::STATUS_PENDING);
        assert($record->getLockedUntil() > new \DateTimeImmutable());
    }

    private static function testGranularPermissionsMatrix(): void
    {
        $all = Permission::all();
        $granular = [
            Permission::FLOCK_EDIT,
            Permission::EGG_EDIT,
            Permission::EGG_DELETE,
            Permission::INVENTORY_EDIT,
            Permission::FINANCE_EDIT,
            Permission::FINANCE_DELETE,
        ];

        foreach ($granular as $perm) {
            assert(Permission::isValid($perm), "Permission $perm must be valid");
            assert(isset($all[$perm]), "Permission $perm must exist in all() matrix");
            assert(!empty($all[$perm]['label']), "Permission $perm must have a label");
            assert(!empty($all[$perm]['description']), "Permission $perm must have a description");
        }
    }

    private static function testTreatmentCompletionDeductsStockAtomicallyAndRejectsInsufficient(): void
    {
        $farm = self::createTestFarm('Ferme Soins');
        $otherFarm = self::createTestFarm('Autre Ferme');
        $user = new User('vet@example.com', 'Jean', 'Veterinaire');
        $flock = new Flock($farm, 'FLOCK-VET-01', 'Lot Pondeuses', 500, new \DateTimeImmutable('2026-10-01'), PoultryType::LAYER);

        $item = new InventoryItem($farm, 'Vaccin Newcastle', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $item->setCurrentStock(10.0);

        $otherItem = new InventoryItem($otherFarm, 'Vaccin Externe', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $otherItem->setCurrentStock(10.0);

        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Vaccination Newcastle J21',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 21,
            scheduledDate: new \DateTimeImmutable('2026-10-22'),
            inventoryItem: $item
        );

        $locks = [];
        $em = self::createMockEntityManager($locks);

        $itemsMap = [
            $item->getId()?->toBase32() => $item,
            $otherItem->getId()?->toBase32() => $otherItem,
        ];
        $itemRepo = new class($itemsMap) extends InventoryItemRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $treatmentRepo = (new \ReflectionClass(HealthTreatmentRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        // A. Tentative avec stock insuffisant (demande 15.0 alors que stock disponible = 10.0) -> InsufficientStockException
        $insufficientThrown = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                administeredDate: '2026-10-22',
                quantityUsed: '15.0',
                inventoryItemId: $item->getId()?->toBase32()
            ), $user);
        } catch (InsufficientStockException) {
            $insufficientThrown = true;
        }
        assert($insufficientThrown, 'Expected InsufficientStockException when requested treatment quantity exceeds stock');
        assert($item->getCurrentStock() === 10.0, 'Stock must remain unchanged on failure');

        // B. Tentative avec un article d'une autre ferme -> NotFoundHttpException
        $crossFarmThrown = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                administeredDate: '2026-10-22',
                quantityUsed: '2.0',
                inventoryItemId: $otherItem->getId()?->toBase32()
            ), $user);
        } catch (NotFoundHttpException) {
            $crossFarmThrown = true;
        }
        assert($crossFarmThrown, 'Expected NotFoundHttpException when inventory item belongs to another farm');

        // C. Exécution valide avec 4.0 flacons
        $completed = $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
            administeredDate: '2026-10-22',
            quantityUsed: '4.0',
            notes: 'Vaccination réussie',
            inventoryItemId: $item->getId()?->toBase32()
        ), $user);

        assert($completed->getStatus() === HealthTreatmentStatus::COMPLETED);
        assert($completed->getAdministeredDate()?->format('Y-m-d') === '2026-10-22');
        assert($item->getCurrentStock() === 6.0, 'Stock must be decreased from 10.0 to 6.0');

        // Vérification du verrouillage pessimiste sur l'article et le traitement
        $lockedItem = false;
        $lockedTreatment = false;
        foreach ($locks as $lock) {
            if ($lock['entity'] === $item && $lock['lockMode'] === LockMode::PESSIMISTIC_WRITE) {
                $lockedItem = true;
            }
            if ($lock['entity'] === $treatment && $lock['lockMode'] === LockMode::PESSIMISTIC_WRITE) {
                $lockedTreatment = true;
            }
        }
        assert($lockedItem, 'Pessimistic write lock must be acquired on inventory item');
        assert($lockedTreatment, 'Pessimistic write lock must be acquired on health treatment');

        // D. Tentative de compléter à nouveau un traitement déjà terminé -> ConflictHttpException
        $alreadyCompletedThrown = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                administeredDate: '2026-10-22',
                quantityUsed: '1.0',
                inventoryItemId: $item->getId()?->toBase32()
            ), $user);
        } catch (ConflictHttpException) {
            $alreadyCompletedThrown = true;
        }
        assert($alreadyCompletedThrown, 'Expected ConflictHttpException when trying to complete an already completed treatment');
        assert($item->getCurrentStock() === 6.0, 'Stock must not be double-deducted');
    }

    private static function testStandardProgramGenerationIdempotency(): void
    {
        $farm = self::createTestFarm('Ferme Prophylaxie');
        $flock = new Flock($farm, 'LAYER-PROG', 'Lot Ponte Prophylaxie', 1000, new \DateTimeImmutable('2026-10-01'), PoultryType::LAYER);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $user = new User('vet2@example.com', 'Pierre', 'Veterinaire');
        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();

        $existingTreatments = [];
        $treatmentRepo = new class($existingTreatments) extends HealthTreatmentRepository {
            public array $stored;
            public function __construct(array &$stored) { $this->stored = &$stored; }
            public function findBy(array $criteria, ?array $orderBy = null, $limit = null, $offset = null): array {
                return $this->stored;
            }
            public function findByFarm(
                Farm $farm,
                ?Flock $flock = null,
                ?HealthTreatmentStatus $status = null,
                ?\DateTimeImmutable $from = null,
                ?\DateTimeImmutable $to = null,
                ?array $allowedBuildings = null
            ): array {
                return $this->stored;
            }
        };

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        // Premier passage : génère les soins standards (ex: ~12 pour pondeuses)
        $firstRun = $service->generateStandardProgram($farm, $flock, $user);
        assert(count($firstRun) > 0, 'Standard program must generate treatments for layer flock');
        $existingTreatments = $firstRun;

        // Deuxième passage : ne doit pas recréer les soins déjà existants (idempotence)
        $secondRun = $service->generateStandardProgram($farm, $flock, $user);
        assert(count($secondRun) === 0, 'Second run of generateStandardProgram must return 0 new treatments (idempotent)');
    }

    private static function testFlockPartialTransferSplitsFlockAccurately(): void
    {
        $farm = self::createTestFarm('Ferme Scission');
        $bldgA = new Building($farm, 'Bâtiment Source A', BuildingType::BROODER, 2000);
        $bldgB = new Building($farm, 'Bâtiment Cible B', BuildingType::POULTRY_HOUSE, 2000);

        $flock = new Flock($farm, 'LOT-ORIG', 'Bande Principale', 1000, new \DateTimeImmutable('2026-10-01'), PoultryType::BROILER);
        $flock->setBuilding($bldgA);

        $persistedEntities = [];
        $locks = [];
        $em = self::createMockEntityManager($locks, $persistedEntities);

        $buildingsMap = [
            $bldgA->getId()?->toBase32() => $bldgA,
            $bldgB->getId()?->toBase32() => $bldgB,
        ];
        $bldgRepo = new class($buildingsMap) extends BuildingRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $planService = (new \ReflectionClass(CommercialPlanService::class))->newInstanceWithoutConstructor();

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        // Transfert partiel de 400 sujets vers le Bâtiment Cible B
        $movement = $service->recordMovement($flock, new CreateFlockMovementRequestDto(
            type: FlockMovementType::TRANSFER,
            quantity: 400,
            movementDate: '2026-11-06',
            reason: 'Désengorgement bâtiment source',
            targetBuildingId: $bldgB->getId()?->toBase32()
        ));

        // 1. Bande source
        assert($flock->getBuilding() === $bldgA, 'Source flock must remain in source building A');
        assert($flock->getCurrentQuantity() === 600, 'Source flock quantity must decrease from 1000 to 600');
        assert($movement->getQuantityBefore() === 1000, 'Source movement quantityBefore must be 1000');
        assert($movement->getQuantityAfter() === 600, 'Source movement quantityAfter must be 600');
        assert($movement->getSourceBuilding() === $bldgA);
        assert($movement->getTargetBuilding() === $bldgB);

        // 2. Scission : une nouvelle bande et un mouvement entrant doivent avoir été persistés
        $newFlock = null;
        $incomingMovement = null;
        foreach ($persistedEntities as $p) {
            if ($p instanceof Flock && $p !== $flock) {
                $newFlock = $p;
            }
            if ($p instanceof \App\Entity\FlockMovement && $p !== $movement) {
                $incomingMovement = $p;
            }
        }

        assert($newFlock !== null, 'A new split flock must be created in target building');
        assert($newFlock->getBuilding() === $bldgB, 'Split flock must be placed in target building B');
        assert($newFlock->getCurrentQuantity() === 400, 'Split flock initial quantity must be 400');
        assert($newFlock->getStatus() === FlockStatus::ACTIVE);

        assert($incomingMovement !== null, 'An incoming movement must be recorded for split flock');
        assert($incomingMovement->getType() === FlockMovementType::TRANSFER);
        assert($incomingMovement->getQuantity() === 400);
        assert($incomingMovement->getQuantityBefore() === 0);
        assert($incomingMovement->getQuantityAfter() === 400);
        assert($incomingMovement->getSourceBuilding() === $bldgA);
        assert($incomingMovement->getTargetBuilding() === $bldgB);
    }

    private static function testFlockUpdatePreservesBuildingAndStatusWhenOmitted(): void
    {
        $farm = self::createTestFarm('Ferme Modif');
        $bldgA = new Building($farm, 'Bâtiment A', BuildingType::POULTRY_HOUSE, 1000);
        $bldgInactive = new Building($farm, 'Bâtiment En Quarantaine', BuildingType::POULTRY_HOUSE, 1000);
        $bldgInactive->setIsActive(false);

        $flock = new Flock($farm, 'LOT-CLOTURE', 'Bande Terminée', 1000, new \DateTimeImmutable('2026-05-01'), PoultryType::BROILER);
        $flock->setBuilding($bldgA);
        $flock->setStatus(FlockStatus::COMPLETED);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $buildingsMap = [
            $bldgA->getId()?->toBase32() => $bldgA,
            $bldgInactive->getId()?->toBase32() => $bldgInactive,
        ];
        $bldgRepo = new class($buildingsMap) extends BuildingRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $planService = (new \ReflectionClass(CommercialPlanService::class))->newInstanceWithoutConstructor();

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        // A. Mise à jour du nom seul (status et buildingId sont null) -> Le statut COMPLETED ne doit pas redevenir ACTIVE
        $updateDto = new UpdateFlockRequestDto(
            name: 'Bande Terminée Renommée'
        );
        $updated = $service->updateFlock($flock, $updateDto);

        assert($updated->getName() === 'Bande Terminée Renommée');
        assert($updated->getStatus() === FlockStatus::COMPLETED, 'Omitted status must NOT revert completed flock to ACTIVE');
        assert($updated->getBuilding() === $bldgA, 'Omitted buildingId must preserve existing building');

        // B. Tentative d'affecter un bâtiment inactif -> UnprocessableEntityHttpException
        $inactiveThrown = false;
        try {
            $service->updateFlock($flock, new UpdateFlockRequestDto(
                name: 'Bande Terminée Renommée',
                buildingId: $bldgInactive->getId()?->toBase32()
            ));
        } catch (UnprocessableEntityHttpException) {
            $inactiveThrown = true;
        }
        assert($inactiveThrown, 'Expected UnprocessableEntityHttpException when assigning inactive building to flock');
    }

    private static function testRefreshTokenFamilyRevocationCommittedOnReuse(): void
    {
        $user = new User('mobile@example.com', 'Mobile', 'User');
        $rawToken = 'stolen_refresh_token_value_abc123';
        $tokenHash = hash('sha256', $rawToken);
        $familyId = 'fam-uuid-test-999';

        $revokedToken = new DeviceRefreshToken(
            user: $user,
            refreshTokenHash: $tokenHash,
            deviceId: 'dev-123',
            familyId: $familyId,
            expiresAt: (new \DateTimeImmutable())->modify('+10 days')
        );
        $revokedToken->setRevoked(true);

        $revokedFamilyCalled = null;
        $tokenRepo = new class($revokedToken, $revokedFamilyCalled) extends DeviceRefreshTokenRepository {
            private object $token;
            private mixed $revokedFamily;
            public function __construct(object $token, mixed &$revokedFamily) {
                $this->token = $token;
                $this->revokedFamily = &$revokedFamily;
            }
            public function findByHashWithLock(string $hash): ?DeviceRefreshToken {
                return $this->token;
            }
            public function revokeFamily(string $familyId): int {
                $this->revokedFamily = $familyId;
                return 1;
            }
        };

        $committedBeforeException = false;
        $locks = [];
        $persisted = [];
        $em = self::createMockEntityManager(
            $locks,
            $persisted,
            function () use (&$committedBeforeException) {
                $committedBeforeException = true;
            }
        );

        $jwtManager = new class implements \Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface {
            public function create(\Symfony\Component\Security\Core\User\UserInterface $user): string { return 'fake_jwt'; }
            public function decode(\Symfony\Component\Security\Core\Authentication\Token\TokenInterface $token): array { return []; }
            public function parse(string $jwt): array { return []; }
            public function setUserIdentityField(string $field): void {}
            public function getUserIdentityField(): string { return 'email'; }
            public function getUserIdClaim(): ?string { return null; }
            public function createFromPayload(\Symfony\Component\Security\Core\User\UserInterface $user, array $payload = []): string { return 'fake_jwt'; }
        };

        $service = new DeviceAuthService($tokenRepo, $em, $jwtManager);

        $authExceptionThrown = false;
        try {
            $service->rotateRefreshToken($rawToken, 'dev-123');
        } catch (AuthenticationException) {
            $authExceptionThrown = true;
        }

        assert($authExceptionThrown, 'Expected AuthenticationException on revoked token reuse');
        assert($revokedFamilyCalled === $familyId, 'revokeFamily must be called with the compromised familyId');
        assert($committedBeforeException === true, 'revokeFamily must be explicitly committed to the database before throwing exception');
    }

    private static function testDashboardApiKeyScopesAndSanitaryBuildingIsolation(): void
    {
        $org = new Organization('Org Dashboard', 'org-dash-' . uniqid());
        $farm = new Farm($org, 'Ferme Dashboard');
        $user = new User('user@dash.com', 'Dash', 'User');

        $bldgA = new Building($farm, 'Bâtiment Autorisé', BuildingType::POULTRY_HOUSE, 1000);
        $bldgB = new Building($farm, 'Bâtiment Non Autorisé', BuildingType::POULTRY_HOUSE, 1000);

        // Clé API avec accès uniquement aux bandes (aucun droit sur œufs, santé, finances, inventaire)
        $apiKey = new ApiKey($farm, $user, 'Clé Capteur Bandes', 'lef_live_', '8888', 'hash_8888', ['flocks:read']);

        $requestStack = new RequestStack();
        $request = new Request();
        $request->attributes->set('current_api_key', $apiKey);
        $requestStack->push($request);
        $checker = new ApiKeySecurityChecker($requestStack);

        $flockRepo = new class extends FlockRepository {
            public function __construct() {}
            public function findByFarm(Farm $farm, ?FlockStatus $status = null, ?array $allowedBuildings = null): array { return []; }
            public function count(array $criteria = []): int { return 0; }
        };
        $eggRepo = new class extends EggProductionRepository {
            public function __construct() {}
        };
        $invRepo = new class extends InventoryItemRepository {
            public function __construct() {}
        };
        $txRepo = new class extends TransactionRepository {
            public function __construct() {}
        };
        $txService = (new \ReflectionClass(TransactionService::class))->newInstanceWithoutConstructor();
        $membershipRepo = new class extends FarmMembershipRepository {
            public function __construct() {}
            public function findOneBy(array $criteria, ?array $orderBy = null): ?object { return null; }
        };
        $bldgRepo = new class extends BuildingRepository {
            public function __construct() {}
            public function count(array $criteria = []): int { return 0; }
        };
        $healthRepo = new class extends HealthTreatmentRepository {
            public function __construct() {}
        };
        $planService = new class extends CommercialPlanService {
            public function __construct() {}
            public function getPlan(string $sku): ?array {
                return [
                    'sku' => 'STANDARD',
                    'name' => 'Standard',
                    'tier' => 'Standard',
                    'modules' => ['flocks', 'eggs', 'inventory', 'health', 'finance'],
                    'quotas' => ['maxFarms' => 1, 'maxFlocks' => 2, 'maxBuildings' => 2, 'maxMembers' => 2],
                ];
            }
        };

        $dashboardService = new DashboardService(
            $flockRepo,
            $eggRepo,
            $invRepo,
            $txRepo,
            $txService,
            $membershipRepo,
            $bldgRepo,
            $healthRepo,
            $planService,
            $checker
        );

        $data = $dashboardService->getDashboardData($farm, $user);

        assert($data['flocks']['hasAccess'] === true, 'ApiKey with flocks:read must have access to flocks');
        assert($data['eggProduction']['hasAccess'] === false, 'ApiKey without egg:view must have eggProduction.hasAccess = false');
        assert($data['inventory']['hasAccess'] === false, 'ApiKey without inventory:view must have inventory.hasAccess = false');
        assert($data['health']['hasAccess'] === false, 'ApiKey without health:view must have health.hasAccess = false');
        assert($data['finances']['hasAccess'] === false, 'ApiKey without finance:view must have finances.hasAccess = false');
    }

    private static function testInventoryPrecisionValidationAndRounding(): void
    {
        $farm = self::createTestFarm('Ferme Stock');
        $item = new InventoryItem($farm, 'Aliment Ponte 25kg', InventoryCategory::FEED, InventoryUnit::BAG, 25.0);
        $item->setCurrentStock(10.0);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();
        $movRepo = (new \ReflectionClass(StockMovementRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new InventoryService($itemRepo, $movRepo, $flockRepo, $em);

        // Décompte de 2.333 sacs (converti et arrondi à 2 décimales : 2.33)
        $service->recordMovement($item, new CreateStockMovementRequestDto(
            type: StockMovementType::FEEDING,
            quantity: 2.333,
            movementDate: '2026-11-06',
            unit: InventoryUnit::BAG
        ));

        // 10.0 - 2.33 = 7.67
        assert(abs($item->getCurrentStock() - 7.67) < 0.001, 'Stock must be rounded to exactly 2 decimals, expected 7.67 got ' . $item->getCurrentStock());
    }
}
