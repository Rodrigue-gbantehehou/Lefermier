<?php

declare(strict_types=1);

namespace App\Enum;

enum HealthTreatmentType: string
{
    case VACCINATION = 'VACCINATION';
    case TREATMENT = 'TREATMENT';
    case DEWORMING = 'DEWORMING';
    case VITAMIN = 'VITAMIN';
    case DISINFECTION = 'DISINFECTION';
    case OTHER = 'OTHER';
}
