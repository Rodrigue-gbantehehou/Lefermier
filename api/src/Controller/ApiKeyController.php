<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\ApiKey\CreateApiKeyRequestDto;
use App\Entity\ApiKey;
use App\Entity\Farm;
use App\Entity\User;
use App\Repository\ApiKeyRepository;
use App\Security\Voter\ApiKeyVoter;
use App\Service\ApiKeyService;
use App\Service\IdempotencyService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/farms/{id}/api-keys', name: 'api_farm_api_keys_')]
class ApiKeyController extends AbstractController
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService,
        private readonly ApiKeyRepository $apiKeyRepository,
        private readonly IdempotencyService $idempotencyService,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    #[IsGranted(ApiKeyVoter::MANAGE, subject: 'farm')]
    public function list(Farm $farm): JsonResponse
    {
        $keys = $this->apiKeyService->getApiKeysForFarm($farm);
        $data = array_map(fn (ApiKey $k) => $this->apiKeyService->serializeApiKey($k), $keys);

        return $this->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted(ApiKeyVoter::MANAGE, subject: 'farm')]
    public function create(
        Farm $farm,
        Request $request,
        #[CurrentUser] User $user,
        #[MapRequestPayload] CreateApiKeyRequestDto $dto,
    ): Response {
        $idempotencyKey = IdempotencyService::requireKey($request, 'créer une clé API');

        return $this->idempotencyService->process(
            $idempotencyKey,
            $user,
            $request,
            $farm,
            function () use ($farm, $user, $dto): JsonResponse {
                $result = $this->apiKeyService->createApiKey($farm, $user, $dto);

                return $this->json([
                    'status' => 'success',
                    'message' => 'Clé API générée avec succès.',
                    'data' => $this->apiKeyService->serializeApiKey($result['apiKey'], $result['rawKey']),
                ], Response::HTTP_CREATED);
            },
            responseFilter: function (string $jsonContent): string {
                $data = json_decode($jsonContent, true);
                if (is_array($data) && isset($data['data']['rawKey'])) {
                    $data['data']['rawKey'] = null;
                    $data['data']['secretAlreadyIssued'] = true;
                    $data['data']['warning'] = 'Cette clé API a déjà été générée lors d\'une requête précédente. Pour des raisons de sécurité, le secret n\'est affiché qu\'une seule fois.';

                    return (string) json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }

                return $jsonContent;
            }
        );
    }

    #[Route('/{keyId}', name: 'revoke', methods: ['DELETE'])]
    public function revoke(
        Farm $farm,
        string $keyId,
    ): JsonResponse {
        $apiKey = $this->apiKeyRepository->find($keyId);
        if (!$apiKey instanceof ApiKey || $apiKey->getFarm()->getId()->toRfc4122() !== $farm->getId()->toRfc4122()) {
            return $this->json([
                'code' => Response::HTTP_NOT_FOUND,
                'message' => 'Clé API introuvable pour cette exploitation.',
            ], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(ApiKeyVoter::MANAGE, $apiKey);

        $this->apiKeyService->revokeApiKey($apiKey);

        return $this->json([
            'status' => 'success',
            'message' => 'Clé API révoquée avec succès.',
        ]);
    }
}
