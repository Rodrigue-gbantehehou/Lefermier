<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Contact;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\Transaction;
use App\Enum\PaymentStatus;
use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Transaction>
 */
class TransactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transaction::class);
    }

    /**
     * @return Transaction[]
     */
    public function findByFarm(
        Farm $farm,
        ?TransactionType $type = null,
        ?TransactionCategory $category = null,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
        ?Flock $flock = null,
        ?Contact $contact = null,
        ?int $limit = null,
    ): array {
        $qb = $this->createQueryBuilder('t')
            ->andWhere('t.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('t.contact', 'c')
            ->leftJoin('t.flock', 'f')
            ->leftJoin('t.recordedBy', 'u')
            ->addSelect('c', 'f', 'u')
            ->orderBy('t.transactionDate', 'DESC')
            ->addOrderBy('t.createdAt', 'DESC');

        if ($type !== null) {
            $qb->andWhere('t.type = :type')
                ->setParameter('type', $type);
        }

        if ($category !== null) {
            $qb->andWhere('t.category = :category')
                ->setParameter('category', $category);
        }

        if ($startDate !== null) {
            $qb->andWhere('t.transactionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('t.transactionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        if ($flock !== null) {
            $qb->andWhere('t.flock = :flock')
                ->setParameter('flock', $flock->getId(), 'ulid');
        }

        if ($contact !== null) {
            $qb->andWhere('t.contact = :contact')
                ->setParameter('contact', $contact->getId(), 'ulid');
        }

        if ($limit !== null && $limit > 0) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return Transaction[]
     */
    public function findUpdatedSince(Farm $farm, ?\DateTimeImmutable $since = null, int $limit = 500): array
    {
        $qb = $this->createQueryBuilder('t')
            ->andWhere('t.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->leftJoin('t.contact', 'c')
            ->leftJoin('t.flock', 'f')
            ->leftJoin('t.recordedBy', 'u')
            ->addSelect('c', 'f', 'u')
            ->orderBy('t.updatedAt', 'ASC')
            ->setMaxResults($limit);

        if ($since !== null) {
            $qb->andWhere('t.updatedAt > :since')
                ->setParameter('since', $since);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Calcule la balance financière en distinguant la comptabilité d'engagement (montants facturés/enregistrés)
     * et la trésorerie réelle (encaissements et décaissements effectifs) en FCFA.
     *
     * @return array{
     *     totalIncome: int,
     *     collectedIncome: int,
     *     receivablesAmount: int,
     *     totalExpense: int,
     *     paidExpense: int,
     *     payablesAmount: int,
     *     netBalance: int,
     *     cashBalance: int,
     *     transactionsCount: int
     * }
     */
    public function getFinancialSummary(
        Farm $farm,
        ?\DateTimeImmutable $startDate = null,
        ?\DateTimeImmutable $endDate = null,
        ?Flock $flock = null,
    ): array {
        $qb = $this->createQueryBuilder('t')
            ->select(
                "COALESCE(SUM(CASE WHEN t.type = :incomeType THEN t.amount ELSE 0 END), 0) AS totalIncome",
                "COALESCE(SUM(CASE WHEN t.type = :expenseType THEN t.amount ELSE 0 END), 0) AS totalExpense",
                "COALESCE(SUM(CASE WHEN t.type = :incomeType THEN (CASE WHEN t.paidAmount IS NOT NULL THEN t.paidAmount WHEN t.paymentStatus = :unpaidStatus THEN 0 ELSE t.amount END) ELSE 0 END), 0) AS collectedIncome",
                "COALESCE(SUM(CASE WHEN t.type = :expenseType THEN (CASE WHEN t.paidAmount IS NOT NULL THEN t.paidAmount WHEN t.paymentStatus = :unpaidStatus THEN 0 ELSE t.amount END) ELSE 0 END), 0) AS paidExpense",
                "COUNT(t.id) AS transactionsCount"
            )
            ->andWhere('t.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->setParameter('incomeType', TransactionType::INCOME)
            ->setParameter('expenseType', TransactionType::EXPENSE)
            ->setParameter('unpaidStatus', PaymentStatus::UNPAID);

        if ($startDate !== null) {
            $qb->andWhere('t.transactionDate >= :startDate')
                ->setParameter('startDate', $startDate->format('Y-m-d'));
        }

        if ($endDate !== null) {
            $qb->andWhere('t.transactionDate <= :endDate')
                ->setParameter('endDate', $endDate->format('Y-m-d'));
        }

        if ($flock !== null) {
            $qb->andWhere('t.flock = :flock')
                ->setParameter('flock', $flock->getId(), 'ulid');
        }

        $row = $qb->getQuery()->getSingleResult();

        $income = (int) $row['totalIncome'];
        $expense = (int) $row['totalExpense'];
        $collectedIncome = min($income, max(0, (int) $row['collectedIncome']));
        $paidExpense = min($expense, max(0, (int) $row['paidExpense']));

        return [
            'totalIncome' => $income,
            'collectedIncome' => $collectedIncome,
            'receivablesAmount' => max(0, $income - $collectedIncome),
            'totalExpense' => $expense,
            'paidExpense' => $paidExpense,
            'payablesAmount' => max(0, $expense - $paidExpense),
            'netBalance' => $income - $expense,
            'cashBalance' => $collectedIncome - $paidExpense,
            'transactionsCount' => (int) $row['transactionsCount'],
        ];
    }
}
