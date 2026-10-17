<?php

declare(strict_types=1);

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;

#[AsEventListener(event: 'kernel.exception', priority: 10)]
class ApiExceptionListener
{
    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();

        // N'intercepter que les requêtes destinées à l'API (/api)
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $exception = $event->getThrowable();

        // 1. Détection des erreurs de validation (#[MapRequestPayload])
        $validationException = null;
        if ($exception instanceof ValidationFailedException) {
            $validationException = $exception;
        } elseif ($exception->getPrevious() instanceof ValidationFailedException) {
            $validationException = $exception->getPrevious();
        }

        if ($validationException instanceof ValidationFailedException) {
            $violations = [];
            foreach ($validationException->getViolations() as $violation) {
                $violations[] = [
                    'propertyPath' => $violation->getPropertyPath(),
                    'title' => (string) $violation->getMessage(),
                    'code' => $violation->getCode(),
                ];
            }

            $response = new JsonResponse([
                'title' => 'Erreur de validation',
                'status' => Response::HTTP_UNPROCESSABLE_ENTITY,
                'detail' => 'Un ou plusieurs champs contiennent des données non valides.',
                'violations' => $violations,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

            $event->setResponse($response);
            return;
        }

        // 2. Détection des exceptions HTTP standards (Conflict, NotFound, Forbidden...)
        if ($exception instanceof HttpExceptionInterface) {
            $statusCode = $exception->getStatusCode();

            $title = match ($statusCode) {
                Response::HTTP_BAD_REQUEST => 'Requête invalide',
                Response::HTTP_UNAUTHORIZED => 'Non authentifié',
                Response::HTTP_FORBIDDEN => 'Accès refusé',
                Response::HTTP_NOT_FOUND => 'Ressource introuvable',
                Response::HTTP_CONFLICT => 'Conflit de ressource',
                Response::HTTP_UNPROCESSABLE_ENTITY => 'Entité non traitable',
                default => 'Erreur HTTP',
            };

            $response = new JsonResponse([
                'title' => $title,
                'status' => $statusCode,
                'detail' => $exception->getMessage(),
            ], $statusCode, $exception->getHeaders());

            $event->setResponse($response);
            return;
        }
    }
}
