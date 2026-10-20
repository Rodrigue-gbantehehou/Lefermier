<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Health\CompleteHealthTreatmentRequestDto;
use App\Dto\Health\CreateHealthTreatmentRequestDto;
use App\Dto\Health\GenerateProphylaxisProgramRequestDto;
use App\Dto\Health\UpdateHealthTreatmentRequestDto;
use App\Entity\Farm;
use App\Entity\HealthTreatment;
use App\Entity\User;
use App\Enum\HealthTreatmentStatus;
use App\Repository\FlockRepository;
use App\Repository\HealthTreatmentRepository;
use App\Security\Voter\HealthTreatmentVoter;
use App\Service\HealthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Ulid;

class HealthController extends AbstractController
{
    public function __construct(
        private readonly HealthService $healthService,
        private readonly HealthTreatmentRepository $treatmentRepository,
        private readonly FlockRepository $flockRepository,
    ) {
    }

    #[Route('/api/farms/{id}/health-treatments', name: 'api_farms_health_treatments_list', methods: ['GET'])]
    #[IsGranted(HealthTreatmentVoter::VIEW, subject: 'farm')]
    public function list(
        Farm $farm,
        Request $request
    ): JsonResponse {
        $flockIdParam = $request->query->get('flockId');
        $statusParam = $request->query->get('status');
        $fromParam = $request->query->get('from');
        $toParam = $request->query->get('to');

        $flock = null;
        if ($flockIdParam !== null) {
            $flock = $this->flockRepository->find(Ulid::fromString($flockIdParam));
        }

        $status = null;
        if ($statusParam !== null) {
            $status = HealthTreatmentStatus::tryFrom(strtoupper((string) $statusParam));
        }

        $from = $fromParam !== null ? new \DateTimeImmutable((string) $fromParam) : null;
        $to = $toParam !== null ? new \DateTimeImmutable((string) $toParam) : null;

        $treatments = $this->treatmentRepository->findByFarm($farm, $flock, $status, $from, $to);
        $overdueTreatments = $this->treatmentRepository->findOverdueTreatments($farm);
        $upcomingTreatments = $this->treatmentRepository->findUpcomingTreatments($farm, 5);

        $serialized = array_map(
            fn (HealthTreatment $t) => $this->healthService->serializeTreatment($t),
            $treatments
        );

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
                'overdueCount' => count($overdueTreatments),
                'upcomingCount' => count($upcomingTreatments),
            ],
        ]);
    }

    #[Route('/api/farms/{id}/health-treatments', name: 'api_farms_health_treatments_create', methods: ['POST'])]
    #[IsGranted(HealthTreatmentVoter::CREATE, subject: 'farm')]
    public function create(
        Farm $farm,
        #[MapRequestPayload] CreateHealthTreatmentRequestDto $dto,
        #[CurrentUser] User $user
    ): JsonResponse {
        $treatment = $this->healthService->createTreatment($farm, $dto, $user);

        return $this->json([
            'data' => $this->healthService->serializeTreatment($treatment),
            'message' => 'Soin / vaccin planifié avec succès.',
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/farms/{id}/health-treatments/generate-program', name: 'api_farms_health_generate_program', methods: ['POST'])]
    #[IsGranted(HealthTreatmentVoter::CREATE, subject: 'farm')]
    public function generateProgram(
        Farm $farm,
        #[MapRequestPayload] GenerateProphylaxisProgramRequestDto $dto,
        #[CurrentUser] User $user
    ): JsonResponse {
        $flock = $this->flockRepository->find(Ulid::fromString($dto->flockId));
        if ($flock === null || $flock->getFarm()->getId()?->toBase32() !== $farm->getId()?->toBase32()) {
            return $this->json(['message' => "La bande spécifiée n'existe pas dans cette exploitation."], Response::HTTP_NOT_FOUND);
        }

        $treatments = $this->healthService->generateStandardProgram($farm, $flock, $user, $dto->programType);

        $serialized = array_map(
            fn (HealthTreatment $t) => $this->healthService->serializeTreatment($t),
            $treatments
        );

        return $this->json([
            'data' => $serialized,
            'message' => sprintf('Programme prophylactique généré avec succès (%d interventions planifiées).', count($treatments)),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/health-treatments/{id}', name: 'api_health_treatments_show', methods: ['GET'])]
    #[IsGranted(HealthTreatmentVoter::VIEW, subject: 'treatment')]
    public function show(HealthTreatment $treatment): JsonResponse
    {
        return $this->json([
            'data' => $this->healthService->serializeTreatment($treatment),
        ]);
    }

    #[Route('/api/health-treatments/{id}', name: 'api_health_treatments_update', methods: ['PUT'])]
    #[IsGranted(HealthTreatmentVoter::EDIT, subject: 'treatment')]
    public function update(
        HealthTreatment $treatment,
        #[MapRequestPayload] UpdateHealthTreatmentRequestDto $dto
    ): JsonResponse {
        $updated = $this->healthService->updateTreatment($treatment, $dto);

        return $this->json([
            'data' => $this->healthService->serializeTreatment($updated),
            'message' => 'Intervention mise à jour avec succès.',
        ]);
    }

    #[Route('/api/health-treatments/{id}/complete', name: 'api_health_treatments_complete', methods: ['POST'])]
    #[IsGranted(HealthTreatmentVoter::COMPLETE, subject: 'treatment')]
    public function complete(
        HealthTreatment $treatment,
        #[MapRequestPayload] CompleteHealthTreatmentRequestDto $dto,
        #[CurrentUser] User $user
    ): JsonResponse {
        $completed = $this->healthService->completeTreatment($treatment, $dto, $user);

        return $this->json([
            'data' => $this->healthService->serializeTreatment($completed),
            'message' => 'Soin / vaccin enregistré comme administré.',
        ]);
    }

    #[Route('/api/health-treatments/{id}', name: 'api_health_treatments_delete', methods: ['DELETE'])]
    #[IsGranted(HealthTreatmentVoter::DELETE, subject: 'treatment')]
    public function delete(HealthTreatment $treatment): JsonResponse
    {
        $this->healthService->deleteTreatment($treatment);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
