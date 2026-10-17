<?php

declare(strict_types=1);

namespace App\Security;

use App\Service\ApiKeyService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\Passport;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class ApiKeyAuthenticator extends AbstractAuthenticator
{
    public function __construct(
        private readonly ApiKeyService $apiKeyService,
    ) {
    }

    public function supports(Request $request): ?bool
    {
        if ($request->headers->has('X-API-KEY')) {
            return true;
        }

        $authHeader = $request->headers->get('Authorization');
        if ($authHeader !== null && str_starts_with($authHeader, 'ApiKey ')) {
            return true;
        }

        return false;
    }

    public function authenticate(Request $request): Passport
    {
        $rawKey = $request->headers->get('X-API-KEY');
        if ($rawKey === null || trim($rawKey) === '') {
            $authHeader = (string) $request->headers->get('Authorization');
            $rawKey = trim(substr($authHeader, 7)); // strip 'ApiKey '
        }

        if (trim($rawKey) === '') {
            throw new CustomUserMessageAuthenticationException('Clé API non fournie.');
        }

        $apiKey = $this->apiKeyService->verifyAndTrack($rawKey);
        if ($apiKey === null) {
            throw new CustomUserMessageAuthenticationException('Clé API invalide, inactive ou expirée.');
        }

        // On injecte l'entité ApiKey et la Farm associée dans les attributs de requête
        $request->attributes->set('current_api_key', $apiKey);
        $request->attributes->set('current_farm', $apiKey->getFarm());

        $user = $apiKey->getCreatedBy();

        return new SelfValidatingPassport(new UserBadge($user->getUserIdentifier()));
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // Laisser la requête continuer normalement vers le contrôleur
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse([
            'code' => Response::HTTP_UNAUTHORIZED,
            'message' => $exception->getMessageKey(),
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_UNAUTHORIZED);
    }
}
