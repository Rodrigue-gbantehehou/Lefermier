<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Déclenchée lorsqu'une action dépasse les quotas autorisés par la formule commerciale active.
 */
class PlanQuotaExceededException extends HttpException
{
    public function __construct(
        private readonly string $quotaKey,
        private readonly int $currentUsage,
        private readonly int $maxAllowed,
        private readonly string $planName,
        ?string $customMessage = null,
        ?\Throwable $previous = null,
        int $code = 0,
        array $headers = []
    ) {
        $message = $customMessage ?? sprintf(
            'Limite atteinte : Votre formule actuelle (%s) est limitée à %d %s (utilisation actuelle : %d). Passez à une formule supérieure pour augmenter ce quota.',
            $planName,
            $maxAllowed,
            $this->getQuotaLabel($quotaKey),
            $currentUsage
        );

        parent::__construct(Response::HTTP_FORBIDDEN, $message, $previous, $headers, $code);
    }

    public function getQuotaKey(): string
    {
        return $this->quotaKey;
    }

    public function getCurrentUsage(): int
    {
        return $this->currentUsage;
    }

    public function getMaxAllowed(): int
    {
        return $this->maxAllowed;
    }

    public function getPlanName(): string
    {
        return $this->planName;
    }

    private function getQuotaLabel(string $key): string
    {
        return match ($key) {
            'max_farms', 'maxFarms' => 'exploitation(s)',
            'max_flocks', 'maxFlocks' => 'bande(s) simultanée(s)',
            'max_members', 'maxMembers' => 'compte(s) collaborateur(s)',
            'max_buildings', 'maxBuildings' => 'bâtiment(s)/poulailler(s)',
            default => 'ressource(s)',
        };
    }
}
