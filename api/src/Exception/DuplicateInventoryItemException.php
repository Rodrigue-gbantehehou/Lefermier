<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class DuplicateInventoryItemException extends ConflictHttpException
{
    public function __construct(string $name, string $category)
    {
        parent::__construct(sprintf(
            "Un article de stock '%s' existe déjà dans la catégorie '%s' pour cette exploitation.",
            $name,
            $category
        ));
    }
}
