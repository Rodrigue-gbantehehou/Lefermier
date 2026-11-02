<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Flock;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Flock|Farm>
 */
class FlockVoter extends Voter
{
    public const VIEW = 'FLOCK_VIEW';
    public const CREATE = 'FLOCK_CREATE';
    public const EDIT = 'FLOCK_EDIT';
    public const MOVE = 'FLOCK_MOVE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::CREATE, self::EDIT, self::MOVE], true)) {
            return false;
        }

        return $subject instanceof Flock || $subject instanceof Farm;
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

        $farm = match (true) {
            $subject instanceof Flock => $subject->getFarm(),
            $subject instanceof Farm => $subject,
            default => null,
        };

        if ($farm === null) {
            return false;
        }

        $membership = $this->membershipRepository->findOneBy([
            'farm' => $farm,
            'user' => $user,
            'isActive' => true,
        ]);

        if (!$membership instanceof FarmMembership) {
            return false;
        }

        // Si l'action cible une bande précise, vérifier si le bâtiment est assigné au membre
        if ($subject instanceof Flock && $membership->hasBuildingRestrictions()) {
            if (!$membership->isBuildingAssigned($subject->getBuilding())) {
                return false;
            }
        }

        return match ($attribute) {
            self::VIEW => $membership->hasPermission(Permission::FLOCK_VIEW),
            self::CREATE => $membership->hasPermission(Permission::FLOCK_CREATE),
            self::EDIT => $membership->hasPermission(Permission::FLOCK_CREATE),
            self::MOVE => $membership->hasPermission(Permission::FLOCK_MOVEMENT),
            default => false,
        };
    }
}
