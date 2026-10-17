<?php

declare(strict_types=1);

namespace App\Dto\Building;

use App\Enum\BuildingType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateBuildingRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom ou numéro du bâtiment est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public string $name,

        public BuildingType $type = BuildingType::POULTRY_HOUSE,

        #[Assert\NotNull(message: "La capacité d'accueil est obligatoire.")]
        #[Assert\PositiveOrZero(message: "La capacité doit être un nombre positif ou nul.")]
        public int $capacity = 0,

        #[Assert\Positive(message: "La surface doit être strictement positive si renseignée.")]
        public ?float $surfaceArea = null,
    ) {
    }
}
