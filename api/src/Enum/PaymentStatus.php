<?php

declare(strict_types=1);

namespace App\Enum;

enum PaymentStatus: string
{
    case PAID = 'PAID';
    case PARTIAL = 'PARTIAL';
    case UNPAID = 'UNPAID';

    public function getLabel(): string
    {
        return match ($this) {
            self::PAID => 'Totalement réglé',
            self::PARTIAL => 'Partiellement réglé (Acompte)',
            self::UNPAID => 'Non réglé (À crédit)',
        };
    }
}
