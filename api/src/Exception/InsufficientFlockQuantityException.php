<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InsufficientFlockQuantityException extends UnprocessableEntityHttpException
{
    public function __construct(int $requested, int $available)
    {
        parent::__construct(sprintf(
            "Impossible d'enregistrer une sortie de %d sujets : l'effectif actuel vivant n'est que de %d sujets.",
            $requested,
            $available
        ));
    }
}
