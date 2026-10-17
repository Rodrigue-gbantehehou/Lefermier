<?php

declare(strict_types=1);

namespace App\Exception;

use App\Enum\EggCollectionSession;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DuplicateEggProductionSessionException extends ConflictHttpException
{
    public function __construct(string $date, EggCollectionSession $session)
    {
        parent::__construct(sprintf(
            "Une collecte d'œufs pour cette bande a déjà été enregistrée pour la date '%s' et la session '%s'.",
            $date,
            $session->value
        ));
    }
}
