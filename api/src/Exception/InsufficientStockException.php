<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class InsufficientStockException extends UnprocessableEntityHttpException
{
    public function __construct(float $requested, float $available, string $unit)
    {
        $fmtReq = (round($requested, 2) == round($requested, 0))
            ? (string) (int) $requested
            : number_format($requested, 2, ',', ' ');

        $fmtAvail = (round($available, 2) == round($available, 0))
            ? (string) (int) $available
            : number_format($available, 2, ',', ' ');

        $normalized = strtolower(trim($unit));
        $baseUnit = match ($normalized) {
            'u', 'unit' => 'unité',
            'sac', 'bag', 'bag_50kg', 'bag_25kg' => 'sac',
            'kg' => 'kg',
            'g' => 'g',
            'l', 'liter' => 'L',
            'ml' => 'mL',
            'dose' => 'dose',
            'flacon', 'vial' => 'flacon',
            'sachet' => 'sachet',
            'tonne', 'ton' => 'tonne',
            default => $unit,
        };

        $pluralReq = ($requested > 1 && in_array($baseUnit, ['unité', 'sac', 'dose', 'flacon', 'sachet', 'tonne'], true))
            ? $baseUnit . 's'
            : $baseUnit;

        $pluralAvail = ($available > 1 && in_array($baseUnit, ['unité', 'sac', 'dose', 'flacon', 'sachet', 'tonne'], true))
            ? $baseUnit . 's'
            : $baseUnit;

        parent::__construct(sprintf(
            "Stock insuffisant : vous demandez %s %s, mais il ne reste que %s %s en magasin.",
            $fmtReq,
            $pluralReq,
            $fmtAvail,
            $pluralAvail
        ));
    }
}
