<?php

declare(strict_types=1);

namespace App\Dto\Contact;

use App\Enum\ContactType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreateContactRequestDto
{
    public function __construct(
        #[Assert\NotBlank(message: "Le nom ou raison sociale du contact est obligatoire.")]
        #[Assert\Length(max: 150, maxMessage: "Le nom ne doit pas dépasser 150 caractères.")]
        public string $name,

        public ContactType $type = ContactType::CLIENT,

        #[Assert\Length(max: 30, maxMessage: "Le numéro de téléphone ne doit pas dépasser 30 caractères.")]
        public ?string $phone = null,

        #[Assert\Email(message: "L'adresse email n'est pas valide.")]
        #[Assert\Length(max: 180, maxMessage: "L'email ne doit pas dépasser 180 caractères.")]
        public ?string $email = null,

        #[Assert\Length(max: 255, maxMessage: "L'adresse ne doit pas dépasser 255 caractères.")]
        public ?string $address = null,

        #[Assert\Length(max: 100, maxMessage: "La ville ne doit pas dépasser 100 caractères.")]
        public ?string $city = null,

        #[Assert\Length(max: 1000, maxMessage: "Les notes ne doivent pas dépasser 1000 caractères.")]
        public ?string $notes = null,
    ) {
    }
}
