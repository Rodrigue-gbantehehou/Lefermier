<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Farm;
use App\Entity\IdempotencyRecord;
use App\Entity\User;
use App\Repository\IdempotencyRecordRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class IdempotencyService
{
    public function __construct(
        private readonly IdempotencyRecordRepository $recordRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Traite de manière idempotente une mutation HTTP critique.
     *
     * @param callable(): Response $execute
     */
    public function process(
        string $idempotencyKey,
        User $user,
        Request $request,
        ?Farm $farm,
        callable $execute
    ): Response {
        $cleanKey = trim($idempotencyKey);
        if (empty($cleanKey) || strlen($cleanKey) > 64) {
            throw new UnprocessableEntityHttpException("L'en-tête Idempotency-Key doit comporter entre 1 et 64 caractères.");
        }

        $path = $request->getPathInfo();
        $method = $request->getMethod();
        $content = (string) $request->getContent();
        $requestHash = hash('sha256', $path . '|' . $method . '|' . $content);

        $existing = $this->recordRepository->findByKey($cleanKey);

        if ($existing !== null) {
            // 1. Contrôle de sécurité : l'opération appartient bien au même utilisateur
            if ($existing->getUser()->getId()?->toBase32() !== $user->getId()?->toBase32()) {
                throw new AccessDeniedHttpException("Cette clé d'idempotence a été émise par un autre utilisateur.");
            }

            // 2. Contrôle d'intégrité : le payload doit être strictement identique
            if ($existing->getRequestHash() !== $requestHash) {
                throw new UnprocessableEntityHttpException(
                    "Conflit d'idempotence : réutilisation de la même clé avec une requête différente."
                );
            }

            // 3. Opération déjà terminée avec succès -> Renvoi direct de la réponse en cache
            if ($existing->isCompleted()) {
                $headers = $existing->getResponseHeaders() ?? [];
                $headers['X-Cache-Idempotency'] = 'HIT';

                return new JsonResponse(
                    $existing->getResponseBody(),
                    $existing->getResponseStatusCode() ?? Response::HTTP_OK,
                    $headers,
                    true // Déjà encodé en JSON
                );
            }

            // 4. Opération en cours d'exécution par un autre thread/processus
            if ($existing->isLocked()) {
                $response = new JsonResponse([
                    'title' => 'Opération en cours',
                    'detail' => 'Cette opération est actuellement en cours de traitement. Veuillez réessayer dans quelques secondes.',
                ], Response::HTTP_CONFLICT);
                $response->headers->set('Retry-After', '2');

                return $response;
            }
        }

        // 5. Première exécution : réservation du verrou
        if ($existing === null) {
            $record = new IdempotencyRecord(
                idempotencyKey: $cleanKey,
                user: $user,
                requestPath: $path,
                requestMethod: $method,
                requestHash: $requestHash,
                farm: $farm
            );

            try {
                $this->entityManager->persist($record);
                $this->entityManager->flush();
            } catch (UniqueConstraintViolationException) {
                // Course concurrente sur l'insertion
                throw new ConflictHttpException("Une opération concurrente avec la même clé est déjà en cours.");
            }
        } else {
            $record = $existing;
            $record->setStatus(IdempotencyRecord::STATUS_PENDING);
            $this->entityManager->flush();
        }

        // 6. Exécution de la mutation métier
        try {
            /** @var Response $response */
            $response = $execute();

            $record->setStatus(IdempotencyRecord::STATUS_COMPLETED);
            $record->setResponseStatusCode($response->getStatusCode());
            $record->setResponseBody($response->getContent() ?: null);
            $record->setResponseHeaders(['Content-Type' => 'application/json']);

            $this->entityManager->flush();

            $response->headers->set('X-Cache-Idempotency', 'MISS');

            return $response;
        } catch (\Throwable $e) {
            // En cas d'erreur métier ou de validation, enregistrer l'échec
            $record->setStatus(IdempotencyRecord::STATUS_FAILED);
            $this->entityManager->flush();

            throw $e;
        }
    }
}
