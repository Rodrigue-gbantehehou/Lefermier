<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InsufficientFlockQuantityException extends UnprocessableEntityHttpException
{
    public function __construct(int $requested, int $available)
    {
        parent::__construct(sprintf(
            "Effectif insuffisant : vous enregistrez une sortie de %s sujets, mais cette bande ne compte que %s sujet(s) vivant(s).",
            number_format($requested, 0, ',', ' '),
            number_format($available, 0, ',', ' ')
        ));
    }
}
