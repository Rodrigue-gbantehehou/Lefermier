<?php

declare(strict_types=1);

namespace App\Dto\Flock;

use App\Enum\FlockStatus;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateFlockRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom de la bande est obligatoire.")]
        #[Assert\Length(max: 100, maxMessage: "Le nom ne doit pas dépasser 100 caractères.")]
        public string $name,

        #[Assert\Length(max: 100, maxMessage: "La souche ne doit pas dépasser 100 caractères.")]
        public ?string $strain = null,

        #[Assert\Ulid(message: "L'identifiant du bâtiment doit être un ULID valide.")]
        public ?string $buildingId = null,

        #[Assert\Date(message: "La date prévisionnelle de fin doit être au format YYYY-MM-DD.")]
        public ?string $estimatedEndDate = null,

        #[Assert\Date(message: "La date effective de clôture doit être au format YYYY-MM-DD.")]
        public ?string $actualEndDate = null,

        public FlockStatus $status = FlockStatus::ACTIVE,

        public ?string $notes = null,
    ) {
    }
}
