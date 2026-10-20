<?php

declare(strict_types=1);

namespace App\Enum;

enum AdministrationMethod: string
{
    case DRINKING_WATER = 'DRINKING_WATER';
    case INJECTION = 'INJECTION';
    case OCULAR_NASAL = 'OCULAR_NASAL';
    case SPRAY = 'SPRAY';
    case FEED = 'FEED';
    case TOPICAL = 'TOPICAL';
    case OTHER = 'OTHER';
}
