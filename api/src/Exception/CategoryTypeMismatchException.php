<?php

declare(strict_types=1);

namespace App\Exception;

use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class CategoryTypeMismatchException extends UnprocessableEntityHttpException
{
    public function __construct(TransactionCategory $category, TransactionType $type)
    {
        parent::__construct(sprintf(
            "Incohérence financière : la catégorie '%s' ne correspond pas à une opération de type '%s' (type attendu: '%s').",
            $category->value,
            $type->value,
            $category->getType()->value
        ));
    }
}
