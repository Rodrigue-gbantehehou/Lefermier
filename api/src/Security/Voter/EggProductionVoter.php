<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\EggProduction;
use App\Entity\FarmMembership;
use App\Entity\Flock;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, EggProduction|Flock>
 */
class EggProductionVoter extends Voter
{
    public const VIEW = 'EGG_PRODUCTION_VIEW';
    public const RECORD = 'EGG_PRODUCTION_RECORD';
    public const EDIT = 'EGG_PRODUCTION_EDIT';
    public const DELETE = 'EGG_PRODUCTION_DELETE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::RECORD, self::EDIT, self::DELETE], true)) {
            return false;
        }

        return $subject instanceof EggProduction || $subject instanceof Flock;
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
            $subject instanceof EggProduction => $subject->getFlock()->getFarm(),
            $subject instanceof Flock => $subject->getFarm(),
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

        return match ($attribute) {
            self::VIEW => $membership->hasPermission(Permission::EGG_VIEW),
            self::RECORD, self::EDIT, self::DELETE => $membership->hasPermission(Permission::EGG_CREATE),
            default => false,
        };
    }
}
