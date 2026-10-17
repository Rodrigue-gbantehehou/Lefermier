<?php

declare(strict_types=1);

namespace App\Exception;

use App\Enum\FlockStatus;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InactiveFlockEggProductionException extends UnprocessableEntityHttpException
{
    public function __construct(FlockStatus $status)
    {
        parent::__construct(sprintf(
            "Impossible d'enregistrer une ponte pour une bande qui n'est plus active (statut: %s).",
            $status->value
        ));
    }
}
