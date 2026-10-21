<?php

declare(strict_types=1);

namespace App\Dto\Farm;

use App\Enum\ProductionType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateFarmRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom de l'exploitation est obligatoire.")]
        #[Assert\Length(max: 150, maxMessage: "Le nom ne doit pas dépasser 150 caractères.")]
        public string $name,

        #[Assert\Length(max: 50, maxMessage: "Le code ne doit pas dépasser 50 caractères.")]
        public ?string $code = null,

        public ProductionType $productionType = ProductionType::MIXED,

        #[Assert\Length(max: 100, maxMessage: "La ville/commune ne doit pas dépasser 100 caractères.")]
        public ?string $locationCity = null,

        #[Assert\Length(exactly: 2, exactMessage: "Le code pays doit comporter 2 caractères.")]
        public string $locationCountry = 'BJ',

        #[Assert\Length(max: 50, maxMessage: "Le téléphone ne doit pas dépasser 50 caractères.")]
        public ?string $phone = null,

        #[Assert\Length(max: 150, maxMessage: "L'e-mail ne doit pas dépasser 150 caractères.")]
        public ?string $email = null,

        #[Assert\Length(max: 255, maxMessage: "L'adresse ne doit pas dépasser 255 caractères.")]
        public ?string $address = null,

        #[Assert\Length(max: 50, maxMessage: "L'IFU ne doit pas dépasser 50 caractères.")]
        public ?string $ifu = null,

        #[Assert\Length(max: 50, maxMessage: "Le RCCM ne doit pas dépasser 50 caractères.")]
        public ?string $rccm = null,

        #[Assert\Length(max: 255, maxMessage: "La description ne doit pas dépasser 255 caractères.")]
        public ?string $description = null,
    ) {
    }
}
