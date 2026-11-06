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
use App\Enum\FarmRole;
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
use App\Exception\PlanQuotaExceededException;
use App\Repository\BuildingRepository;
use App\Repository\ContactRepository;
use App\Repository\DeviceRefreshTokenRepository;
use App\Repository\EggProductionRepository;
use App\Repository\FarmMembershipRepository;
use App\Repository\FlockMovementRepository;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\OrganizationRepository;
use App\Repository\StockMovementRepository;
use App\Repository\SubscriptionPlanRepository;
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
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use App\Controller\TransactionController;
use App\Controller\FlockController;
use App\Controller\InventoryController;
use App\Controller\EggProductionController;
use App\Controller\HealthController;
use App\Dto\Transaction\CreateTransactionRequestDto;
use App\Dto\Health\CreateHealthTreatmentRequestDto;
use App\Dto\Health\UpdateHealthTreatmentRequestDto;
use App\Dto\Health\GenerateProphylaxisProgramRequestDto;
use App\Dto\EggProduction\CreateEggProductionRequestDto;
use App\Entity\FarmMembership;
use App\Repository\IdempotencyRecordRepository;
use App\Service\IdempotencyService;

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
            'testIdempotencyKeyEnforcedOnSensitiveEndpoints' => 'Idempotence: en-tête obligatoire sur mutations sensibles (400 si omis)',
            'testIdempotencyAtomicTransactionCoordination' => 'Idempotence: coordination atomique bout en bout (rollback unifié)',
            'testProphylaxisGenerationPessimisticLockAndUniqueBusinessKey' => 'Prophylaxie: verrou pessimiste cheptel et unicité business_key',
            'testHealthBuildingFilteringAtDatabaseLevelBeforePagination' => 'Santé: filtrage SQL par bâtiments assignés avant limite',
            'testTreatmentCompletionRejectsZeroOrNegativeQuantityWhenDeductingStock' => 'Santé: rejet quantité nulle ou négative si décompte stock',
            'testTreatmentUpdateRejectsNonExistentOrCrossFarmInventoryItem' => 'Santé: rejet article invalide ou cross-farm dans mise à jour soin',
            'testFlockPartialTransferEnforcesSubscriptionQuotaAndGeneratesCollisionProofCode' => 'Cheptel: contrôle strict quotas de scission et code aléatoire',
            'testHealthStateTransitionsAndDirectStatusUpdateBlocked' => 'Santé: rejet mise à jour directe statut/date, annulation sans stock, type HEALTH_CONSUMPTION & protection suppression',
            'testStockMovementHealthConsumptionForbiddenInManualEntry' => 'Inventaire: rejet saisie manuelle type HEALTH_CONSUMPTION (réservé système)',
            'testCommercialPlanOrganizationPessimisticLock' => 'Quotas: verrouillage pessimiste exclusif sur l\'organisation pour sérialisation',
            'testFlockUpdateEnforcesActiveFlockQuotaWhenTransitioningToActive' => 'Cheptel: vérification stricte quota lors de la réactivation d\'une bande vers ACTIVE',
        ];

        foreach ($tests as $method => $description) {
            self::$method();
            echo sprintf("  [PASS] %s\n", $description);
        }

        echo "\nALL AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY (27/27).\n";
    }

    private static function createTestFarm(string $name = 'Ferme Test'): Farm
    {
        $org = new Organization('Org Test', 'org-test-' . uniqid());
        return new Farm($org, $name);
    }

    private static function createMockEntityManager(
        array &$lockedEntities,
        ?array &$persistedEntities = null,
        ?callable $onCommit = null,
        ?callable $onBeginTransaction = null,
        ?callable $onRollback = null,
        ?\Doctrine\DBAL\Connection $connection = null
    ): EntityManagerInterface {
        return new class($lockedEntities, $persistedEntities, $onCommit, $onBeginTransaction, $onRollback, $connection) implements EntityManagerInterface {
            /** @var array<int, array{entity: object, lockMode: mixed}> */
            private array $locks;
            private ?array $persisted;
            private mixed $onCommit;
            private mixed $onBeginTransaction;
            private mixed $onRollback;
            private ?\Doctrine\DBAL\Connection $conn;

            public function __construct(
                array &$lockedEntities,
                ?array &$persistedEntities = null,
                ?callable $onCommit = null,
                ?callable $onBeginTransaction = null,
                ?callable $onRollback = null,
                ?\Doctrine\DBAL\Connection $connection = null
            ) {
                $this->locks = &$lockedEntities;
                $this->persisted = &$persistedEntities;
                $this->onCommit = $onCommit;
                $this->onBeginTransaction = $onBeginTransaction;
                $this->onRollback = $onRollback;
                $this->conn = $connection;
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
                return $this->conn ?? (new \ReflectionClass(\Doctrine\DBAL\Connection::class))->newInstanceWithoutConstructor();
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
                if ($this->onBeginTransaction !== null) {
                    ($this->onBeginTransaction)();
                }
            }

            public function commit(): void
            {
                if ($this->onCommit !== null) {
                    ($this->onCommit)();
                }
            }

            public function rollback(): void
            {
                if ($this->onRollback !== null) {
                    ($this->onRollback)();
                }
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
                $qb = (new \ReflectionClass(\Doctrine\ORM\QueryBuilder::class))->newInstanceWithoutConstructor();
                return new class($this) extends \Doctrine\ORM\QueryBuilder {
                    public function __construct(EntityManagerInterface $em) { parent::__construct($em); }
                    public function select($select = null): static { return $this; }
                    public function from($from, $alias, $indexBy = null): static { return $this; }
                    public function where($predicates): static { return $this; }
                    public function andWhere($where): static { return $this; }
                    public function setParameter($key, $value, $type = null): static { return $this; }
                    public function getQuery(): \Doctrine\ORM\Query {
                        return new class extends \Doctrine\ORM\Query {
                            public function __construct() {}
                            public function getSingleScalarResult(): mixed { return 0; }
                        };
                    }
                };
            }

            public function find(string $className, mixed $id, LockMode|int|null $lockMode = LockMode::NONE, ?int $lockVersion = null): ?object
            {
                if ($this->persisted !== null) {
                    foreach ($this->persisted as $p) {
                        if ($p instanceof $className) {
                            $entityId = method_exists($p, 'getId') ? $p->getId() : null;
                            if ($entityId !== null && ((string) $entityId === (string) $id || $entityId == $id)) {
                                if ($lockMode !== null && $lockMode !== LockMode::NONE) {
                                    $this->locks[] = ['entity' => $p, 'lockMode' => $lockMode];
                                }

                                return $p;
                            }
                        }
                    }
                }

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

        $flockRepo = new class extends FlockRepository {
            public function __construct() {}
            public function findOneBy(array $criteria, ?array $orderBy = null): ?object { return null; }
        };
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $planService = new class extends CommercialPlanService {
            public function __construct() {}
            public function assertCanCreateFlock(\App\Entity\Farm $farm): void {}
        };

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

    private static function testIdempotencyKeyEnforcedOnSensitiveEndpoints(): void
    {
        $farm = self::createTestFarm('Ferme Idem');
        $user = new User('idem@example.com', 'Idem', 'User');
        $flock = new Flock($farm, 'LOT-IDEM', 'Lot Idem', 500, new \DateTimeImmutable('2026-01-01'), PoultryType::BROILER);
        $item = new InventoryItem($farm, 'Item Idem', InventoryCategory::FEED, InventoryUnit::BAG, 10.0);
        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Soin Idem',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 10,
            scheduledDate: new \DateTimeImmutable('2026-01-10')
        );

        $requestWithoutKey = new Request();
        $requestWithBlankKey = new Request();
        $requestWithBlankKey->headers->set('Idempotency-Key', '   ');

        // 1. TransactionController::create
        $txCtrl = (new \ReflectionClass(TransactionController::class))->newInstanceWithoutConstructor();
        $txDto = new CreateTransactionRequestDto(
            type: TransactionType::EXPENSE,
            category: TransactionCategory::OTHER_EXPENSE,
            amount: 1000,
            transactionDate: '2026-11-06'
        );
        $caught = false;
        try {
            $txCtrl->create($farm, $txDto, $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'TransactionController::create must require Idempotency-Key');

        // 2. FlockController::recordMovement
        $flockCtrl = (new \ReflectionClass(FlockController::class))->newInstanceWithoutConstructor();
        $flockDto = new CreateFlockMovementRequestDto(
            type: FlockMovementType::MORTALITY,
            quantity: 5,
            movementDate: '2026-11-06'
        );
        $caught = false;
        try {
            $flockCtrl->recordMovement($flock, $flockDto, $user, $requestWithBlankKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'FlockController::recordMovement must reject blank Idempotency-Key');

        // 3. InventoryController::recordMovement
        $invCtrl = (new \ReflectionClass(InventoryController::class))->newInstanceWithoutConstructor();
        $stockDto = new CreateStockMovementRequestDto(
            type: StockMovementType::ADJUSTMENT,
            quantity: 2.0,
            movementDate: '2026-11-06'
        );
        $caught = false;
        try {
            $invCtrl->recordMovement($item, $stockDto, $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'InventoryController::recordMovement must require Idempotency-Key');

        // 4. EggProductionController::create
        $eggCtrl = (new \ReflectionClass(EggProductionController::class))->newInstanceWithoutConstructor();
        $eggDto = new CreateEggProductionRequestDto(
            productionDate: '2026-11-06',
            goodEggs: 120
        );
        $caught = false;
        try {
            $eggCtrl->create($flock, $eggDto, $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'EggProductionController::create must require Idempotency-Key');

        // 5. HealthController mutations (create, generateProgram, complete)
        $propLocks = [];
        $em = self::createMockEntityManager($propLocks);
        $flockRepo = new class($flock) extends FlockRepository {
            private Flock $f;
            public function __construct(Flock $f) { $this->f = $f; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                return $this->f;
            }
        };
        $memRepo = new class extends FarmMembershipRepository {
            public function __construct() {}
            public function findOneBy(array $criteria, ?array $orderBy = null): ?object {
                return null;
            }
        };
        $healthCtrl = new HealthController(
            (new \ReflectionClass(HealthService::class))->newInstanceWithoutConstructor(),
            (new \ReflectionClass(HealthTreatmentRepository::class))->newInstanceWithoutConstructor(),
            $flockRepo,
            $memRepo,
            (new \ReflectionClass(IdempotencyService::class))->newInstanceWithoutConstructor()
        );

        $caught = false;
        try {
            $healthCtrl->create($farm, new CreateHealthTreatmentRequestDto(
                flockId: $flock->getId()->toBase32(),
                title: 'Vaccin Test',
                type: HealthTreatmentType::VACCINATION,
                administrationMethod: AdministrationMethod::DRINKING_WATER,
                scheduledDate: '2026-11-10',
                targetAgeDays: 14
            ), $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'HealthController::create must require Idempotency-Key');

        $caught = false;
        try {
            $healthCtrl->generateProgram($farm, new GenerateProphylaxisProgramRequestDto(
                flockId: $flock->getId()->toBase32()
            ), $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'HealthController::generateProgram must require Idempotency-Key');

        $caught = false;
        try {
            $healthCtrl->complete($treatment, new CompleteHealthTreatmentRequestDto(), $user, $requestWithoutKey);
        } catch (BadRequestHttpException) {
            $caught = true;
        }
        assert($caught, 'HealthController::complete must require Idempotency-Key');
    }

    private static function testIdempotencyAtomicTransactionCoordination(): void
    {
        $farm = self::createTestFarm('Ferme Idem Coordination');
        $user = new User('coord@example.com', 'Coord', 'User');

        $txStarted = 0;
        $txCommitted = 0;
        $txRolledBack = 0;
        $flushed = 0;
        $connActive = false;

        $conn = new class($connActive, $txRolledBack) extends \Doctrine\DBAL\Connection {
            private bool $active;
            private int $rolledBack;
            public function __construct(bool &$active, int &$rolledBack) {
                $this->active = &$active;
                $this->rolledBack = &$rolledBack;
            }
            public function isTransactionActive(): bool {
                return $this->active;
            }
            public function rollBack(): void {
                $this->rolledBack++;
                $this->active = false;
            }
        };

        $dummyLocks = [];
        $persisted = [];
        $em = self::createMockEntityManager(
            $dummyLocks,
            $persisted,
            onCommit: function () use (&$txCommitted, &$connActive) {
                $txCommitted++;
                $connActive = false;
            },
            onBeginTransaction: function () use (&$txStarted, &$connActive) {
                $txStarted++;
                $connActive = true;
            },
            onRollback: function () use (&$connActive) {
                $connActive = false;
            },
            connection: $conn
        );

        $failedRecordId = null;
        $failedMessage = null;
        $recordRepo = new class($failedRecordId, $failedMessage) extends IdempotencyRecordRepository {
            private mixed $fId;
            private mixed $fMsg;
            public function __construct(mixed &$fId, mixed &$fMsg) {
                $this->fId = &$fId;
                $this->fMsg = &$fMsg;
            }
            public function findByKey(string $key): ?IdempotencyRecord { return null; }
            public function markFailed(mixed $id, ?string $lockToken = null, ?string $errorMessage = null): int {
                $this->fId = $id;
                $this->fMsg = $errorMessage;
                return 1;
            }
        };

        $service = new IdempotencyService($recordRepo, $em);
        $req = new Request([], [], [], [], [], ['REQUEST_URI' => '/api/test', 'REQUEST_METHOD' => 'POST'], '{"data":1}');

        // Cas A : Succès -> beginTransaction et commit appelés
        $res = $service->process('key-atom-ok-1', $user, $req, $farm, fn() => new JsonResponse(['success' => true]));
        assert($res->getStatusCode() === 200);
        assert($txStarted === 1, 'beginTransaction must be called');
        assert($txCommitted === 1, 'commit must be called');
        assert($txRolledBack === 0, 'No rollback on success');

        // Cas B : Échec d'exécution -> rollback appelé et markFailed invoqué
        $errorCaught = false;
        try {
            $service->process('key-atom-err-1', $user, $req, $farm, fn() => throw new \RuntimeException('Panne SQL'));
        } catch (\RuntimeException) {
            $errorCaught = true;
        }
        assert($errorCaught);
        assert($txRolledBack === 1, 'rollBack must be called on connection when business execution throws');
        assert($failedMessage === 'Panne SQL', 'markFailed must record business failure message');
    }

    private static function testProphylaxisGenerationPessimisticLockAndUniqueBusinessKey(): void
    {
        $farm = self::createTestFarm('Ferme Prophylaxie');
        $flock = new Flock($farm, 'LOT-PROPH-1', 'Bande Proph', 1000, new \DateTimeImmutable('2026-02-01'), PoultryType::BROILER);
        $user = new User('proph@example.com', 'Doc', 'Veto');

        $locks = [];
        $persisted = [];
        $em = self::createMockEntityManager($locks, $persisted);

        $savedTreatments = [];
        $treatmentRepo = new class($savedTreatments) extends HealthTreatmentRepository {
            private array $saved;
            public function __construct(array &$saved) { $this->saved = &$saved; }
            public function findBy(array $criteria, ?array $orderBy = null, $limit = null, $offset = null): array {
                return $this->saved;
            }
        };
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        $created = $service->generateStandardProgram($farm, $flock, $user);

        // 1. Verrouillage pessimiste en écriture sur la bande
        $flockLocked = false;
        foreach ($locks as $l) {
            if ($l['entity'] === $flock && $l['lockMode'] === LockMode::PESSIMISTIC_WRITE) {
                $flockLocked = true;
                break;
            }
        }
        assert($flockLocked, 'Flock must be locked with PESSIMISTIC_WRITE during prophylaxis generation');

        // 2. Unicité et présence de businessKey déterministe
        assert(count($created) > 0, 'Must generate standard program treatments');
        $keys = [];
        foreach ($created as $t) {
            assert($t->getBusinessKey() !== null, 'Treatment must have a businessKey');
            assert(str_starts_with($t->getBusinessKey(), 'PROPH_'), 'businessKey must start with PROPH_ prefix');
            assert(!isset($keys[$t->getBusinessKey()]), 'Each generated treatment must have a unique businessKey');
            $keys[$t->getBusinessKey()] = true;
            $savedTreatments[] = $t;
        }

        // 3. Deuxième exécution pour la même bande -> aucune création en doublon
        $secondRun = $service->generateStandardProgram($farm, $flock, $user);
        assert(count($secondRun) === 0, 'Re-running generateStandardProgram must produce 0 duplicate treatments');
    }

    private static function testHealthBuildingFilteringAtDatabaseLevelBeforePagination(): void
    {
        $farm = self::createTestFarm('Ferme Sanitaire Filtrage');
        $user = new User('filtre@example.com', 'Filtre', 'User');
        $bldgA = new Building($farm, 'Bâtiment Autorisé', BuildingType::POULTRY_HOUSE, 1000);
        $bldgB = new Building($farm, 'Bâtiment Interdit', BuildingType::POULTRY_HOUSE, 1000);

        $membership = new FarmMembership($farm, $user, FarmRole::VET_CONSULTANT);
        $membership->addAssignedBuilding($bldgA);

        $passedBuildingsFindByFarm = null;
        $passedBuildingsUpcoming = null;
        $passedBuildingsOverdue = null;

        $treatmentRepo = new class($passedBuildingsFindByFarm, $passedBuildingsUpcoming, $passedBuildingsOverdue) extends HealthTreatmentRepository {
            private mixed $pFarm;
            private mixed $pUp;
            private mixed $pOver;
            public function __construct(mixed &$pFarm, mixed &$pUp, mixed &$pOver) {
                $this->pFarm = &$pFarm;
                $this->pUp = &$pUp;
                $this->pOver = &$pOver;
            }
            public function findByFarm(Farm $farm, ?Flock $flock = null, ?HealthTreatmentStatus $status = null, ?\DateTimeImmutable $from = null, ?\DateTimeImmutable $to = null, ?array $allowedBuildings = null): array {
                $this->pFarm = $allowedBuildings;
                return [];
            }
            public function findUpcomingTreatments(Farm $farm, int $limit = 5, ?array $allowedBuildings = null): array {
                $this->pUp = $allowedBuildings;
                return [];
            }
            public function findOverdueTreatments(Farm $farm, ?array $allowedBuildings = null): array {
                $this->pOver = $allowedBuildings;
                return [];
            }
        };

        $memRepo = new class($membership) extends FarmMembershipRepository {
            private object $mem;
            public function __construct(object $mem) { $this->mem = $mem; }
            public function findOneBy(array $criteria, ?array $orderBy = null): ?object {
                return $this->mem;
            }
        };

        $controller = new HealthController(
            (new \ReflectionClass(HealthService::class))->newInstanceWithoutConstructor(),
            $treatmentRepo,
            (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor(),
            $memRepo,
            (new \ReflectionClass(IdempotencyService::class))->newInstanceWithoutConstructor()
        );
        $container = new class implements \Psr\Container\ContainerInterface {
            public function get(string $id): mixed { return null; }
            public function has(string $id): bool { return false; }
        };
        $controller->setContainer($container);

        $response = $controller->list($farm, new Request(), $user);
        assert($response->getStatusCode() === 200);

        // Vérification que les requêtes ont bien reçu les bâtiments assignés
        assert($passedBuildingsFindByFarm !== null, 'findByFarm must receive allowedBuildings parameter');
        assert(count($passedBuildingsFindByFarm) === 1 && $passedBuildingsFindByFarm[0] === $bldgA);
        assert($passedBuildingsUpcoming !== null, 'findUpcomingTreatments must receive allowedBuildings before limit');
        assert(count($passedBuildingsUpcoming) === 1 && $passedBuildingsUpcoming[0] === $bldgA);
        assert($passedBuildingsOverdue !== null, 'findOverdueTreatments must receive allowedBuildings');
        assert(count($passedBuildingsOverdue) === 1 && $passedBuildingsOverdue[0] === $bldgA);
    }

    private static function testTreatmentCompletionRejectsZeroOrNegativeQuantityWhenDeductingStock(): void
    {
        $farm = self::createTestFarm('Ferme Soin Stock');
        $user = new User('veto@example.com', 'Soin', 'Veto');
        $item = new InventoryItem($farm, 'Vaccin Gumboro Flacon', InventoryCategory::MEDICATION, InventoryUnit::DOSE, 100.0);
        $item->setCurrentStock(50.0);

        $flock = new Flock($farm, 'LOT-SOIN', 'Bande Soin', 1000, new \DateTimeImmutable('2026-03-01'), PoultryType::BROILER);
        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Gumboro J12',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 12,
            scheduledDate: new \DateTimeImmutable('2026-03-12')
        );
        $treatment->setInventoryItem($item);

        $dummyLocks = [];
        $em = self::createMockEntityManager($dummyLocks);
        $treatmentRepo = (new \ReflectionClass(HealthTreatmentRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();
        $itemRepo = (new \ReflectionClass(InventoryItemRepository::class))->newInstanceWithoutConstructor();

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        // 1. Quantité nulle (0.0) -> Exception
        $zeroCaught = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                quantityUsed: '0',
                deductFromStock: true
            ), $user);
        } catch (UnprocessableEntityHttpException) {
            $zeroCaught = true;
        }
        assert($zeroCaught, 'completeTreatment must reject quantityUsed = 0 when deductFromStock is true');

        // 2. Quantité négative (-5) -> Exception
        $negativeCaught = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                quantityUsed: '-5.0',
                deductFromStock: true
            ), $user);
        } catch (UnprocessableEntityHttpException) {
            $negativeCaught = true;
        }
        assert($negativeCaught, 'completeTreatment must reject negative quantityUsed');

        // 3. Quantité absente alors que deductFromStock est true -> Exception
        $nullCaught = false;
        try {
            $service->completeTreatment($treatment, new CompleteHealthTreatmentRequestDto(
                quantityUsed: null,
                deductFromStock: true
            ), $user);
        } catch (UnprocessableEntityHttpException) {
            $nullCaught = true;
        }
        assert($nullCaught, 'completeTreatment must reject null quantityUsed when deductFromStock is true');
    }

    private static function testTreatmentUpdateRejectsNonExistentOrCrossFarmInventoryItem(): void
    {
        $farm1 = self::createTestFarm('Ferme 1');
        $farm2 = self::createTestFarm('Ferme 2');
        $flock = new Flock($farm1, 'LOT-F1', 'Bande F1', 500, new \DateTimeImmutable('2026-01-01'), PoultryType::BROILER);
        $treatment = new HealthTreatment(
            farm: $farm1,
            flock: $flock,
            title: 'Traitement F1',
            type: HealthTreatmentType::TREATMENT,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 5,
            scheduledDate: new \DateTimeImmutable('2026-01-05')
        );

        $crossItem = new InventoryItem($farm2, 'Produit Ferme 2', InventoryCategory::MEDICATION, InventoryUnit::VIAL, 10.0);

        $itemsMap = [
            $crossItem->getId()?->toBase32() => $crossItem,
        ];
        $itemRepo = new class($itemsMap) extends InventoryItemRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $dummyLocks = [];
        $em = self::createMockEntityManager($dummyLocks);
        $treatmentRepo = (new \ReflectionClass(HealthTreatmentRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = (new \ReflectionClass(FlockRepository::class))->newInstanceWithoutConstructor();

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        // 1. Article appartenant à une autre exploitation -> NotFoundHttpException
        $crossCaught = false;
        try {
            $service->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                inventoryItemId: $crossItem->getId()?->toBase32()
            ));
        } catch (NotFoundHttpException) {
            $crossCaught = true;
        }
        assert($crossCaught, 'updateTreatment must reject cross-farm inventory item with NotFoundHttpException');

        // 2. Article avec ULID inexistant -> NotFoundHttpException
        $nonExistentCaught = false;
        try {
            $service->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                inventoryItemId: (new \Symfony\Component\Uid\Ulid())->toBase32()
            ));
        } catch (NotFoundHttpException) {
            $nonExistentCaught = true;
        }
        assert($nonExistentCaught, 'updateTreatment must reject non-existent inventory item with NotFoundHttpException');

        // 3. Chaîne vide -> dissocie l'article
        $treatment->setInventoryItem($crossItem);
        $service->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
            inventoryItemId: ''
        ));
        assert($treatment->getInventoryItem() === null, 'updateTreatment with empty inventoryItemId must dissociate item');
    }

    private static function testFlockPartialTransferEnforcesSubscriptionQuotaAndGeneratesCollisionProofCode(): void
    {
        $farm = self::createTestFarm('Ferme Quotas');
        $bldgA = new Building($farm, 'Bât A', BuildingType::POULTRY_HOUSE, 1000);
        $bldgB = new Building($farm, 'Bât B', BuildingType::POULTRY_HOUSE, 1000);
        $flock = new Flock($farm, 'LOT-QUOTA-SRC', 'Bande Quota Source', 800, new \DateTimeImmutable('2026-04-01'), PoultryType::BROILER);
        $flock->setBuilding($bldgA);

        $buildingsMap = [
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

        $dummyLocks = [];
        $persistedEntities = [];
        $em = self::createMockEntityManager($dummyLocks, $persistedEntities);
        $flockRepo = new class extends FlockRepository {
            public function __construct() {}
            public function findOneBy(array $criteria, ?array $orderBy = null): ?object { return null; }
        };
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();

        // 1. Quota d'abonnement dépassé : assertCanCreateFlock lève une exception
        $failingPlanService = new class extends CommercialPlanService {
            public function __construct() {}
            public function assertCanCreateFlock(\App\Entity\Farm $farm): void {
                throw new PlanQuotaExceededException('max_flocks', 3, 3, 'STANDARD');
            }
        };

        $failingService = new FlockService($flockRepo, $movRepo, $bldgRepo, $failingPlanService, $em);
        $quotaCaught = false;
        try {
            $failingService->recordMovement($flock, new CreateFlockMovementRequestDto(
                type: FlockMovementType::TRANSFER,
                quantity: 200,
                movementDate: '2026-11-06',
                targetBuildingId: $bldgB->getId()?->toBase32()
            ));
        } catch (PlanQuotaExceededException) {
            $quotaCaught = true;
        }
        assert($quotaCaught, 'Partial transfer must enforce subscription quota before creating split flock');

        // 2. Quota valide : génération d'un code de scission aléatoire anti-collision
        $okPlanService = new class extends CommercialPlanService {
            public function __construct() {}
            public function assertCanCreateFlock(\App\Entity\Farm $farm): void {}
        };
        $okService = new FlockService($flockRepo, $movRepo, $bldgRepo, $okPlanService, $em);

        $okService->recordMovement($flock, new CreateFlockMovementRequestDto(
            type: FlockMovementType::TRANSFER,
            quantity: 200,
            movementDate: '2026-11-06',
            targetBuildingId: $bldgB->getId()?->toBase32()
        ));

        $splitFlock = null;
        foreach ($persistedEntities as $p) {
            if ($p instanceof Flock && $p !== $flock) {
                $splitFlock = $p;
                break;
            }
        }
        assert($splitFlock !== null, 'Split flock must be created when quota allows');
        assert(preg_match('/^LOT-QUOTA-SRC-S[A-F0-9]{8}$/', $splitFlock->getCode()) === 1,
            'Split flock code must contain random hex suffix to prevent collisions, got ' . $splitFlock->getCode()
        );
    }

    private static function testHealthStateTransitionsAndDirectStatusUpdateBlocked(): void
    {
        $farm = self::createTestFarm('Ferme Santé Transition');
        $flock = new Flock($farm, 'LOT-SANTE', 'Bande Santé', 500, new \DateTimeImmutable('2026-05-01'), PoultryType::BROILER);
        $user = new User('veto@lefermier.com', 'Dr', 'Veto');
        $item = new InventoryItem($farm, 'Vaccin Gumboro', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $item->setCurrentStock(20.0);

        $treatment = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Vaccination Gumboro J14',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 14,
            scheduledDate: new \DateTimeImmutable('2026-05-15'),
            inventoryItem: $item
        );

        $locks = [];
        $persisted = [];
        $em = self::createMockEntityManager($locks, $persisted);

        $treatmentRepo = (new \ReflectionClass(HealthTreatmentRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = new class extends FlockRepository { public function __construct() {} };
        $itemRepo = new class([$item->getId()?->toBase32() => $item]) extends InventoryItemRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };

        $service = new HealthService($treatmentRepo, $flockRepo, $itemRepo, $em);

        // 1. Rejet de la modification directe de statut par updateTreatment (faille 2.1)
        $statusRejected = false;
        try {
            $service->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                status: HealthTreatmentStatus::COMPLETED
            ));
        } catch (UnprocessableEntityHttpException) {
            $statusRejected = true;
        }
        assert($statusRejected, 'updateTreatment must reject direct status modification with 422');

        // 2. Rejet de la modification directe de administeredDate par updateTreatment
        $dateRejected = false;
        try {
            $service->updateTreatment($treatment, new UpdateHealthTreatmentRequestDto(
                administeredDate: '2026-05-15'
            ));
        } catch (UnprocessableEntityHttpException) {
            $dateRejected = true;
        }
        assert($dateRejected, 'updateTreatment must reject direct administeredDate modification with 422');

        // 3. Annulation propre via cancelTreatment
        $service->cancelTreatment($treatment, 'Annulation météo', $user);
        assert($treatment->getStatus() === HealthTreatmentStatus::CANCELLED);
        assert($item->getCurrentStock() === 20.0, 'Stock must not be deducted on cancellation');

        // 4. Nouveau traitement programmé pour tester la complétion avec le type HEALTH_CONSUMPTION
        $treatment2 = new HealthTreatment(
            farm: $farm,
            flock: $flock,
            title: 'Vaccination Gumboro J14 Lot 2',
            type: HealthTreatmentType::VACCINATION,
            administrationMethod: AdministrationMethod::DRINKING_WATER,
            targetAgeDays: 14,
            scheduledDate: new \DateTimeImmutable('2026-05-15'),
            inventoryItem: $item
        );

        $completed = $service->completeTreatment($treatment2, new CompleteHealthTreatmentRequestDto(
            administeredDate: '2026-05-15',
            quantityUsed: '5.0',
            inventoryItemId: $item->getId()?->toBase32()
        ), $user);

        assert($completed->getStatus() === HealthTreatmentStatus::COMPLETED);
        assert($item->getCurrentStock() === 15.0);

        // Vérification que le mouvement créé est de type HEALTH_CONSUMPTION et non FEEDING
        $healthMovement = null;
        foreach ($persisted as $p) {
            if ($p instanceof \App\Entity\StockMovement) {
                $healthMovement = $p;
                break;
            }
        }
        assert($healthMovement !== null, 'Stock movement must be created upon completing treatment with inventory');
        assert($healthMovement->getType() === StockMovementType::HEALTH_CONSUMPTION, 'Stock movement must have type HEALTH_CONSUMPTION');

        // 5. Tentative de suppression d'un traitement terminé -> ConflictHttpException
        $deleteBlocked = false;
        try {
            $service->deleteTreatment($treatment2);
        } catch (ConflictHttpException) {
            $deleteBlocked = true;
        }
        assert($deleteBlocked, 'deleteTreatment must block deletion of COMPLETED treatment with 409');
    }

    private static function testStockMovementHealthConsumptionForbiddenInManualEntry(): void
    {
        $farm = self::createTestFarm('Ferme Stock');
        $item = new InventoryItem($farm, 'Produit Test', InventoryCategory::VACCINE, InventoryUnit::VIAL);
        $item->setCurrentStock(10.0);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $itemRepo = new class([$item->getId()?->toBase32() => $item]) extends InventoryItemRepository {
            private array $map;
            public function __construct(array $map) { $this->map = $map; }
            public function find(mixed $id, LockMode|int|null $lockMode = null, ?int $lockVersion = null): ?object {
                $key = $id instanceof \Symfony\Component\Uid\Ulid ? $id->toBase32() : (string) $id;
                return $this->map[$key] ?? null;
            }
        };
        $movRepo = (new \ReflectionClass(StockMovementRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = new class extends FlockRepository { public function __construct() {} };

        $service = new InventoryService($itemRepo, $movRepo, $flockRepo, $em);

        $forbiddenCaught = false;
        try {
            $service->recordMovement($item, new CreateStockMovementRequestDto(
                type: StockMovementType::HEALTH_CONSUMPTION,
                quantity: 2.0,
                movementDate: '2026-11-06',
                reason: 'Saisie manuelle frauduleuse'
            ));
        } catch (UnprocessableEntityHttpException $e) {
            $forbiddenCaught = true;
            assert(str_contains($e->getMessage(), 'réservé aux processus métiers') || str_contains($e->getMessage(), 'HEALTH_CONSUMPTION'), 'Message must indicate system-only type');
        }
        assert($forbiddenCaught, 'Manual creation of HEALTH_CONSUMPTION movement must be rejected with 422');
    }

    private static function testCommercialPlanOrganizationPessimisticLock(): void
    {
        $org = new Organization('Org Quotas Strict', 'org-quotas-strict');
        $farm = new Farm($org, 'Ferme Quotas Strict');

        $locks = [];
        $conn = new class extends \Doctrine\DBAL\Connection {
            public function __construct() {}
            public function isTransactionActive(): bool { return true; }
        };
        $em = self::createMockEntityManager($locks, connection: $conn);

        $orgRepo = (new \ReflectionClass(OrganizationRepository::class))->newInstanceWithoutConstructor();
        $flockRepo = new class extends FlockRepository {
            public function __construct() {}
            public function createQueryBuilder(string $alias, ?string $indexBy = null): \Doctrine\ORM\QueryBuilder {
                return new class extends \Doctrine\ORM\QueryBuilder {
                    public function __construct() {}
                    public function select($s = null): static { return $this; }
                    public function where($w): static { return $this; }
                    public function andWhere($w): static { return $this; }
                    public function setParameter($p, $v, $t = null): static { return $this; }
                    public function getQuery(): \Doctrine\ORM\Query {
                        return new class extends \Doctrine\ORM\Query {
                            public function __construct() {}
                            public function getSingleScalarResult(): mixed { return 0; }
                        };
                    }
                };
            }
        };
        $planRepo = (new \ReflectionClass(SubscriptionPlanRepository::class))->newInstanceWithoutConstructor();

        $planService = new class($orgRepo, $flockRepo, $planRepo, $em) extends CommercialPlanService {
            public function getPlan(string $sku): ?array {
                return [
                    'sku' => $sku,
                    'name' => 'Formule Test',
                    'quotas' => [
                        'maxFlocks' => 10,
                        'maxBuildings' => 10,
                        'maxMembers' => 10,
                    ],
                ];
            }
        };

        $planService->assertCanCreateFlock($farm);
        $planService->assertCanCreateBuilding($farm);
        $planService->assertCanAddMember($farm);

        $orgLockedCount = 0;
        foreach ($locks as $lock) {
            if ($lock['entity'] === $org && $lock['lockMode'] === LockMode::PESSIMISTIC_WRITE) {
                $orgLockedCount++;
            }
        }
        assert($orgLockedCount === 3, 'assertCanCreateFlock, assertCanCreateBuilding, and assertCanAddMember must acquire PESSIMISTIC_WRITE lock on Organization (expected 3 locks, got ' . $orgLockedCount . ')');
    }

    private static function testFlockUpdateEnforcesActiveFlockQuotaWhenTransitioningToActive(): void
    {
        $farm = self::createTestFarm('Ferme Status Quota');
        $flock = new Flock($farm, 'LOT-DRAFT', 'Bande Draft', 100, new \DateTimeImmutable('2026-01-01'), PoultryType::BROILER);
        $flock->setStatus(FlockStatus::COMPLETED);

        $locks = [];
        $em = self::createMockEntityManager($locks);
        $flockRepo = new class extends FlockRepository { public function __construct() {} };
        $movRepo = (new \ReflectionClass(FlockMovementRepository::class))->newInstanceWithoutConstructor();
        $bldgRepo = new class extends BuildingRepository { public function __construct() {} };

        $quotaChecked = false;
        $planService = new class($quotaChecked) extends CommercialPlanService {
            private bool $checked;
            public function __construct(bool &$checked) { $this->checked = &$checked; }
            public function assertCanCreateFlock(Farm $farm): void {
                $this->checked = true;
            }
        };

        $service = new FlockService($flockRepo, $movRepo, $bldgRepo, $planService, $em);

        $service->updateFlock($flock, new UpdateFlockRequestDto(
            name: 'Bande Réactivée',
            status: FlockStatus::ACTIVE
        ));

        assert($quotaChecked === true, 'Transition to ACTIVE status via updateFlock must assert quota via CommercialPlanService');
        assert($flock->getStatus() === FlockStatus::ACTIVE);
    }
}

