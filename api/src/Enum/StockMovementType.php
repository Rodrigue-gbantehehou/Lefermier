<?php

declare(strict_types=1);

namespace App\Enum;

enum StockMovementType: string
{
    case INCOMING = 'INCOMING';     // Réception de commande / achat fournisseur
    case FEEDING = 'FEEDING';       // Distribution / alimentation d'une bande
    case LOSS = 'LOSS';             // Perte / avarie / sac percé ou mouillé
    case ADJUSTMENT = 'ADJUSTMENT'; // Inventaire physique / correction de stock
}
