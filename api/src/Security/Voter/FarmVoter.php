<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\ApiKeySecurityChecker;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Farm>
 */
class FarmVoter extends Voter
{
    public const VIEW = 'FARM_VIEW';
    public const EDIT = 'FARM_EDIT';
    public const MANAGE_MEMBERS = 'FARM_MANAGE_MEMBERS';
    public const MANAGE_ROLES = 'FARM_MANAGE_ROLES';
    public const DELETE = 'FARM_DELETE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
        private readonly ApiKeySecurityChecker $apiKeyChecker,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::EDIT, self::MANAGE_MEMBERS, self::MANAGE_ROLES, self::DELETE], true)) {
            return false;
        }

        return $subject instanceof Farm;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, #[\SensitiveParameter] mixed $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Farm $farm */
        $farm = $subject;

        $apiKey = $this->apiKeyChecker->getApiKey();
        if ($apiKey !== null) {
            // Une clé API ne peut jamais supprimer une exploitation ni gérer les membres ou rôles
            if (in_array($attribute, [self::DELETE, self::MANAGE_MEMBERS, self::MANAGE_ROLES], true)) {
                return false;
            }

            $requiredPermission = match ($attribute) {
                self::VIEW => Permission::FARM_VIEW,
                self::EDIT => Permission::FARM_EDIT,
                default => 'none',
            };

            if (!$this->apiKeyChecker->isAccessAllowed($farm, $requiredPermission)) {
                return false;
            }
        } elseif (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        $membership = $this->membershipRepository->findOneBy([
            'farm' => $farm,
            'user' => $user,
            'isActive' => true,
        ]);

        if (!$membership instanceof FarmMembership) {
            return false;
        }

        return match ($attribute) {
            self::VIEW => true, // Tout membre actif d'une ferme a le droit de base de la consulter
            self::EDIT => $membership->hasPermission(Permission::FARM_EDIT),
            self::MANAGE_MEMBERS => $membership->hasPermission(Permission::MEMBER_MANAGE),
            self::MANAGE_ROLES => $membership->hasPermission(Permission::ROLE_MANAGE),
            self::DELETE => $membership->hasPermission(Permission::FARM_DELETE),
            default => false,
        };
    }
}
