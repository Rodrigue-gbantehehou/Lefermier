<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class EmailAlreadyExistsException extends ConflictHttpException
{
    public function __construct(string $email)
    {
        parent::__construct(sprintf("Un compte existe déjà avec l'adresse email '%s'.", $email));
    }
}
