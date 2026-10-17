<?php

declare(strict_types=1);

namespace App\Dto\Role;

use Symfony\Component\Validator\Constraints as Assert;

class UpdateRoleRequestDto
{
    #[Assert\Length(max: 100, maxMessage: 'Le nom ne peut pas dépasser 100 caractères.')]
    public ?string $name = null;

    #[Assert\Length(max: 500, maxMessage: 'La description ne peut pas dépasser 500 caractères.')]
    public ?string $description = null;

    /**
     * @var array<string>|null
     */
    #[Assert\Type(type: 'array', message: 'Les permissions doivent être un tableau de chaînes.')]
    public ?array $permissions = null;
}
