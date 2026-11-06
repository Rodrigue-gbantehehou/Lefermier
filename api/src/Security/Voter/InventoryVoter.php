<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\InventoryItem;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\ApiKeySecurityChecker;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, InventoryItem|Farm>
 */
class InventoryVoter extends Voter
{
    public const VIEW = 'INVENTORY_VIEW';
    public const CREATE = 'INVENTORY_CREATE';
    public const EDIT = 'INVENTORY_EDIT';
    public const MOVE = 'INVENTORY_MOVE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
        private readonly ApiKeySecurityChecker $apiKeyChecker,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::CREATE, self::EDIT, self::MOVE], true)) {
            return false;
        }

        return $subject instanceof InventoryItem || $subject instanceof Farm;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, #[\SensitiveParameter] mixed $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        $farm = match (true) {
            $subject instanceof InventoryItem => $subject->getFarm(),
            $subject instanceof Farm => $subject,
            default => null,
        };

        if ($farm === null) {
            return false;
        }

        $apiKey = $this->apiKeyChecker->getApiKey();
        if ($apiKey !== null) {
            $requiredPermission = match ($attribute) {
                self::VIEW => Permission::INVENTORY_VIEW,
                self::CREATE => Permission::INVENTORY_CREATE,
                self::EDIT => Permission::INVENTORY_EDIT,
                self::MOVE => Permission::INVENTORY_MOVEMENT,
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
            self::VIEW => $membership->hasPermission(Permission::INVENTORY_VIEW),
            self::CREATE => $membership->hasPermission(Permission::INVENTORY_CREATE),
            self::EDIT => $membership->hasPermission(Permission::INVENTORY_EDIT) || $membership->hasPermission(Permission::INVENTORY_CREATE),
            self::MOVE => $membership->hasPermission(Permission::INVENTORY_MOVEMENT),
            default => false,
        };
    }
}
