<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Farm;
use App\Entity\IdempotencyRecord;
use App\Entity\User;
use App\Repository\IdempotencyRecordRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
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
     * Valide et extrait l'en-tête Idempotency-Key obligatoire depuis la requête.
     */
    public static function requireKey(Request $request, string $action = 'cette opération'): string
    {
        $key = $request->headers->get('Idempotency-Key') ?? $request->headers->get('X-Idempotency-Key');
        if ($key === null || trim($key) === '') {
            throw new BadRequestHttpException(sprintf("L'en-tête Idempotency-Key est obligatoire pour %s.", $action));
        }

        return trim($key);
    }

    /**
     * Traite de manière idempotente une mutation HTTP critique avec verrouillage de ligne
     * et jeton de fencing (propriété exclusive garantie même en cas de dépassement de délai).
     *
     * @param callable(): Response $execute
     * @param (callable(string): string)|null $responseFilter Filtre optionnel appliqué au JSON avant mise en cache (ex: masquer un secret)
     */
    public function process(
        string $idempotencyKey,
        User $user,
        Request $request,
        ?Farm $farm,
        callable $execute,
        ?callable $responseFilter = null
    ): Response {
        $cleanKey = trim($idempotencyKey);
        if (empty($cleanKey) || strlen($cleanKey) > 64) {
            throw new UnprocessableEntityHttpException("L'en-tête Idempotency-Key doit comporter entre 1 et 64 caractères.");
        }

        $path = $request->getPathInfo();
        $method = $request->getMethod();
        $content = (string) $request->getContent();
        $requestHash = hash('sha256', $path . '|' . $method . '|' . $content);

        // Jeton d'acquisition (fencing token) unique pour cette tentative
        $ownerToken = bin2hex(random_bytes(32));

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

            // Verrou expiré : renouvellement atomique au niveau SQL avec le nouveau jeton de fencing
            $newLockUntil = (new \DateTimeImmutable())->modify(sprintf('+%d seconds', IdempotencyRecord::DEFAULT_LOCK_DURATION_SECONDS));
            if (!$this->recordRepository->tryAcquireOrRenewLock($cleanKey, $newLockUntil, $ownerToken)) {
                $response = new JsonResponse([
                    'title' => 'Opération en cours',
                    'detail' => 'Cette opération est actuellement en cours de traitement. Veuillez réessayer dans quelques secondes.',
                ], Response::HTTP_CONFLICT);
                $response->headers->set('Retry-After', '2');

                return $response;
            }

            $this->entityManager->refresh($existing);
            $record = $existing;
        } else {
            // 5. Première exécution : réservation du verrou avec le jeton de fencing
            $record = new IdempotencyRecord(
                idempotencyKey: $cleanKey,
                user: $user,
                requestPath: $path,
                requestMethod: $method,
                requestHash: $requestHash,
                farm: $farm,
                lockToken: $ownerToken,
                lockDurationSeconds: IdempotencyRecord::DEFAULT_LOCK_DURATION_SECONDS
            );

            try {
                $this->entityManager->persist($record);
                $this->entityManager->flush();
            } catch (UniqueConstraintViolationException) {
                // Course concurrente sur l'insertion
                throw new ConflictHttpException("Une opération concurrente avec la même clé est déjà en cours.");
            }
        }

        // 6. Exécution coordonnée : verrouillage de ligne SQL exclusif pendant toute la transaction métier
        $this->entityManager->beginTransaction();
        try {
            /** @var IdempotencyRecord|null $lockedRecord */
            $lockedRecord = $this->entityManager->find(
                IdempotencyRecord::class,
                $record->getId(),
                LockMode::PESSIMISTIC_WRITE
            );

            if ($lockedRecord === null) {
                throw new ConflictHttpException("L'enregistrement d'idempotence est introuvable.");
            }

            // Fencing check : vérifier que nous possédons toujours le jeton de verrou et que l'état n'a pas été altéré
            if ($lockedRecord->getLockToken() !== $ownerToken || $lockedRecord->isCompleted()) {
                throw new ConflictHttpException("La propriété du verrou d'idempotence a été révoquée ou l'opération a déjà été complétée.");
            }

            /** @var Response $response */
            $response = $execute();

            // Re-vérification stricte du jeton de fencing avant finalisation
            $this->entityManager->refresh($lockedRecord);
            if ($lockedRecord->getLockToken() !== $ownerToken) {
                throw new ConflictHttpException("Le bail d'idempotence a été révoqué pendant l'exécution.");
            }

            $responseBody = $response->getContent() ?: null;
            if ($responseBody !== null && $responseFilter !== null) {
                $responseBody = $responseFilter($responseBody);
            }

            $lockedRecord->setStatus(IdempotencyRecord::STATUS_COMPLETED);
            $lockedRecord->setResponseStatusCode($response->getStatusCode());
            $lockedRecord->setResponseBody($responseBody);
            $lockedRecord->setResponseHeaders(['Content-Type' => 'application/json']);

            $this->entityManager->flush();
            $this->entityManager->commit();

            $response->headers->set('X-Cache-Idempotency', 'MISS');

            return $response;
        } catch (\Throwable $e) {
            // Rollback de la transaction InnoDB si toujours active
            try {
                if ($this->entityManager->getConnection()->isTransactionActive()) {
                    $this->entityManager->getConnection()->rollBack();
                }
            } catch (\Throwable) {
            }

            // Enregistrement de l'échec avec stratégie deux niveaux :
            // 1. Via le repository (DQL) → compatible avec les mocks de test unitaires
            // 2. Via DBAL → garantie si l'EM est fermé ou si le DQL a échoué silencieusement (0 rows)
            try {
                if ($record->getId() !== null) {
                    $this->recordRepository->markFailed($record->getId(), $ownerToken, $e->getMessage());
                }
            } catch (\Throwable) {
            }
            // Fallback DBAL : garantit la persistance même si l'EM est fermé ou le filtre lockToken incorrect
            try {
                $this->markFailedViaDbal($cleanKey, $ownerToken, $e->getMessage());
            } catch (\Throwable) {
            }

            throw $e;
        }
    }

    /**
     * Enregistre l'échec directement via DBAL (sans passer par l'ORM).
     * Utilisé après un rollback Doctrine qui peut fermer l'EntityManager.
     * Utilise idempotency_key (VARCHAR unique) pour éviter la conversion binaire de l'ID ULID.
     */
    private function markFailedViaDbal(string $idempotencyKey, ?string $lockToken, ?string $errorMessage): void
    {
        $conn = $this->entityManager->getConnection();
        $sql = 'UPDATE idempotency_records SET status = :status, locked_until = :now'
            . ' WHERE idempotency_key = :key AND status != :completed';

        $params = [
            'status'    => IdempotencyRecord::STATUS_FAILED,
            'now'       => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
            'key'       => $idempotencyKey,
            'completed' => IdempotencyRecord::STATUS_COMPLETED,
        ];

        if ($lockToken !== null) {
            $sql .= ' AND lock_token = :token';
            $params['token'] = $lockToken;
        }

        $conn->executeStatement($sql, $params);
    }
}
