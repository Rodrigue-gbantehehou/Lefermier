<?php

declare(strict_types=1);

namespace App\Enum;

enum FlockStatus: string
{
    case ACTIVE = 'ACTIVE';       // Bande en cours d'élevage
    case COMPLETED = 'COMPLETED'; // Bande clôturée (abattue, vendue, réformée)
    case CANCELLED = 'CANCELLED'; // Annulée
}
