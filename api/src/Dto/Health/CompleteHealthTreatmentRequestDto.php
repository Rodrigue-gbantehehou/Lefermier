<?php

declare(strict_types=1);

namespace App\Dto\Health;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CompleteHealthTreatmentRequestDto
{
    public function __construct(
        #[Assert\Date(message: "La date d'administration doit être au format YYYY-MM-DD.")]
        public ?string $administeredDate = null,

        public ?string $quantityUsed = null,

        #[Assert\PositiveOrZero(message: "Le coût en FCFA doit être supérieur ou égal à zéro.")]
        public ?int $costFcfa = null,

        #[Assert\Length(max: 100, maxMessage: "Le nom du vétérinaire ne doit pas dépasser 100 caractères.")]
        public ?string $veterinarian = null,

        public ?string $notes = null,

        #[Assert\Ulid(message: "L'identifiant de l'article de stock doit être un ULID valide.")]
        public ?string $inventoryItemId = null,

        public bool $deductFromStock = true,
    ) {
    }
}
