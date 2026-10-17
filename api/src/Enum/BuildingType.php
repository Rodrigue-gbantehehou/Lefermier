<?php

declare(strict_types=1);

namespace App\Enum;

enum BuildingType: string
{
    case POULTRY_HOUSE = 'POULTRY_HOUSE';
    case BROODER = 'BROODER';
    case STORAGE = 'STORAGE';
}
