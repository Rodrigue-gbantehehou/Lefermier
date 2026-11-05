<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Déclenchée lorsqu'un module payant est invoqué par une organisation sans formule adéquate.
 */
class PlanModuleNotAllowedException extends HttpException
{
    public function __construct(
        private readonly string $moduleKey,
        private readonly string $planName,
        ?string $customMessage = null,
        ?\Throwable $previous = null,
        int $code = 0,
        array $headers = []
    ) {
        $message = $customMessage ?? sprintf(
            'Fonctionnalité réservée : Le module "%s" n\'est pas inclus dans votre formule actuelle (%s). Passez à une formule supérieure pour débloquer cette fonctionnalité.',
            $moduleKey,
            $planName
        );

        parent::__construct(Response::HTTP_FORBIDDEN, $message, $previous, $headers, $code);
    }

    public function getModuleKey(): string
    {
        return $this->moduleKey;
    }

    public function getPlanName(): string
    {
        return $this->planName;
    }
}
