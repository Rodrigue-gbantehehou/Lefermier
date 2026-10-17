<?php

declare(strict_types=1);

namespace App\Dto\Transaction;

use App\Enum\PaymentMethod;
use App\Enum\TransactionCategory;
use App\Enum\TransactionType;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class UpdateTransactionRequestDto
{
    public function __construct(
        public TransactionType $type,

        public TransactionCategory $category,

        #[Assert\NotNull(message: "Le montant en FCFA est obligatoire.")]
        #[Assert\Positive(message: "Le montant en FCFA doit être strictement supérieur à 0.")]
        public int $amount,

        #[Assert\NotBlank(message: "La date de la transaction est obligatoire.")]
        #[Assert\Date(message: "La date doit être au format YYYY-MM-DD.")]
        public string $transactionDate,

        public PaymentMethod $paymentMethod = PaymentMethod::CASH,

        #[Assert\Length(max: 100, maxMessage: "La référence ne doit pas dépasser 100 caractères.")]
        public ?string $reference = null,

        #[Assert\Length(max: 255, maxMessage: "La description ne doit pas dépasser 255 caractères.")]
        public ?string $description = null,

        #[Assert\Ulid(message: "L'identifiant du contact doit être un ULID valide.")]
        public ?string $contactId = null,

        #[Assert\Ulid(message: "L'identifiant de la bande doit être un ULID valide.")]
        public ?string $flockId = null,
    ) {
    }
}
