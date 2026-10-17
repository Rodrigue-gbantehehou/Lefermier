<?php

declare(strict_types=1);

namespace App\Exception;

use App\Enum\InventoryUnit;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class IncompatibleUnitException extends UnprocessableEntityHttpException
{
    public function __construct(InventoryUnit $sourceUnit, InventoryUnit $targetUnit)
    {
        parent::__construct(sprintf(
            "Impossible d'imputer un mouvement en '%s' (%s) sur un article stocké en '%s' (%s). Ces unités appartiennent à des familles incompatibles (%s vs %s).",
            $sourceUnit->value,
            $sourceUnit->getLabel(),
            $targetUnit->value,
            $targetUnit->getLabel(),
            $sourceUnit->getFamily(),
            $targetUnit->getFamily()
        ));
    }
}
