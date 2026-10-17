<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DuplicateFlockCodeException extends ConflictHttpException
{
    public function __construct(string $code)
    {
        parent::__construct(sprintf("Une bande avec le code '%s' existe déjà dans cette exploitation.", $code));
    }
}
