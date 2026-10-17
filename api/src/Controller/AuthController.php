<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Auth\RegisterRequestDto;
use App\Entity\User;
use App\Service\AuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/auth', name: 'api_auth_')]
class AuthController extends AbstractController
{
    public function __construct(
        private readonly AuthService $authService,
    ) {
    }

    #[Route('/register', name: 'register', methods: ['POST'])]
    public function register(
        #[MapRequestPayload] RegisterRequestDto $dto,
    ): JsonResponse {
        $result = $this->authService->register($dto);

        /** @var User $user */
        $user = $result['user'];
        /** @var Farm|null $farm */
        $farm = $result['farm'];

        return $this->json([
            'data' => [
                'token' => $result['token'],
                'user' => [
                    'id' => $user->getId()?->toBase32(),
                    'email' => $user->getEmail(),
                    'firstName' => $user->getFirstName(),
                    'lastName' => $user->getLastName(),
                    'fullName' => $user->getFullName(),
                ],
                'farm' => $farm !== null ? [
                    'id' => $farm->getId()?->toBase32(),
                    'name' => $farm->getName(),
                    'productionType' => $farm->getProductionType()->value,
                    'currency' => $farm->getCurrency(),
                ] : null,
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(): void
    {
        // Géré automatiquement par le firewall JSON Login de LexikJWTAuthenticationBundle
        throw new \LogicException('Cette méthode ne doit pas être appelée directement.');
    }

    #[Route('/me', name: 'me', methods: ['GET'])]
    public function me(
        #[CurrentUser] ?User $user,
    ): JsonResponse {
        if ($user === null) {
            return $this->json([
                'title' => 'Non authentifié',
                'status' => Response::HTTP_UNAUTHORIZED,
                'detail' => 'Vous devez être authentifié pour accéder à cette ressource.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'data' => $this->authService->getUserProfile($user),
        ]);
    }
}
