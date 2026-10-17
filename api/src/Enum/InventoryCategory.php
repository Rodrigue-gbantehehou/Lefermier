<?php

declare(strict_types=1);

namespace App\Enum;

enum InventoryCategory: string
{
    case FEED = 'FEED';                 // Aliments (démarrage, croissance, finition, ponte)
    case VACCINE = 'VACCINE';           // Vaccins (Gumboro, Newcastle, Bronchite...)
    case MEDICATION = 'MEDICATION';     // Antibiotiques, vitamines, anticoccidiens
    case DISINFECTANT = 'DISINFECTANT'; // Produits d'hygiène, chaux, désinfectants
    case EQUIPMENT = 'EQUIPMENT';       // Mangeoires, abreuvoirs, plateaux d'œufs
    case OTHER = 'OTHER';               // Autres fournitures
}
