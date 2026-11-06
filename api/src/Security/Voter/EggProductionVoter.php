<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\EggProduction;
use App\Entity\FarmMembership;
use App\Entity\Flock;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\ApiKeySecurityChecker;
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
        private readonly ApiKeySecurityChecker $apiKeyChecker,
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

        $farm = match (true) {
            $subject instanceof EggProduction => $subject->getFlock()->getFarm(),
            $subject instanceof Flock => $subject->getFarm(),
            default => null,
        };

        if ($farm === null) {
            return false;
        }

        $apiKey = $this->apiKeyChecker->getApiKey();
        if ($apiKey !== null) {
            $requiredPermission = match ($attribute) {
                self::VIEW => Permission::EGG_VIEW,
                self::RECORD => Permission::EGG_CREATE,
                self::EDIT => Permission::EGG_EDIT,
                self::DELETE => Permission::EGG_DELETE,
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

        $flock = match (true) {
            $subject instanceof EggProduction => $subject->getFlock(),
            $subject instanceof Flock => $subject,
            default => null,
        };

        if ($flock !== null && $membership->hasBuildingRestrictions()) {
            if (!$membership->isBuildingAssigned($flock->getBuilding())) {
                return false;
            }
        }

        return match ($attribute) {
            self::VIEW => $membership->hasPermission(Permission::EGG_VIEW),
            self::RECORD => $membership->hasPermission(Permission::EGG_CREATE),
            self::EDIT => $membership->hasPermission(Permission::EGG_EDIT) || $membership->hasPermission(Permission::EGG_CREATE),
            self::DELETE => $membership->hasPermission(Permission::EGG_DELETE) || $membership->hasPermission(Permission::EGG_CREATE),
            default => false,
        };
    }
}
