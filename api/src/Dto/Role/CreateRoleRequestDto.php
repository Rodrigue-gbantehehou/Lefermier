<?php

declare(strict_types=1);

namespace App\Dto\Role;

use Symfony\Component\Validator\Constraints as Assert;

class CreateRoleRequestDto
{
    #[Assert\NotBlank(message: 'Le nom du rôle est requis.')]
    #[Assert\Length(max: 100, maxMessage: 'Le nom ne peut pas dépasser 100 caractères.')]
    public string $name = '';

    #[Assert\Length(max: 50, maxMessage: 'Le code ne peut pas dépasser 50 caractères.')]
    public ?string $code = null;

    #[Assert\Length(max: 500, maxMessage: 'La description ne peut pas dépasser 500 caractères.')]
    public ?string $description = null;

    /**
     * @var array<string>
     */
    #[Assert\NotNull(message: 'La liste des permissions est requise.')]
    #[Assert\Type(type: 'array', message: 'Les permissions doivent être un tableau de chaînes.')]
    public array $permissions = [];
}
