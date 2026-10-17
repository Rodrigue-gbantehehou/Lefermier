<?php

declare(strict_types=1);

namespace App\Dto\Inventory;

use App\Enum\InventoryUnit;
use App\Enum\StockMovementType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateStockMovementRequestDto
{
    public function __construct(
        public StockMovementType $type,

        #[Assert\NotNull(message: "La quantité est obligatoire.")]
        #[Assert\Positive(message: "La quantité doit être strictement supérieure à 0.")]
        public float $quantity,

        #[Assert\NotBlank(message: "La date du mouvement est obligatoire.")]
        #[Assert\Date(message: "La date doit être au format YYYY-MM-DD.")]
        public string $movementDate,

        public ?InventoryUnit $unit = null,

        #[Assert\Ulid(message: "L'identifiant de la bande doit être un ULID valide.")]
        public ?string $flockId = null,

        #[Assert\PositiveOrZero(message: "Le prix unitaire en FCFA doit être positif ou nul.")]
        public ?int $unitPrice = null,

        #[Assert\Length(max: 255, maxMessage: "Le motif ne doit pas dépasser 255 caractères.")]
        public ?string $reason = null,
    ) {
    }
}
