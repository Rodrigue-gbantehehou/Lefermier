<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Contact\CreateContactRequestDto;
use App\Dto\Contact\UpdateContactRequestDto;
use App\Entity\Contact;
use App\Entity\Farm;
use App\Enum\ContactType;
use App\Repository\ContactRepository;
use App\Security\Voter\ContactVoter;
use App\Service\ContactService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class ContactController extends AbstractController
{
    public function __construct(
        private readonly ContactService $contactService,
        private readonly ContactRepository $contactRepository,
    ) {
    }

    #[Route('/api/farms/{id}/contacts', name: 'api_farms_contacts_list', methods: ['GET'])]
    #[IsGranted(ContactVoter::VIEW, subject: 'farm')]
    public function list(
        Farm $farm,
        Request $request,
    ): JsonResponse {
        $typeParam = $request->query->get('type');
        $searchParam = $request->query->get('search');
        $onlyActive = $request->query->getBoolean('onlyActive', true);

        $type = $typeParam !== null ? ContactType::tryFrom(strtoupper((string) $typeParam)) : null;

        $contacts = $this->contactRepository->findByFarm($farm, $type, $searchParam, $onlyActive);
        $serialized = array_map(fn (Contact $c) => $this->contactService->serializeContact($c), $contacts);

        return $this->json([
            'data' => $serialized,
            'meta' => [
                'totalItems' => count($serialized),
            ],
        ]);
    }

    #[Route('/api/farms/{id}/contacts', name: 'api_farms_contacts_create', methods: ['POST'])]
    #[IsGranted(ContactVoter::MANAGE, subject: 'farm')]
    public function create(
        Farm $farm,
        #[MapRequestPayload] CreateContactRequestDto $dto,
    ): JsonResponse {
        $contact = $this->contactService->createContact($farm, $dto);

        return $this->json([
            'data' => $this->contactService->serializeContact($contact),
        ], Response::HTTP_CREATED);
    }

    #[Route('/api/contacts/{id}', name: 'api_contacts_show', methods: ['GET'])]
    #[IsGranted(ContactVoter::VIEW, subject: 'contact')]
    public function show(Contact $contact): JsonResponse
    {
        return $this->json([
            'data' => $this->contactService->serializeContact($contact),
        ]);
    }

    #[Route('/api/contacts/{id}', name: 'api_contacts_update', methods: ['PUT'])]
    #[IsGranted(ContactVoter::MANAGE, subject: 'contact')]
    public function update(
        Contact $contact,
        #[MapRequestPayload] UpdateContactRequestDto $dto,
    ): JsonResponse {
        $updated = $this->contactService->updateContact($contact, $dto);

        return $this->json([
            'data' => $this->contactService->serializeContact($updated),
        ]);
    }

    #[Route('/api/contacts/{id}', name: 'api_contacts_delete', methods: ['DELETE'])]
    #[IsGranted(ContactVoter::DELETE, subject: 'contact')]
    public function delete(Contact $contact): JsonResponse
    {
        $this->contactService->deleteContact($contact);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
