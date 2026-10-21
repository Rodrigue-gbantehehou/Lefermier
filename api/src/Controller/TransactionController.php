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
use App\Service\PdfService;
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
        private readonly PdfService $pdfService,
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

    #[Route('/api/transactions/{id}/receipt/pdf', name: 'api_transactions_receipt_pdf', methods: ['GET'])]
    #[IsGranted(TransactionVoter::VIEW, subject: 'transaction')]
    public function receiptPdf(Transaction $transaction, Request $request): Response
    {
        $farm = $transaction->getFarm();
        $isDownload = $request->query->getBoolean('download', false);

        $ref = $transaction->getReference() ?? ('REC-' . strtoupper(substr((string) $transaction->getId(), -6)));
        $paymentStatus = $transaction->getPaymentStatus()->value;
        $isPartial = $paymentStatus === 'PARTIAL';
        $isUnpaid = $paymentStatus === 'UNPAID';

        $recipient = null;
        if ($transaction->getContact() !== null) {
            $contact = $transaction->getContact();
            $recipient = [
                'label' => 'Client / Revendeuse',
                'name' => $contact->getName(),
                'phone' => $contact->getPhone(),
                'address' => $contact->getAddress(),
                'email' => $contact->getEmail(),
            ];
        } else {
            $recipient = [
                'label' => 'Client / Acheteur',
                'name' => 'Vente directe au comptoir / Client passage',
            ];
        }

        $notes = $transaction->getDescription();
        if ($transaction->getRemainingAmount() > 0) {
            $dueNote = sprintf(
                "Modalités de règlement : Solde restant dû de %s FCFA.",
                number_format($transaction->getRemainingAmount(), 0, ',', ' ')
            );
            if ($transaction->getDueDate() !== null) {
                $dueNote .= sprintf(" Date limite d'échéance : %s.", $transaction->getDueDate()->format('d/m/Y'));
            }
            $notes = $notes ? ($notes . "\n" . $dueNote) : $dueNote;
        }

        return $this->pdfService->createPdfResponse(
            template: 'pdf/sales_receipt.html.twig',
            params: [
                'farm' => $farm,
                'transaction' => $transaction,
                'documentTitle' => 'Reçu de Vente Officiel',
                'documentSubtitle' => 'Pièce justificative d\'encaissement et de livraison avicole',
                'documentReference' => $ref,
                'documentDate' => $transaction->getTransactionDate()->format('d/m/Y'),
                'documentBadge' => $isPartial ? 'Acompte (Partiel)' : ($isUnpaid ? 'À Crédit (Non Réglé)' : 'Payé / Réglé 100%'),
                'badgeVariant' => $isPartial ? 'warning' : ($isUnpaid ? 'danger' : 'success'),
                'watermark' => $isPartial ? 'ACOMPTE' : ($isUnpaid ? 'À CRÉDIT' : 'PAYÉ'),
                'recipient' => $recipient,
                'notes' => $notes,
            ],
            filename: sprintf('recu-vente-%s.pdf', strtolower($ref)),
            inline: !$isDownload,
        );
    }
}
