<?php

declare(strict_types=1);

namespace App\Service\Admin;

use App\Entity\AdminAuditLog;
use App\Entity\User;
use App\Repository\AdminAuditLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

class AdminAuditService
{
    public function __construct(
        private readonly AdminAuditLogRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
        private readonly RequestStack $requestStack,
    ) {
    }

    /**
     * Enregistre un événement d'audit sensible dans la base de données.
     */
    public function log(
        string $action,
        string $label,
        string $targetType,
        string $targetId,
        string $targetName,
        string $details,
        string $status = 'SUCCESS',
        ?User $actor = null,
        ?string $fallbackActorEmail = null,
    ): AdminAuditLog {
        if ($actor === null) {
            $user = $this->security->getUser();
            if ($user instanceof User) {
                $actor = $user;
            }
        }

        $request = $this->requestStack->getCurrentRequest();
        $clientIp = $request?->getClientIp() ?? '127.0.0.1';

        $actorId = $actor?->getId()?->toBase32();
        $actorEmail = $actor?->getEmail() ?? $fallbackActorEmail ?? 'system@lefermier.bj';
        $actorName = $actor?->getFullName() ?? $fallbackActorEmail ?? 'Système';
        $actorRole = $actor?->getAdminRole()?->getName()
            ?? ($actor !== null
                ? (in_array('ROLE_SUPER_ADMIN', $actor->getRoles(), true) ? 'Super-Administrateur' : 'Utilisateur')
                : ($fallbackActorEmail ? 'Visiteur' : 'Système'));

        $log = new AdminAuditLog(
            actorEmail: $actorEmail,
            actorName: $actorName,
            actorRole: $actorRole,
            action: $action,
            label: $label,
            targetType: $targetType,
            targetId: $targetId,
            targetName: $targetName,
            details: $details,
            actorId: $actorId,
            clientIp: $clientIp,
            status: $status,
        );

        $this->entityManager->persist($log);
        $this->entityManager->flush();

        return $log;
    }

    /**
     * Recherche paginée des logs d'audit.
     */
    public function listLogs(
        int $page = 1,
        int $limit = 50,
        ?string $action = null,
        ?string $search = null
    ): array {
        return $this->repository->findPaginated($page, $limit, $action, $search);
    }
}
