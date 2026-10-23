<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\User;
use App\Service\Admin\AdminAuditService;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationSuccessEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\RequestStack;

class AuthenticationAuditListener
{
    public function __construct(
        private readonly AdminAuditService $auditService,
        private readonly RequestStack $requestStack,
    ) {
    }

    #[AsEventListener(event: Events::AUTHENTICATION_SUCCESS)]
    public function onAuthenticationSuccess(AuthenticationSuccessEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        $request = $this->requestStack->getCurrentRequest();
        $ip = $request?->getClientIp() ?? '127.0.0.1';
        $userAgent = $request?->headers->get('User-Agent') ?? 'Inconnu';
        $shortAgent = mb_strimwidth($userAgent, 0, 80, '...');

        $roleName = $user->getAdminRole()?->getName()
            ?? (in_array('ROLE_SUPER_ADMIN', $user->getRoles(), true) ? 'Super-Administrateur' : 'Utilisateur');

        $this->auditService->log(
            action: 'AUTH_LOGIN_SUCCESS',
            label: 'Connexion réussie',
            targetType: 'User',
            targetId: (string) $user->getId()?->toBase32(),
            targetName: $user->getFullName(),
            details: sprintf('Connexion réussie (%s) depuis %s [%s]', $roleName, $ip, $shortAgent),
            status: 'SUCCESS',
            actor: $user,
        );
    }

    #[AsEventListener(event: Events::AUTHENTICATION_FAILURE)]
    public function onAuthenticationFailure(AuthenticationFailureEvent $event): void
    {
        $request = $event->getRequest() ?? $this->requestStack->getCurrentRequest();
        $ip = $request?->getClientIp() ?? '127.0.0.1';

        $attemptedEmail = 'inconnu';
        if ($request !== null) {
            $content = json_decode($request->getContent(), true);
            if (is_array($content) && !empty($content['email'])) {
                $attemptedEmail = (string) $content['email'];
            }
        }

        $this->auditService->log(
            action: 'AUTH_LOGIN_FAILED',
            label: 'Échec de connexion',
            targetType: 'User',
            targetId: 'N/A',
            targetName: $attemptedEmail,
            details: sprintf('Tentative de connexion échouée pour "%s" depuis %s', $attemptedEmail, $ip),
            status: 'FAILED',
            actor: null,
            fallbackActorEmail: $attemptedEmail !== 'inconnu' ? $attemptedEmail : null,
        );
    }
}
