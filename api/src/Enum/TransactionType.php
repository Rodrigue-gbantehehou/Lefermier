<?php

declare(strict_types=1);

namespace App\Enum;

enum TransactionType: string
{
    case INCOME = 'INCOME';   // Recette / Encaissement
    case EXPENSE = 'EXPENSE'; // Dépense / Décaissement
}
