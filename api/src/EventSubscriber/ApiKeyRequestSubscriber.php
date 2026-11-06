<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\ApiKey;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiKeyRequestSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 5],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $apiKey = $request->attributes->get('current_api_key');
        if (!$apiKey instanceof ApiKey) {
            return;
        }

        // Interdiction absolue d'accéder aux routes d'administration globale avec une clé API
        if (str_starts_with($request->getPathInfo(), '/api/admin')) {
            throw new AccessDeniedHttpException("Les clés API ne sont pas autorisées à accéder à l'espace d'administration.");
        }
    }
}
