<?php

declare(strict_types=1);

namespace App\Enum;

use App\Exception\IncompatibleUnitException;

enum InventoryUnit: string
{
    case KG = 'KG';             // Kilogramme
    case G = 'G';               // Gramme
    case BAG_50KG = 'BAG_50KG'; // Sac de 50 kg
    case BAG_25KG = 'BAG_25KG'; // Sac de 25 kg
    case TON = 'TON';           // Tonne métrique (1 000 kg)
    case DOSE = 'DOSE';         // Dose vaccinale
    case VIAL = 'VIAL';         // Flacon / Ampoule
    case SACHET = 'SACHET';     // Sachet
    case LITER = 'LITER';       // Litre
    case ML = 'ML';             // Millilitre
    case UNIT = 'UNIT';         // Unité / pièce

    public function getLabel(): string
    {
        return match ($this) {
            self::KG => 'Kilogramme (kg)',
            self::G => 'Gramme (g)',
            self::BAG_50KG => 'Sac de 50 kg',
            self::BAG_25KG => 'Sac de 25 kg',
            self::TON => 'Tonne (t)',
            self::DOSE => 'Dose vaccinale',
            self::VIAL => 'Flacon / Ampoule',
            self::SACHET => 'Sachet',
            self::LITER => 'Litre (L)',
            self::ML => 'Millilitre (mL)',
            self::UNIT => 'Unité / Pièce',
        };
    }

    public function getShortLabel(): string
    {
        return match ($this) {
            self::KG => 'kg',
            self::G => 'g',
            self::BAG_50KG => 'sac (50kg)',
            self::BAG_25KG => 'sac (25kg)',
            self::TON => 't',
            self::DOSE => 'dose',
            self::VIAL => 'flacon',
            self::SACHET => 'sachet',
            self::LITER => 'L',
            self::ML => 'mL',
            self::UNIT => 'u',
        };
    }

    public function getFamily(): string
    {
        return match ($this) {
            self::KG, self::G, self::BAG_50KG, self::BAG_25KG, self::TON => 'MASS',
            self::LITER, self::ML => 'VOLUME',
            self::DOSE, self::VIAL, self::SACHET => 'VET_DOSE',
            self::UNIT => 'PIECE',
        };
    }

    /**
     * Facteur multiplicateur par rapport à l'unité de référence de la famille (KG pour MASS, LITER pour VOLUME).
     */
    public function getBaseMultiplier(): float
    {
        return match ($this) {
            self::KG => 1.0,
            self::G => 0.001,
            self::BAG_50KG => 50.0,
            self::BAG_25KG => 25.0,
            self::TON => 1000.0,
            self::LITER => 1.0,
            self::ML => 0.001,
            self::DOSE, self::VIAL, self::SACHET, self::UNIT => 1.0,
        };
    }

    public function isCompatibleWith(self $other): bool
    {
        return $this->getFamily() === $other->getFamily();
    }

    /**
     * Convertit une quantité depuis cette unité vers l'unité cible.
     * Lance IncompatibleUnitException si les familles sont incompatibles.
     */
    public function convertTo(float $quantity, self $targetUnit): float
    {
        if ($this === $targetUnit) {
            return $quantity;
        }

        if (!$this->isCompatibleWith($targetUnit)) {
            throw new IncompatibleUnitException($this, $targetUnit);
        }

        $sourceMultiplier = $this->getBaseMultiplier();
        $targetMultiplier = $targetUnit->getBaseMultiplier();

        if ($targetMultiplier == 0.0) {
            return $quantity;
        }

        // Quantité normalisée = (quantité * multiplicateur source) / multiplicateur cible
        return round(($quantity * $sourceMultiplier) / $targetMultiplier, 4);
    }
}
