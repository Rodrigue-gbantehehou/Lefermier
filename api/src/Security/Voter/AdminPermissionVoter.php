<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Voter de sécurité évaluant les permissions granulaires de la console d'administration.
 *
 * Déclenchement sur tout attribut préfixé par "admin:" (ex: admin:organizations:suspend).
 */
class AdminPermissionVoter extends Voter
{
    protected function supports(string $attribute, mixed $subject): bool
    {
        return str_starts_with($attribute, 'admin:');
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?\Symfony\Component\Security\Core\Authorization\Voter\Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return $user->hasAdminPermission($attribute);
    }
}
