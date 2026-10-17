<?php

declare(strict_types=1);

namespace App\Dto\Flock;

use App\Enum\PoultryType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateFlockRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le code de la bande est obligatoire.")]
        #[Assert\Length(max: 50, maxMessage: "Le code ne doit pas dépasser 50 caractères.")]
        public string $code,

        #[Assert\NotBlank(message: "Le nom de la bande est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public string $name,

        #[Assert\NotNull(message: "L'effectif initial est obligatoire.")]
        #[Assert\Positive(message: "L'effectif initial doit être strictement supérieur à 0.")]
        public int $initialQuantity,

        #[Assert\NotBlank(message: "La date de mise en place est obligatoire.")]
        #[Assert\Date(message: "La date de début doit être au format YYYY-MM-DD.")]
        public string $startDate,

        public PoultryType $poultryType = PoultryType::BROILER,

        #[Assert\Length(max: 100, maxMessage: "La souche ne doit pas dépasser 100 caractères.")]
        public ?string $strain = null,

        #[Assert\PositiveOrZero(message: "L'âge initial en jours doit être positif ou nul.")]
        public int $initialAgeDays = 1,

        #[Assert\Ulid(message: "L'identifiant du bâtiment doit être un ULID valide.")]
        public ?string $buildingId = null,

        #[Assert\Date(message: "La date prévisionnelle de fin doit être au format YYYY-MM-DD.")]
        public ?string $estimatedEndDate = null,

        public ?string $notes = null,
    ) {
    }
}
