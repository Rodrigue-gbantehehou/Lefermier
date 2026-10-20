<?php

declare(strict_types=1);

namespace App\Dto\Health;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class GenerateProphylaxisProgramRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "L'identifiant de la bande est obligatoire.")]
        #[Assert\Ulid(message: "L'identifiant de la bande doit être un ULID valide.")]
        public string $flockId,

        public ?string $programType = null,
    ) {
    }
}
