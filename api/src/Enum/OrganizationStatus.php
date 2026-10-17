<?php

declare(strict_types=1);

namespace App\Enum;

enum OrganizationStatus: string
{
    case ACTIVE = 'ACTIVE';
    case SUSPENDED = 'SUSPENDED';
    case TRIAL = 'TRIAL';
}
