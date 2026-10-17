<?php

declare(strict_types=1);

namespace App\Enum;

enum FlockMovementType: string
{
    case MORTALITY = 'MORTALITY';   // Perte / mortalité naturelle ou maladie
    case CULLING = 'CULLING';       // Réforme / tri / sujet écarté
    case SALE = 'SALE';             // Vente de sujets vifs
    case TRANSFER = 'TRANSFER';     // Transfert vers un autre bâtiment ou site
    case ADJUSTMENT = 'ADJUSTMENT'; // Correction manuelle d'inventaire
}
