<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Transaction\CreateTransactionRequestDto;
use App\Dto\Transaction\UpdateTransactionRequestDto;
use App\Entity\Contact;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\Transaction;
use App\Entity\User;
use App\Exception\CategoryTypeMismatchException;
use App\Repository\ContactRepository;
use App\Repository\FlockRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Ulid;

class TransactionService
{
    public function __construct(
        private readonly ContactRepository $contactRepository,
        private readonly FlockRepository $flockRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function recordTransaction(
        Farm $farm,
        CreateTransactionRequestDto $dto,
        ?User $recordedBy = null,
    ): Transaction {
        // 1. Règle métier : cohérence entre catégorie et type de flux
        if ($dto->category->getType() !== $dto->type) {
            throw new CategoryTypeMismatchException($dto->category, $dto->type);
        }

        // 2. Vérification du tiers (Contact) s'il est spécifié
        $contact = null;
        if ($dto->contactId !== null) {
            $contact = $this->contactRepository->find(Ulid::fromString($dto->contactId));
            if ($contact === null || $contact->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("Le contact spécifié n'existe pas dans cette exploitation.");
            }
        }

        // 3. Vérification de la bande (Flock) si elle est spécifiée
        $flock = null;
        if ($dto->flockId !== null) {
            $flock = $this->flockRepository->find(Ulid::fromString($dto->flockId));
            if ($flock === null || $flock->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("La bande spécifiée n'existe pas dans cette exploitation.");
            }
        }

        $transactionDate = new \DateTimeImmutable($dto->transactionDate);

        $transaction = new Transaction(
            $farm,
            $dto->type,
            $dto->category,
            $dto->amount,
            $transactionDate,
            $dto->paymentMethod,
            $dto->reference,
            $dto->description,
            $contact,
            $flock,
            $recordedBy
        );

        $this->entityManager->persist($transaction);
        $this->entityManager->flush();

        return $transaction;
    }

    public function updateTransaction(
        Transaction $transaction,
        UpdateTransactionRequestDto $dto,
    ): Transaction {
        if ($dto->category->getType() !== $dto->type) {
            throw new CategoryTypeMismatchException($dto->category, $dto->type);
        }

        $farm = $transaction->getFarm();

        $contact = null;
        if ($dto->contactId !== null) {
            $contact = $this->contactRepository->find(Ulid::fromString($dto->contactId));
            if ($contact === null || $contact->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("Le contact spécifié n'existe pas dans cette exploitation.");
            }
        }

        $flock = null;
        if ($dto->flockId !== null) {
            $flock = $this->flockRepository->find(Ulid::fromString($dto->flockId));
            if ($flock === null || $flock->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
                throw new NotFoundHttpException("La bande spécifiée n'existe pas dans cette exploitation.");
            }
        }

        $transactionDate = new \DateTimeImmutable($dto->transactionDate);

        $transaction->setType($dto->type);
        $transaction->setCategory($dto->category);
        $transaction->setAmount($dto->amount);
        $transaction->setTransactionDate($transactionDate);
        $transaction->setPaymentMethod($dto->paymentMethod);
        $transaction->setReference($dto->reference);
        $transaction->setDescription($dto->description);
        $transaction->setContact($contact);
        $transaction->setFlock($flock);

        $this->entityManager->flush();

        return $transaction;
    }

    public function deleteTransaction(Transaction $transaction): void
    {
        $this->entityManager->remove($transaction);
        $this->entityManager->flush();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeTransaction(Transaction $t): array
    {
        return [
            'id' => $t->getId()?->toBase32(),
            'farmId' => $t->getFarm()->getId()?->toBase32(),
            'type' => $t->getType()->value,
            'category' => $t->getCategory()->value,
            'amount' => $t->getAmount(),
            'currency' => $t->getFarm()->getCurrency(),
            'paymentMethod' => $t->getPaymentMethod()->value,
            'transactionDate' => $t->getTransactionDate()->format('Y-m-d'),
            'reference' => $t->getReference(),
            'description' => $t->getDescription(),
            'contact' => $t->getContact() !== null ? [
                'id' => $t->getContact()->getId()?->toBase32(),
                'name' => $t->getContact()->getName(),
                'type' => $t->getContact()->getType()->value,
                'phone' => $t->getContact()->getPhone(),
            ] : null,
            'flock' => $t->getFlock() !== null ? [
                'id' => $t->getFlock()->getId()?->toBase32(),
                'code' => $t->getFlock()->getCode(),
                'name' => $t->getFlock()->getName(),
            ] : null,
            'recordedBy' => $t->getRecordedBy() !== null ? [
                'id' => $t->getRecordedBy()->getId()?->toBase32(),
                'fullName' => $t->getRecordedBy()->getFullName(),
                'email' => $t->getRecordedBy()->getEmail(),
            ] : null,
            'createdAt' => $t->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $t->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
