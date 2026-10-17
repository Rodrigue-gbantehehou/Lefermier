<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InsufficientStockException extends UnprocessableEntityHttpException
{
    public function __construct(float $requested, float $available, string $unit)
    {
        parent::__construct(sprintf(
            "Impossible d'enregistrer une sortie de %.2f %s : le stock disponible actuel n'est que de %.2f %s.",
            $requested,
            $unit,
            $available,
            $unit
        ));
    }
}
