<?php

declare(strict_types=1);

namespace App\Enum;

enum PoultryType: string
{
    case BROILER = 'BROILER'; // Poulet de chair
    case LAYER = 'LAYER';     // Poule pondeuse
    case MIXED = 'MIXED';     // Élevage mixte / traditionnel amélioré (ex: Goliath)
    case OTHER = 'OTHER';     // Dindon, caille, canard, etc.
}
