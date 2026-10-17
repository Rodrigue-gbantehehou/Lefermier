<?php

declare(strict_types=1);

namespace App\Exception;

use App\Enum\PoultryType;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InvalidFlockTypeForEggProductionException extends UnprocessableEntityHttpException
{
    public function __construct(PoultryType $type)
    {
        parent::__construct(sprintf(
            "Impossible d'enregistrer une ponte pour une bande de type '%s'. Seules les bandes de type LAYER (Pondeuses), MIXED (Mixte) ou autres pondeuses sont autorisées.",
            $type->value
        ));
    }
}
