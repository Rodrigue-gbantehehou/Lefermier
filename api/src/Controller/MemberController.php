<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Member\CreateMemberRequestDto;
use App\Dto\Member\UpdateMemberRequestDto;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Repository\FarmMembershipRepository;
use App\Security\Voter\FarmVoter;
use App\Service\MemberService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/farms/{id}/members', name: 'api_farm_members_')]
class MemberController extends AbstractController
{
    public function __construct(
        private readonly MemberService $memberService,
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(FarmVoter::VIEW, subject: 'farm')]
    public function list(Farm $farm): JsonResponse
    {
        $members = $this->memberService->getMembersForFarm($farm);

        return $this->json([
            'status' => 'success',
            'data' => $members,
        ]);
    }

    #[Route('', name: 'add', methods: ['POST'])]
    #[IsGranted(FarmVoter::MANAGE_MEMBERS, subject: 'farm')]
    public function add(
        Farm $farm,
        #[MapRequestPayload] CreateMemberRequestDto $dto,
    ): JsonResponse {
        $membership = $this->memberService->addMember($farm, $dto);

        return $this->json([
            'status' => 'success',
            'message' => 'Collaborateur ajouté avec succès à l\'exploitation.',
            'data' => $this->memberService->serializeMember($membership),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{membershipId}', name: 'update', methods: ['PUT'])]
    #[IsGranted(FarmVoter::MANAGE_MEMBERS, subject: 'farm')]
    public function update(
        Farm $farm,
        string $membershipId,
        #[MapRequestPayload] UpdateMemberRequestDto $dto,
    ): JsonResponse {
        $membership = $this->membershipRepository->find($membershipId);
        if (!$membership instanceof FarmMembership || $membership->getFarm()->getId()?->toRfc4122() !== $farm->getId()?->toRfc4122()) {
            return $this->json([
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Collaborateur introuvable pour cette exploitation.',
            ], Response::HTTP_NOT_FOUND);
        }

        $updated = $this->memberService->updateMember($membership, $dto);

        return $this->json([
            'status' => 'success',
            'message' => 'Rôle et statut du collaborateur mis à jour avec succès.',
            'data' => $this->memberService->serializeMember($updated),
        ]);
    }

    #[Route('/{membershipId}', name: 'delete', methods: ['DELETE'])]
    #[IsGranted(FarmVoter::MANAGE_MEMBERS, subject: 'farm')]
    public function delete(
        Farm $farm,
        string $membershipId,
    ): JsonResponse {
        $membership = $this->membershipRepository->find($membershipId);
        if (!$membership instanceof FarmMembership || $membership->getFarm()->getId()?->toRfc4122() !== $farm->getId()?->toRfc4122()) {
            return $this->json([
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Collaborateur introuvable pour cette exploitation.',
            ], Response::HTTP_NOT_FOUND);
        }

        $this->memberService->removeMember($membership);

        return $this->json([
            'status' => 'success',
            'message' => 'Collaborateur dissocié de l\'exploitation avec succès.',
        ]);
    }
}
