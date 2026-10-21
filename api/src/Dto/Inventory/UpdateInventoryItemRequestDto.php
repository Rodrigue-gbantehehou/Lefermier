<?php

declare(strict_types=1);

namespace App\Dto\Inventory;

use App\Enum\InventoryCategory;
use App\Enum\InventoryUnit;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateInventoryItemRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom de l'article est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public string $name,

        public ?InventoryCategory $category = null,

        #[Assert\Length(max: 100, maxMessage: "La précision de catégorie ne doit pas dépasser 100 caractères.")]
        public ?string $customCategory = null,

        public InventoryUnit $unit = InventoryUnit::BAG_50KG,

        #[Assert\PositiveOrZero(message: "Le seuil d'alerte doit être un nombre positif ou nul.")]
        public ?float $alertThreshold = null,

        #[Assert\PositiveOrZero(message: "Le prix unitaire en FCFA doit être un entier positif ou nul.")]
        public ?int $unitPrice = null,

        #[Assert\Positive(message: "Le poids par sac doit être strictement positif.")]
        public ?float $packageWeightKg = null,

        public ?string $notes = null,

        public bool $isActive = true,
    ) {
    }
}
