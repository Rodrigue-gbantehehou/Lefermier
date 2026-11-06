<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Dto\Flock\CreateFlockMovementRequestDto;
use App\Dto\Inventory\CreateStockMovementRequestDto;
use App\Dto\Inventory\UpdateInventoryItemRequestDto;
use App\Dto\Transaction\UpdateTransactionRequestDto;
use App\Entity\ApiKey;
use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\IdempotencyRecord;
use App\Entity\InventoryItem;
use App\Entity\Organization;
use App\Entity\Transaction;
use App\Entity\User;
use App\Enum\BuildingType;
use App\Enum\FlockMovementType;
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
use App\Repository\FlockMovementRepository;
use App\Repository\FlockRepository;
use App\Repository\InventoryItemRepository;
use App\Repository\StockMovementRepository;
use App\Security\ApiKeySecurityChecker;
use App\Security\Permission;
use App\Service\Admin\CommercialPlanService;
use App\Service\FlockService;
use App\Service\InventoryService;
use App\Service\TransactionService;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

/**
 * Suite de vérification ciblée couvrant les 8 points de l'audit backend :
 * 1. Verrouillage pessimiste (PESSIMISTIC_WRITE) sur les mouvements et mises à jour de stock
 * 2. Verrouillage pessimiste (PESSIMISTIC_WRITE) sur les mouvements et mises à jour d'effectif de bande
 * 3. Conversion automatique et encadrement des changements d'unité d'articles déjà en stock
 * 4. Transferts de bandes entre bâtiments avec contrôle d'appartenance et historique source/cible
 * 5. Séparation stricte de la mortalité naturelle, des réformes, des ventes et des ajustements
 * 6. Mise à jour et réconciliation automatique des paiements lors de la modification de transactions
 */
final class AuditFixesVerificationTest
{
    public static function runAll(): void
    {
        self::testInventoryConcurrencyLocking();
        self::testFlockConcurrencyLocking();
        self::testInventoryUnitConversionAndProtection();
        self::testFlockTransferWithHistoryAndValidation();
        self::testFlockMortalityVsSalesAndCullingRates();
        self::testTransactionUpdateAndPaymentReconciliation();
        self::testApiKeyScopeEnforcement();
        self::testIdempotencyLockRenewal();
        self::testGranularPermissionsMatrix();

        echo "ALL AUDIT VERIFICATION TESTS PASSED SUCCESSFULLY.\n";
    }

    private static function createTestFarm(string $name = 'Ferme Test'): Farm
    {
        $org = new Organization('Org Test', 'org-test-' . uniqid());
        return new Farm($org, $name);
    }

    private static function createMockEntityManager(array &$lockedEntities): EntityManagerInterface
    {
        return new class($lockedEntities) implements EntityManagerInterface {
            /** @var array<int, array{entity: object, lockMode: mixed}> */
            private array $locks;

            public function __construct(array &$lockedEntities)
            {
                $this->locks = &$lockedEntities;
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
                throw new \BadMethodCallException();
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

        // Ajustement d'inventaire à 175 (+5 sujets)
        $service->recordMovement($flock, new CreateFlockMovementRequestDto(FlockMovementType::ADJUSTMENT, 175, '2026-11-02'));
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
}
