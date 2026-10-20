<?php

declare(strict_types=1);

namespace App\Dto\Health;

use App\Enum\AdministrationMethod;
use App\Enum\HealthTreatmentType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateHealthTreatmentRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "L'identifiant de la bande est obligatoire.")]
        #[Assert\Ulid(message: "L'identifiant de la bande doit être un ULID valide.")]
        public string $flockId,

        #[Assert\NotBlank(message: "Le titre de l'intervention est obligatoire.")]
        #[Assert\Length(max: 150, maxMessage: "Le titre ne doit pas dépasser 150 caractères.")]
        public string $title,

        public HealthTreatmentType $type = HealthTreatmentType::VACCINATION,

        public AdministrationMethod $administrationMethod = AdministrationMethod::DRINKING_WATER,

        #[Assert\NotBlank(message: "La date prévue est obligatoire.")]
        #[Assert\Date(message: "La date prévue doit être au format YYYY-MM-DD.")]
        public string $scheduledDate,

        #[Assert\PositiveOrZero(message: "L'âge cible doit être un entier positif ou nul.")]
        public ?int $targetAgeDays = null,

        #[Assert\Ulid(message: "L'identifiant de l'article de stock doit être un ULID valide.")]
        public ?string $inventoryItemId = null,

        public ?string $quantityUsed = null,

        #[Assert\PositiveOrZero(message: "Le coût en FCFA doit être supérieur ou égal à zéro.")]
        public ?int $costFcfa = null,

        #[Assert\Length(max: 100, maxMessage: "Le nom du vétérinaire ne doit pas dépasser 100 caractères.")]
        public ?string $veterinarian = null,

        public ?string $notes = null,
    ) {
    }
}
