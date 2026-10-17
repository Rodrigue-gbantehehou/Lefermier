<?php

declare(strict_types=1);

namespace App\Dto\EggProduction;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateEggProductionRequestDto
{
    public function __construct(
        #[Assert\PositiveOrZero(message: "Le nombre d'œufs normaux ne peut pas être négatif.")]
        public int $goodEggs = 0,

        #[Assert\PositiveOrZero(message: "Le nombre d'œufs fêlés ne peut pas être négatif.")]
        public int $crackedEggs = 0,

        #[Assert\PositiveOrZero(message: "Le nombre d'œufs sales ne peut pas être négatif.")]
        public int $dirtyEggs = 0,

        #[Assert\PositiveOrZero(message: "Le nombre d'œufs déformés ne peut pas être négatif.")]
        public int $deformedEggs = 0,

        #[Assert\Length(max: 1000, maxMessage: "Les notes ne doivent pas dépasser 1000 caractères.")]
        public ?string $notes = null,
    ) {
    }
}
