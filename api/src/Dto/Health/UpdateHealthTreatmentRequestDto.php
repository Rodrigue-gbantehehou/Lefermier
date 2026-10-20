<?php

declare(strict_types=1);

namespace App\Dto\Health;

use App\Enum\AdministrationMethod;
use App\Enum\HealthTreatmentStatus;
use App\Enum\HealthTreatmentType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateHealthTreatmentRequestDto
{
    public function __construct(
        #[Assert\Length(max: 150, maxMessage: "Le titre ne doit pas dépasser 150 caractères.")]
        public ?string $title = null,

        public ?HealthTreatmentType $type = null,

        public ?AdministrationMethod $administrationMethod = null,

        #[Assert\PositiveOrZero(message: "L'âge cible doit être un entier positif ou nul.")]
        public ?int $targetAgeDays = null,

        #[Assert\Date(message: "La date prévue doit être au format YYYY-MM-DD.")]
        public ?string $scheduledDate = null,

        #[Assert\Date(message: "La date d'administration doit être au format YYYY-MM-DD.")]
        public ?string $administeredDate = null,

        public ?HealthTreatmentStatus $status = null,

        public ?string $quantityUsed = null,

        #[Assert\PositiveOrZero(message: "Le coût en FCFA doit être supérieur ou égal à zéro.")]
        public ?int $costFcfa = null,

        #[Assert\Length(max: 100, maxMessage: "Le nom du vétérinaire ne doit pas dépasser 100 caractères.")]
        public ?string $veterinarian = null,

        public ?string $notes = null,

        #[Assert\Ulid(message: "L'identifiant de l'article de stock doit être un ULID valide.")]
        public ?string $inventoryItemId = null,
    ) {
    }
}
