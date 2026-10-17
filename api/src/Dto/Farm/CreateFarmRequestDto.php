<?php

declare(strict_types=1);

namespace App\Dto\Farm;

use App\Enum\ProductionType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateFarmRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom de l'exploitation est obligatoire.")]
        #[Assert\Length(min: 2, max: 150, minMessage: "Le nom doit comporter au moins 2 caractères.", maxMessage: "Le nom ne doit pas dépasser 150 caractères.")]
        public string $name,

        #[Assert\Length(max: 50, maxMessage: "Le code ne doit pas dépasser 50 caractères.")]
        public ?string $code = null,

        public ProductionType $productionType = ProductionType::LAYER,

        #[Assert\Length(max: 100, maxMessage: "La ville/commune ne doit pas dépasser 100 caractères.")]
        public ?string $locationCity = null,

        #[Assert\Length(exactly: 2, exactMessage: "Le code pays doit comporter 2 caractères.")]
        public string $locationCountry = 'BJ',

        public string $currency = 'XOF',
    ) {
    }
}
