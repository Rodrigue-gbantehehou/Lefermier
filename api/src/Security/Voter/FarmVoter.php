<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
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
    public const DELETE = 'FARM_DELETE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::EDIT, self::MANAGE_MEMBERS, self::DELETE], true)) {
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

        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        /** @var Farm $farm */
        $farm = $subject;

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
            self::DELETE => $membership->hasPermission(Permission::FARM_DELETE),
            default => false,
        };
    }
}
