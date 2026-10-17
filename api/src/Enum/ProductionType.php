<?php

declare(strict_types=1);

namespace App\Enum;

enum ProductionType: string
{
    case BROILER = 'BROILER';
    case LAYER = 'LAYER';
    case MIXED = 'MIXED';
}
