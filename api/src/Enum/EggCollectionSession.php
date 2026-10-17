<?php

declare(strict_types=1);

namespace App\Enum;

enum EggCollectionSession: string
{
    case ALL_DAY = 'ALL_DAY';     // Collecte globale / cumul de la journée
    case MORNING = 'MORNING';     // Ramassage du matin
    case AFTERNOON = 'AFTERNOON'; // Ramassage de l'après-midi
    case EVENING = 'EVENING';     // Ramassage du soir
}
