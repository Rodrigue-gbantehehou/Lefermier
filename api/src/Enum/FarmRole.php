<?php

declare(strict_types=1);

namespace App\Enum;

enum FarmRole: string
{
    case OWNER = 'OWNER';
    case ADMIN = 'ADMIN';
    case MANAGER = 'MANAGER';
    case STOCK_KEEPER = 'STOCK_KEEPER';
    case PRODUCTION_LEAD = 'PRODUCTION_LEAD';
    case ACCOUNTANT = 'ACCOUNTANT';
    case VET_CONSULTANT = 'VET_CONSULTANT';
}
