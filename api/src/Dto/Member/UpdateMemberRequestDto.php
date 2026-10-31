<?php

declare(strict_types=1);

namespace App\Dto\Member;

class UpdateMemberRequestDto
{
    /**
     * Identifiant du rôle personnalisé (matrice des rôles).
     */
    public ?string $roleId = null;

    /**
     * Rôle standard (enum FarmRole).
     */
    public ?string $role = null;

    /**
     * Statut actif/inactif du membre sur l'exploitation.
     */
    public ?bool $isActive = null;

    /**
     * Identifiants des poulaillers / bâtiments assignés (null = inchangé, vide = tous les bâtiments).
     * @var array<string>|null
     */
    public ?array $buildingIds = null;
}
