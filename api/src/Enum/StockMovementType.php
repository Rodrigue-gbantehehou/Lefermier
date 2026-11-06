<?php

declare(strict_types=1);

namespace App\Enum;

enum StockMovementType: string
{
    case INCOMING = 'INCOMING';     // Réception de commande / achat fournisseur
    case FEEDING = 'FEEDING';       // Distribution / alimentation d'une bande
    case LOSS = 'LOSS';             // Perte / avarie / sac percé ou mouillé
    case ADJUSTMENT = 'ADJUSTMENT'; // Inventaire physique / correction de stock
    case HEALTH_CONSUMPTION = 'HEALTH_CONSUMPTION'; // Consommation sanitaire (vaccin, médicament) produite par la complétion d'un soin

    /**
     * Types qui ne peuvent pas être saisis directement via l'API des mouvements de stock :
     * ils sont produits exclusivement par un processus métier dédié.
     *
     * @return self[]
     */
    public static function systemOnly(): array
    {
        return [self::HEALTH_CONSUMPTION];
    }

    public function isOutgoing(): bool
    {
        return in_array($this, [self::FEEDING, self::LOSS, self::HEALTH_CONSUMPTION], true);
    }
}
