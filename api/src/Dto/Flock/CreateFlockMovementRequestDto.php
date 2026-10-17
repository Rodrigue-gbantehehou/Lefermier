<?php

declare(strict_types=1);

namespace App\Dto\Flock;

use App\Enum\FlockMovementType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateFlockMovementRequestDto
{
    public function __construct(
        public FlockMovementType $type,

        #[Assert\NotNull(message: "La quantité est obligatoire.")]
        #[Assert\Positive(message: "La quantité doit être strictement positive.")]
        public int $quantity,

        #[Assert\NotBlank(message: "La date du mouvement est obligatoire.")]
        #[Assert\Date(message: "La date doit être au format YYYY-MM-DD.")]
        public string $movementDate,

        #[Assert\Length(max: 255, maxMessage: "Le motif ne doit pas dépasser 255 caractères.")]
        public ?string $reason = null,
    ) {
    }
}
