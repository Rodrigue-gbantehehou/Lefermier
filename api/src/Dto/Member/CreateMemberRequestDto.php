<?php

declare(strict_types=1);

namespace App\Dto\Member;

use Symfony\Component\Validator\Constraints as Assert;

class CreateMemberRequestDto
{
    #[Assert\NotBlank(message: 'L\'adresse email est requise.')]
    #[Assert\Email(message: 'L\'adresse email n\'est pas valide.')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Le prénom est requis.')]
    #[Assert\Length(max: 100)]
    public string $firstName = '';

    #[Assert\NotBlank(message: 'Le nom est requis.')]
    #[Assert\Length(max: 100)]
    public string $lastName = '';

    #[Assert\Length(max: 30)]
    public ?string $phone = null;

    /**
     * Identifiant du rôle personnalisé (matrice des rôles).
     */
    public ?string $roleId = null;

    /**
     * Rôle standard (enum FarmRole : MANAGER, PRODUCTION_LEAD, STOCK_KEEPER, ACCOUNTANT).
     */
    public ?string $role = null;

    /**
     * Mot de passe initial pour le compte (si nouvel utilisateur).
     */
    #[Assert\Length(min: 6, minMessage: 'Le mot de passe doit comporter au moins 6 caractères.')]
    public ?string $password = null;
}
