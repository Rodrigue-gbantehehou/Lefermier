<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\HealthTreatment;
use App\Entity\User;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, HealthTreatment|Farm>
 */
class HealthTreatmentVoter extends Voter
{
    public const VIEW = 'HEALTH_TREATMENT_VIEW';
    public const CREATE = 'HEALTH_TREATMENT_CREATE';
    public const EDIT = 'HEALTH_TREATMENT_EDIT';
    public const DELETE = 'HEALTH_TREATMENT_DELETE';
    public const COMPLETE = 'HEALTH_TREATMENT_COMPLETE';

    public function __construct(
        private readonly FarmMembershipRepository $membershipRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::CREATE, self::EDIT, self::DELETE, self::COMPLETE], true)) {
            return false;
        }

        return $subject instanceof HealthTreatment || $subject instanceof Farm;
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
        #[\SensitiveParameter] mixed $vote = null
    ): bool {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        $farm = match (true) {
            $subject instanceof HealthTreatment => $subject->getFarm(),
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

        return match ($attribute) {
            self::VIEW => $membership->hasPermission(Permission::HEALTH_VIEW),
            self::CREATE, self::EDIT, self::DELETE, self::COMPLETE => $membership->hasPermission(Permission::HEALTH_MANAGE),
            default => false,
        };
    }
}
