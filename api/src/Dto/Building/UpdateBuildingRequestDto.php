<?php

declare(strict_types=1);

namespace App\Dto\Building;

use App\Enum\BuildingType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateBuildingRequestDto
{
    public function __construct(
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public ?string $name = null,

        public ?BuildingType $type = null,

        #[Assert\PositiveOrZero(message: "La capacité doit être un nombre positif ou nul.")]
        public ?int $capacity = null,

        #[Assert\Positive(message: "La surface doit être strictement positive si renseignée.")]
        public ?float $surfaceArea = null,

        public ?bool $isActive = null,
    ) {
    }
}
