<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\Auth\RegisterRequestDto;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\AuthService;
use App\Service\DeviceAuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/auth', name: 'api_auth_')]
class AuthController extends AbstractController
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly DeviceAuthService $deviceAuthService,
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
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

    #[Route('/device-session', name: 'device_session', methods: ['POST'])]
    public function deviceSession(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        $email = mb_strtolower(trim((string) ($payload['email'] ?? '')));
        $password = (string) ($payload['password'] ?? '');
        $deviceId = trim((string) ($payload['deviceId'] ?? ''));
        $deviceName = isset($payload['deviceName']) ? trim((string) $payload['deviceName']) : null;

        if (empty($email) || empty($password) || empty($deviceId)) {
            return $this->json([
                'title' => 'Paramètres obligatoires manquants',
                'detail' => 'L\'email, le mot de passe et l\'identifiant de terminal (deviceId) sont obligatoires.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->userRepository->findOneBy(['email' => $email]);
        if ($user === null || !$this->passwordHasher->isPasswordValid($user, $password)) {
            return $this->json([
                'title' => 'Identifiants invalides',
                'detail' => 'Email ou mot de passe incorrect.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Rejet des comptes désactivés par l'administration.
        // Le message générique "identifiants invalides" n'est pas utilisé ici
        // pour informer l'utilisateur de la cause réelle (compte suspendu).
        if (!$user->isActive()) {
            return $this->json([
                'title' => 'Compte désactivé',
                'detail' => 'Ce compte a été suspendu. Contactez l\'administrateur de la plateforme.',
            ], Response::HTTP_FORBIDDEN);
        }

        $session = $this->deviceAuthService->createDeviceSession($user, $deviceId, $deviceName);

        return $this->json([
            'data' => [
                'token' => $session['token'],
                'refreshToken' => $session['refreshToken'],
                'expiresAt' => $session['expiresAt'],
                'user' => [
                    'id' => $user->getId()?->toBase32(),
                    'email' => $user->getEmail(),
                    'firstName' => $user->getFirstName(),
                    'lastName' => $user->getLastName(),
                    'fullName' => $user->getFullName(),
                ],
                'profile' => $this->authService->getUserProfile($user),
            ],
        ]);
    }

    #[Route('/refresh', name: 'refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        $refreshToken = trim((string) ($payload['refreshToken'] ?? ''));
        $deviceId = trim((string) ($payload['deviceId'] ?? ''));

        if (empty($refreshToken) || empty($deviceId)) {
            return $this->json([
                'title' => 'Paramètres manquants',
                'detail' => 'Le jeton de rafraîchissement (refreshToken) et l\'identifiant de terminal (deviceId) sont obligatoires.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $session = $this->deviceAuthService->rotateRefreshToken($refreshToken, $deviceId);
        } catch (\Symfony\Component\Security\Core\Exception\AuthenticationException $e) {
            return $this->json([
                'title' => 'Échec de renouvellement',
                'detail' => $e->getMessage(),
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'data' => [
                'token' => $session['token'],
                'refreshToken' => $session['refreshToken'],
                'expiresAt' => $session['expiresAt'],
            ],
        ]);
    }

    #[Route('/device-logout', name: 'device_logout', methods: ['POST'])]
    public function deviceLogout(
        #[CurrentUser] ?User $user,
        Request $request
    ): JsonResponse {
        if ($user === null) {
            return $this->json([
                'title' => 'Non authentifié',
                'detail' => 'Vous devez être authentifié pour révoquer une session.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $deviceId = trim((string) ($payload['deviceId'] ?? ''));

        if (!empty($deviceId)) {
            $this->deviceAuthService->revokeDeviceSession($user, $deviceId);
        }

        return $this->json([
            'data' => [
                'message' => 'Session de l\'appareil révoquée avec succès.',
            ],
        ]);
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

    #[Route('/forgot-password', name: 'forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        $identifier = (string) ($payload['identifier'] ?? $payload['email'] ?? $payload['phone'] ?? '');
        $channel = (string) ($payload['channel'] ?? 'email');

        if (empty($identifier)) {
            return $this->json([
                'title' => 'Paramètre manquant',
                'detail' => 'Veuillez saisir votre adresse email ou votre numéro de téléphone.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $res = $this->authService->requestPasswordReset($identifier, $channel);

        return $this->json([
            'data' => $res,
        ]);
    }

    #[Route('/reset-password', name: 'reset_password', methods: ['POST'])]
    public function resetPassword(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        $identifier = (string) ($payload['identifier'] ?? $payload['email'] ?? '');
        $code = (string) ($payload['code'] ?? $payload['token'] ?? '');
        $newPassword = (string) ($payload['newPassword'] ?? $payload['password'] ?? '');

        if (empty($identifier) || empty($code) || empty($newPassword)) {
            return $this->json([
                'title' => 'Champs obligatoires manquants',
                'detail' => 'L\'identifiant, le code de réinitialisation et le nouveau mot de passe sont obligatoires.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->authService->resetPassword($identifier, $code, $newPassword);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'title' => 'Échec de réinitialisation',
                'detail' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'data' => [
                'message' => 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
            ],
        ]);
    }

    #[Route('/change-password', name: 'change_password', methods: ['POST'])]
    public function changePassword(
        #[CurrentUser] ?User $user,
        Request $request,
    ): JsonResponse {
        if ($user === null) {
            return $this->json([
                'title' => 'Non authentifié',
                'detail' => 'Vous devez être authentifié pour modifier votre mot de passe.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent(), true) ?? [];
        $currentPassword = (string) ($payload['currentPassword'] ?? $payload['oldPassword'] ?? '');
        $newPassword = (string) ($payload['newPassword'] ?? $payload['password'] ?? '');

        if (empty($currentPassword) || empty($newPassword)) {
            return $this->json([
                'title' => 'Champs obligatoires manquants',
                'detail' => 'Le mot de passe actuel et le nouveau mot de passe sont obligatoires.',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->authService->changePassword($user, $currentPassword, $newPassword);
        } catch (\InvalidArgumentException $e) {
            return $this->json([
                'title' => 'Échec de modification',
                'detail' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'data' => [
                'message' => 'Votre mot de passe a été modifié avec succès.',
            ],
        ]);
    }
}
