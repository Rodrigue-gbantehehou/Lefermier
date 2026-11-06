<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Transaction;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\ApiKeySecurityChecker;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Transaction|Farm>
 */
class TransactionVoter extends Voter
{
    public const VIEW = 'TRANSACTION_VIEW';
    public const RECORD = 'TRANSACTION_RECORD';
    public const EDIT = 'TRANSACTION_EDIT';
    public const DELETE = 'TRANSACTION_DELETE';

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

        return $subject instanceof Transaction || $subject instanceof Farm;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, #[\SensitiveParameter] mixed $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        $farm = match (true) {
            $subject instanceof Transaction => $subject->getFarm(),
            $subject instanceof Farm => $subject,
            default => null,
        };

        if ($farm === null) {
            return false;
        }

        $apiKey = $this->apiKeyChecker->getApiKey();
        if ($apiKey !== null) {
            $requiredPermission = match ($attribute) {
                self::VIEW => Permission::FINANCE_VIEW,
                self::RECORD => Permission::FINANCE_CREATE,
                self::EDIT => Permission::FINANCE_EDIT,
                self::DELETE => Permission::FINANCE_DELETE,
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
            self::VIEW => $membership->hasPermission(Permission::FINANCE_VIEW),
            self::RECORD => $membership->hasPermission(Permission::FINANCE_CREATE),
            self::EDIT => $membership->hasPermission(Permission::FINANCE_EDIT) || $membership->hasPermission(Permission::FINANCE_CREATE),
            self::DELETE => $membership->hasPermission(Permission::FINANCE_DELETE) || $membership->hasPermission(Permission::FINANCE_CREATE),
            default => false,
        };
    }
}
