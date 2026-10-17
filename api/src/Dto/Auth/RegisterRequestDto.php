<?php

declare(strict_types=1);

namespace App\Dto\Auth;

use App\Enum\ProductionType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class RegisterRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "L'adresse email est obligatoire.")]
        #[Assert\Email(message: "L'adresse email '{{ value }}' n'est pas valide.")]
        #[Assert\Length(max: 180, maxMessage: "L'adresse email ne doit pas dépasser 180 caractères.")]
        public string $email,

        #[Assert\NotBlank(message: "Le mot de passe est obligatoire.")]
        #[Assert\Length(
            min: 8,
            max: 4096,
            minMessage: "Le mot de passe doit comporter au moins 8 caractères."
        )]
        public string $password,

        #[Assert\NotBlank(message: "Le prénom est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le prénom ne doit pas dépasser 100 caractères.")]
        public string $firstName,

        #[Assert\NotBlank(message: "Le nom est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public string $lastName,

        #[Assert\Length(max: 30, maxMessage: "Le numéro de téléphone ne doit pas dépasser 30 caractères.")]
        public ?string $phone = null,

        #[Assert\Length(max: 150, maxMessage: "Le nom de l'organisation ne doit pas dépasser 150 caractères.")]
        public ?string $organizationName = null,

        #[Assert\Length(max: 150, maxMessage: "Le nom de l'exploitation ne doit pas dépasser 150 caractères.")]
        public ?string $farmName = null,

        public ?ProductionType $productionType = null,

        #[Assert\Length(max: 100, maxMessage: "La ville/commune ne doit pas dépasser 100 caractères.")]
        public ?string $locationCity = null,
    ) {
    }
}
