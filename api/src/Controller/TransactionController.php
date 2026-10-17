<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Transaction\CreateTransactionRequestDto;
use App\Dto\Transaction\UpdateTransactionRequestDto;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\Transaction;
use App\Entity\User;
use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use App\Repository\ContactRepository;
use App\Repository\FlockRepository;
use App\Repository\TransactionRepository;
use App\Security\Voter\FlockVoter;
use App\Security\Voter\TransactionVoter;
use App\Service\TransactionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Ulid;

class TransactionController extends AbstractController
{
    public function __construct(
        private readonly TransactionService $transactionService,
        private readonly TransactionRepository $transactionRepository,
        private readonly ContactRepository $contactRepository,
        private readonly FlockRepository $flockRepository,
    ) {
    }

    #[Route('/api/farms/{id}/transactions', name: 'api_farms_transactions_list', methods: ['GET'])]
    #[IsGranted(TransactionVoter::VIEW, subject: 'farm')]
    public function list(
        Farm $farm,
        Request $request,
    ): JsonResponse {
        $typeParam = $request->query->get('type');
        $categoryParam = $request->query->get('category');
        $startDateParam = $request->query->get('startDate');
        $endDateParam = $request->query->get('endDate');
        $contactIdParam = $request->query->get('contactId');
        $flockIdParam = $request->query->get('flockId');

        $type = $typeParam !== null ? TransactionType::tryFrom(strtoupper((string) $typeParam)) : null;
        $category = $categoryParam !== null ? TransactionCategory::tryFrom(strtoupper((string) $categoryParam)) : null;
        $startDate = $startDateParam !== null ? new \DateTimeImmutable((string) $startDateParam) : null;
        $endDate = $endDateParam !== null ? new \DateTimeImmutable((string) $endDateParam) : null;

        $contact = $contactIdParam !== null ? $this->contactRepository->find(Ulid::fromString($contactIdParam)) : null;
        $flock = $flockIdParam !== null ? $this->flockRepository->find(Ulid::fromString($flockIdParam)) : null;

        $transactions = $this->transactionRepository->findByFarm(
            $farm,
            $type,
            $category,
            $startDate,
            $endDate,
            $flock,
            $contact
        );

        $summary = $this->transactionRepository->getFinancialSummary(
            $farm,
            $startDate,
            $endDate,
            $flock
        );

        $serialized = array_map(
            fn (Transaction $t) => $this->transactionService->serializeTransaction($t),
            $transactions
        );

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
                'summary' => array_merge($summary, [
                    'currency' => $farm->getCurrency(),
                ]),
            ],
        ]);
    }

    #[Route('/api/farms/{id}/transactions', name: 'api_farms_transactions_create', methods: ['POST'])]
    #[IsGranted(TransactionVoter::RECORD, subject: 'farm')]
    public function create(
        Farm $farm,
        #[MapRequestPayload] CreateTransactionRequestDto $dto,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $transaction = $this->transactionService->recordTransaction($farm, $dto, $user);

        return $this->json([
            'data' => $this->transactionService->serializeTransaction($transaction),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/transactions/{id}', name: 'api_transactions_show', methods: ['GET'])]
    #[IsGranted(TransactionVoter::VIEW, subject: 'transaction')]
    public function show(Transaction $transaction): JsonResponse
    {
        return $this->json([
            'data' => $this->transactionService->serializeTransaction($transaction),
        ]);
    }

    #[Route('/api/transactions/{id}', name: 'api_transactions_update', methods: ['PUT'])]
    #[IsGranted(TransactionVoter::EDIT, subject: 'transaction')]
    public function update(
        Transaction $transaction,
        #[MapRequestPayload] UpdateTransactionRequestDto $dto,
    ): JsonResponse {
        $updated = $this->transactionService->updateTransaction($transaction, $dto);

        return $this->json([
            'data' => $this->transactionService->serializeTransaction($updated),
        ]);
    }

    #[Route('/api/transactions/{id}', name: 'api_transactions_delete', methods: ['DELETE'])]
    #[IsGranted(TransactionVoter::DELETE, subject: 'transaction')]
    public function delete(Transaction $transaction): JsonResponse
    {
        $this->transactionService->deleteTransaction($transaction);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/api/flocks/{id}/transactions', name: 'api_flocks_transactions_list', methods: ['GET'])]
    #[IsGranted(FlockVoter::VIEW, subject: 'flock')]
    public function listForFlock(Flock $flock): JsonResponse
    {
        $transactions = $this->transactionRepository->findByFarm(
            farm: $flock->getFarm(),
            flock: $flock
        );

        $summary = $this->transactionRepository->getFinancialSummary(
            farm: $flock->getFarm(),
            flock: $flock
        );

        $serialized = array_map(
            fn (Transaction $t) => $this->transactionService->serializeTransaction($t),
            $transactions
        );

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
                'summary' => array_merge($summary, [
                    'currency' => $flock->getFarm()->getCurrency(),
                    'grossMargin' => $summary['netBalance'],
                ]),
            ],
        ]);
    }
}
