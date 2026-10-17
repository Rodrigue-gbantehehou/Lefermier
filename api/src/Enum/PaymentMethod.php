<?php

declare(strict_types=1);

namespace App\Enum;

enum PaymentMethod: string
{
    case CASH = 'CASH';                   // Espèces / Cash
    case MTN_MOMO = 'MTN_MOMO';           // MTN Mobile Money
    case MOOV_MONEY = 'MOOV_MONEY';       // Moov Money
    case CELTIIS_CASH = 'CELTIIS_CASH';   // Celtiis Cash
    case BANK_TRANSFER = 'BANK_TRANSFER'; // Virement bancaire
    case CHECK = 'CHECK';                 // Chèque bancaire
    case OTHER = 'OTHER';                 // Autre mode de règlement
}
