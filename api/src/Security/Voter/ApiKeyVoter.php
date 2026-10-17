<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\ApiKey;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, mixed>
 */
class ApiKeyVoter extends Voter
{
    public const MANAGE = 'API_KEY_MANAGE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if ($attribute !== self::MANAGE) {
            return false;
        }

        return $subject instanceof Farm || $subject instanceof ApiKey;
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

        $farm = $subject instanceof ApiKey ? $subject->getFarm() : $subject;

        $membership = $this->membershipRepository->findOneBy([
            'farm' => $farm,
            'user' => $user,
            'isActive' => true,
        ]);

        if (!$membership instanceof FarmMembership) {
            return false;
        }

        return $membership->hasPermission(Permission::API_KEY_MANAGE);
    }
}
