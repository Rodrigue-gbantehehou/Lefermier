<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Formules et SKUs d'abonnement commercial Lefermier.
 *
 * Aligné sur docs/DATA_MODEL.md et docs/ADMIN_API_REFERENCE.md.
 */
enum SubscriptionPlan: string
{
    case FREE = 'FREE';
    case STANDARD = 'STANDARD';
    case PRO = 'PRO';
    case ENTERPRISE = 'ENTERPRISE';

    public function label(): string
    {
        return match ($this) {
            self::FREE => 'Starter (Découverte)',
            self::STANDARD => 'Standard (Éleveur Pro)',
            self::PRO => 'Professionnel (Coopérative)',
            self::ENTERPRISE => 'Entreprise & Réseau Industriel',
        };
    }

    public function tier(): string
    {
        return match ($this) {
            self::FREE => 'Découverte',
            self::STANDARD => 'Professionnel',
            self::PRO => 'Multi-Sites',
            self::ENTERPRISE => 'Grand Compte',
        };
    }

    public function isPaid(): bool
    {
        return $this !== self::FREE;
    }

    public static function default(): self
    {
        return self::STANDARD;
    }

    /**
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
