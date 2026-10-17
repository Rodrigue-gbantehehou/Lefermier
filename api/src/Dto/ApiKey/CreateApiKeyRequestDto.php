<?php

declare(strict_types=1);

namespace App\Dto\ApiKey;

use Symfony\Component\Validator\Constraints as Assert;

class CreateApiKeyRequestDto
{
    #[Assert\NotBlank(message: 'Le nom de la clé API est requis.')]
    #[Assert\Length(max: 100, maxMessage: 'Le nom ne peut pas dépasser 100 caractères.')]
    public string $name = '';

    /**
     * @var array<string>
     */
    #[Assert\Type(type: 'array', message: 'Les scopes doivent être un tableau.')]
    public array $scopes = ['*'];

    #[Assert\Choice(choices: ['live', 'test'], message: 'L\'environnement doit être live ou test.')]
    public string $environment = 'live';

    #[Assert\Positive(message: 'La durée de validité en jours doit être positive.')]
    public ?int $expiresInDays = null;
}
