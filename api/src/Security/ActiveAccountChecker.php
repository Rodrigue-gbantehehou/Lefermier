<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * UserChecker enregistré sur les firewalls `login` et `api`.
 *
 * Problème résolu : désactiver un compte via l'admin révoque les refresh tokens (AdminUserService),
 * mais les JWT déjà émis restent valides jusqu'à leur expiration naturelle. Sans ce checker,
 * un compte désactivé peut continuer à appeler toutes les routes protégées jusqu'à l'expiration
 * de son JWT (souvent 1 heure ou plus).
 *
 * Ce checker est invoqué par Symfony après chaque chargement de l'entité User depuis le provider
 * (validation JWT, json_login, ApiKey). Il coupe l'accès avant même que les contrôleurs ne
 * soient invoqués, sur tous les chemins d'authentification en une seule déclaration YAML.
 */
final class ActiveAccountChecker implements UserCheckerInterface
{
    /**
     * Appelé avant l'authentification (vérification des credentials).
     * Bloque le login par email/password si le compte est déjà désactivé.
     */
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }

        if (!$user->isActive()) {
            throw new CustomUserMessageAccountStatusException(
                'Ce compte a été désactivé par un administrateur.',
                [],
                403
            );
        }
    }

    /**
     * Appelé après l'authentification réussie (après validation JWT, ApiKey, etc.).
     * Le paramètre $token est optionnel (Symfony 7+) ; on n'en a pas besoin ici.
     */
    public function checkPostAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
        if (!$user instanceof User) {
            return;
        }

        if (!$user->isActive()) {
            throw new CustomUserMessageAccountStatusException(
                'Ce compte a été désactivé par un administrateur.',
                [],
                403
            );
        }
    }
}
