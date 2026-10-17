<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\FarmMembership;
use App\Entity\InventoryItem;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, InventoryItem>
 */
class InventoryVoter extends Voter
{
    public const VIEW = 'INVENTORY_VIEW';
    public const EDIT = 'INVENTORY_EDIT';
    public const MOVE = 'INVENTORY_MOVE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::EDIT, self::MOVE], true)) {
            return false;
        }

        return $subject instanceof InventoryItem;
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

        /** @var InventoryItem $item */
        $item = $subject;

        $membership = $this->membershipRepository->findOneBy([
            'farm' => $item->getFarm(),
            'user' => $user,
            'isActive' => true,
        ]);

        if (!$membership instanceof FarmMembership) {
            return false;
        }

        return match ($attribute) {
            self::VIEW => $membership->hasPermission(Permission::INVENTORY_VIEW),
            self::EDIT => $membership->hasPermission(Permission::INVENTORY_CREATE),
            self::MOVE => $membership->hasPermission(Permission::INVENTORY_MOVEMENT),
            default => false,
        };
    }
}
