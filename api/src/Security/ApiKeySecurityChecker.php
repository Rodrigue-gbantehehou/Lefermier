<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\ApiKey;
use App\Entity\Farm;
use Symfony\Component\HttpFoundation\RequestStack;

class ApiKeySecurityChecker
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
    }

    /**
     * Retourne la clé API ayant servi à authentifier la requête courante (ou null si authentification JWT).
     */
    public function getApiKey(): ?ApiKey
    {
        $request = $this->requestStack->getCurrentRequest();
        if ($request === null) {
            return null;
        }

        $apiKey = $request->attributes->get('current_api_key');

        return $apiKey instanceof ApiKey ? $apiKey : null;
    }

    /**
     * Indique si la requête courante est exécutée dans le contexte d'une clé API.
     */
    public function isApiKeyRequest(): bool
    {
        return $this->getApiKey() !== null;
    }

    /**
     * Vérifie si l'accès à une exploitation donnée est autorisé pour la clé API en cours.
     * Si aucune clé API n'est utilisée (authentification JWT normale), renvoie true.
     */
    public function isFarmAllowed(?Farm $targetFarm): bool
    {
        $apiKey = $this->getApiKey();
        if ($apiKey === null) {
            return true;
        }

        if ($targetFarm === null) {
            return false;
        }

        $apiKeyFarmId = $apiKey->getFarm()->getId()?->toBase32();
        $targetFarmId = $targetFarm->getId()?->toBase32();

        return $apiKeyFarmId !== null && $apiKeyFarmId === $targetFarmId;
    }

    /**
     * Valide de manière stricte si la clé API a le droit d'effectuer une action (permission) sur l'exploitation cible.
     */
    public function isAccessAllowed(?Farm $targetFarm, string $requiredPermission): bool
    {
        $apiKey = $this->getApiKey();
        if ($apiKey === null) {
            return true;
        }

        // 1. Isolation stricte de l'exploitation
        if (!$this->isFarmAllowed($targetFarm)) {
            return false;
        }

        // 2. Vérification des scopes déclarés
        return $apiKey->supportsPermission($requiredPermission);
    }
}
