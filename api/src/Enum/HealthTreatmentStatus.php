<?php

declare(strict_types=1);

namespace App\Enum;

enum HealthTreatmentStatus: string
{
    case SCHEDULED = 'SCHEDULED';
    case COMPLETED = 'COMPLETED';
    case CANCELLED = 'CANCELLED';
    case MISSED = 'MISSED';
}
