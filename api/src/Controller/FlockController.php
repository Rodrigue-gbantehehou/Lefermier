<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Flock\CreateFlockMovementRequestDto;
use App\Dto\Flock\CreateFlockRequestDto;
use App\Dto\Flock\UpdateFlockRequestDto;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\User;
use App\Enum\FlockStatus;
use App\Repository\EggProductionRepository;
use App\Repository\FlockRepository;
use App\Repository\TransactionRepository;
use App\Security\Voter\FarmVoter;
use App\Security\Voter\FlockVoter;
use App\Service\FlockService;
use App\Service\PdfService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class FlockController extends AbstractController
{
    public function __construct(
        private readonly FlockService $flockService,
        private readonly FlockRepository $flockRepository,
        private readonly TransactionRepository $transactionRepository,
        private readonly EggProductionRepository $eggProductionRepository,
        private readonly PdfService $pdfService,
    ) {
    }

    #[Route('/api/farms/{id}/flocks', name: 'api_farms_flocks_list', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function list(
        Farm $farm,
        Request $request,
    ): JsonResponse {
        $statusParam = $request->query->get('status');
        $status = null;
        if ($statusParam !== null) {
            $status = FlockStatus::tryFrom(strtoupper((string) $statusParam));
        }

        $flocks = $this->flockRepository->findByFarm($farm, $status);
        $serialized = array_map(fn (Flock $f) => $this->flockService->serializeFlock($f), $flocks);

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
            ],
        ]);
    }

    #[Route('/api/farms/{id}/flocks', name: 'api_farms_flocks_create', methods: ['POST'])]
    #[IsGranted(FarmVoter::EDIT, subject: 'farm')]
    public function create(
        Farm $farm,
        #[MapRequestPayload] CreateFlockRequestDto $dto,
    ): JsonResponse {
        $flock = $this->flockService->createFlock($farm, $dto);

        return $this->json([
            'data' => $this->flockService->serializeFlock($flock),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/flocks/{id}', name: 'api_flocks_show', methods: ['GET'])]
    #[IsGranted(FlockVoter::VIEW, subject: 'flock')]
    public function show(
        Flock $flock,
    ): JsonResponse {
        return $this->json([
            'data' => $this->flockService->serializeFlock($flock, includeMovements: true),
        ]);
    }

    #[Route('/api/flocks/{id}', name: 'api_flocks_update', methods: ['PUT'])]
    #[IsGranted(FlockVoter::EDIT, subject: 'flock')]
    public function update(
        Flock $flock,
        #[MapRequestPayload] UpdateFlockRequestDto $dto,
    ): JsonResponse {
        $updatedFlock = $this->flockService->updateFlock($flock, $dto);

        return $this->json([
            'data' => $this->flockService->serializeFlock($updatedFlock),
        ]);
    }

    #[Route('/api/flocks/{id}/movements', name: 'api_flocks_movements_create', methods: ['POST'])]
    #[IsGranted(FlockVoter::MOVE, subject: 'flock')]
    public function recordMovement(
        Flock $flock,
        #[MapRequestPayload] CreateFlockMovementRequestDto $dto,
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        $movement = $this->flockService->recordMovement($flock, $dto, $user);

        return $this->json([
            'data' => [
                'movement' => $this->flockService->serializeMovement($movement),
                'flock' => $this->flockService->serializeFlock($flock),
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/flocks/{id}/movements', name: 'api_flocks_movements_list', methods: ['GET'])]
    #[IsGranted(FlockVoter::VIEW, subject: 'flock')]
    public function listMovements(
        Flock $flock,
    ): JsonResponse {
        $movements = array_map(
            fn ($m) => $this->flockService->serializeMovement($m),
            $flock->getMovements()->toArray()
        );

        return $this->json([
            'data' => $movements,
            'meta' => [
                'totalItems' => count($movements),
            ],
        ]);
    }

    #[Route('/api/flocks/{id}/report/pdf', name: 'api_flocks_report_pdf', methods: ['GET'])]
    #[IsGranted(FlockVoter::VIEW, subject: 'flock')]
    public function reportPdf(Flock $flock, Request $request): Response
    {
        $farm = $flock->getFarm();
        $isDownload = $request->query->getBoolean('download', false);

        $financialSummary = $this->transactionRepository->getFinancialSummary(
            farm: $farm,
            flock: $flock
        );

        $eggStats = null;
        if ($flock->getPoultryType()->value === 'LAYER') {
            $eggStats = $this->eggProductionRepository->getSummaryStats($flock);
        }

        $isClosed = $flock->getStatus() === FlockStatus::COMPLETED;
        $ref = 'BIL-' . ($flock->getCode() ?: strtoupper(substr((string) $flock->getId(), -6)));

        return $this->pdfService->createPdfResponse(
            template: 'pdf/flock_summary.html.twig',
            params: [
                'farm' => $farm,
                'flock' => $flock,
                'financialSummary' => $financialSummary,
                'eggStats' => $eggStats,
                'documentTitle' => 'Bilan de Bande Avicole',
                'documentSubtitle' => sprintf('Synthèse zootechnique & compte d\'exploitation — Lot %s', $flock->getName()),
                'documentReference' => $ref,
                'documentDate' => (new \DateTimeImmutable())->format('d/m/Y'),
                'documentBadge' => $isClosed ? 'Lot Clôturé / Réformé' : 'Actif en Production',
                'badgeVariant' => $isClosed ? 'neutral' : 'success',
                'watermark' => $isClosed ? 'CLÔTURÉ' : 'ACTIF',
                'notes' => $flock->getNotes() ?: "Lot conduit selon le calendrier prophylactique standard de l'exploitation. Performances conformes aux fiches techniques de la souche.",
            ],
            filename: sprintf('bilan-bande-%s.pdf', strtolower($flock->getCode() ?: 'lot')),
            inline: !$isDownload,
        );
    }
}
