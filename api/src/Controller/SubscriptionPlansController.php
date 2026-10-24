<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Farm;
use App\Repository\FarmRepository;
use App\Service\Admin\CommercialPlanService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Endpoints publics (utilisateurs connectés) pour la consultation des offres
 * et la demande de changement d'abonnement.
 */
#[Route('/api/subscriptions', name: 'api_subscriptions_')]
#[IsGranted('ROLE_USER')]
class SubscriptionPlansController extends AbstractController
{
    public function __construct(
        private readonly CommercialPlanService $planService,
        private readonly FarmRepository $farmRepository,
        private readonly \Doctrine\ORM\EntityManagerInterface $entityManager,
        private readonly \App\Service\Admin\AdminAuditService $auditService,
    ) {
    }

    /**
     * Catalogue des offres destinées aux éleveurs.
     *
     * Retourne les offres publiées et disponibles, séparées par visibilité :
     * - "data"        : Offres publiques (isVisibilityPublic = true)
     * - "privateData" : Offres privées / sur devis (isVisibilityPublic = false)
     *                   affichées avec un CTA "Contacter" côté frontend.
     *
     * GET /api/subscriptions/plans
     */
    #[Route('/plans', name: 'plans', methods: ['GET'])]
    public function plans(): JsonResponse
    {
        $allPlans = array_values($this->planService->getPlans());

        // Filtrer : offres publiées, disponibles et publiques uniquement
        // Les offres privées (sur devis / réservées) ne doivent pas s'afficher dans le catalogue public
        $publicPlans = array_values(array_filter($allPlans, static function (array $plan): bool {
            return ($plan['status'] ?? 'PUBLISHED') === 'PUBLISHED'
                && ($plan['isAvailable'] ?? true) === true
                && ($plan['isVisibilityPublic'] ?? true) === true;
        }));

        return $this->json([
            'status'       => 'success',
            'data'         => [
                'publicPlans'  => $publicPlans,
                'privatePlans' => [],
            ],
            'publicPlans'  => $publicPlans,
            'privatePlans' => [],
        ]);
    }


    /**
     * Statut de la souscription d'une ferme spécifique.
     *
     * GET /api/subscriptions/farm/{farmId}
     */
    #[Route('/farm/{farmId}', name: 'farm_plan', methods: ['GET'])]
    public function farmPlan(string $farmId): JsonResponse
    {
        $user = $this->getUser();
        $farm = $this->farmRepository->find($farmId);

        if (!$farm instanceof Farm) {
            return $this->json([
                'status' => 'error',
                'message' => 'Ferme introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Vérifier que l'utilisateur est bien membre de cette ferme
        $isMember = false;
        foreach ($farm->getFarmMemberships() as $membership) {
            if ($membership->getUser() === $user && $membership->isActive()) {
                $isMember = true;
                break;
            }
        }

        if (!$isMember) {
            return $this->json([
                'status' => 'error',
                'message' => 'Accès refusé à cette ferme.',
            ], Response::HTTP_FORBIDDEN);
        }

        $org = $farm->getOrganization();
        if (!$org) {
            return $this->json([
                'status' => 'error',
                'message' => 'Organisation non trouvée.',
            ], Response::HTTP_NOT_FOUND);
        }

        $planSku = strtoupper($org->getSubscriptionPlan());
        $plan = $this->planService->getPlan($planSku) ?? $this->planService->getPlan('FREE');

        return $this->json([
            'status' => 'success',
            'data' => [
                'currentPlan' => $plan,
                'orgStatus' => $org->getStatus()->value,
            ],
        ]);
    }

    /**
     * Demande de changement d'offre par l'éleveur propriétaire.
     *
     * POST /api/subscriptions/request-upgrade
     * Body: { "farmId": "...", "targetPlan": "PRO" }
     *
     * Cette route ne change pas directement le plan mais génère
     * une notification interne pour l'équipe commerciale.
     * En production, elle peut déclencher un email/webhook.
     */
    #[Route('/request-upgrade', name: 'request_upgrade', methods: ['POST'])]
    public function requestUpgrade(Request $request): JsonResponse
    {
        $user = $this->getUser();
        $payload = $request->toArray();

        $farmId = trim((string) ($payload['farmId'] ?? ''));
        $targetPlan = strtoupper(trim((string) ($payload['targetPlan'] ?? '')));
        $message = trim((string) ($payload['message'] ?? ''));

        if ($farmId === '' || $targetPlan === '') {
            return $this->json([
                'status' => 'error',
                'message' => 'Les champs farmId et targetPlan sont requis.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $farm = $this->farmRepository->find($farmId);
        if (!$farm instanceof Farm) {
            return $this->json([
                'status' => 'error',
                'message' => 'Ferme introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Vérifier que l'utilisateur est propriétaire de cette ferme
        $isOwner = false;
        foreach ($farm->getFarmMemberships() as $membership) {
            if ($membership->getUser() === $user && $membership->isActive() && $membership->getRole() === \App\Enum\FarmRole::OWNER) {
                $isOwner = true;
                break;
            }
        }

        if (!$isOwner) {
            return $this->json([
                'status' => 'error',
                'message' => 'Seul le propriétaire de la ferme peut demander un changement d\'offre.',
            ], Response::HTTP_FORBIDDEN);
        }

        $targetPlanData = $this->planService->getPlan($targetPlan);
        if ($targetPlanData === null) {
            return $this->json([
                'status' => 'error',
                'message' => sprintf('L\'offre "%s" n\'existe pas dans notre catalogue.', $targetPlan),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $org = $farm->getOrganization();
        if (!$org) {
            return $this->json([
                'status' => 'error',
                'message' => 'Organisation rattachée introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        $currentPlan = strtoupper($org->getSubscriptionPlan());

        // Enregistrer la demande formelle en base de données
        $upgradeRequest = new \App\Entity\SubscriptionUpgradeRequest(
            farm: $farm,
            organization: $org,
            user: $user,
            currentPlan: $currentPlan,
            targetPlan: $targetPlan,
            targetPlanName: $targetPlanData['name'],
            billingCycle: (string) ($payload['billingCycle'] ?? 'MONTHLY'),
            message: $message !== '' ? $message : null,
        );

        $this->entityManager->persist($upgradeRequest);
        $this->entityManager->flush();

        // Enregistrer l'événement dans le journal d'audit de la plateforme (visible dans Admin > Audit)
        $this->auditService->log(
            action: 'SUBSCRIPTION_UPGRADE_REQUEST',
            label: 'Demande de changement d\'offre',
            targetType: 'ORGANIZATION',
            targetId: $org->getId()?->toBase32() ?? $farmId,
            targetName: $farm->getName(),
            details: sprintf(
                'L\'éleveur %s (%s) demande le passage de la ferme "%s" (%s) à l\'offre "%s" (%s).%s',
                method_exists($user, 'getFullName') ? $user->getFullName() : $user->getUserIdentifier(),
                method_exists($user, 'getEmail') ? $user->getEmail() : '',
                $farm->getName(),
                $currentPlan,
                $targetPlanData['name'],
                $targetPlan,
                $message !== '' ? ' Message : "' . $message . '"' : ''
            ),
            actor: $user,
        );

        return $this->json([
            'status' => 'success',
            'message' => sprintf(
                'Votre demande de passage à l\'offre "%s" a été enregistrée. Notre équipe vous contactera sous 24h pour finaliser l\'activation.',
                $targetPlanData['name']
            ),
            'data' => [
                'requestId' => $upgradeRequest->getId()->toBase32(),
                'farmId' => $farmId,
                'farmName' => $farm->getName(),
                'currentPlan' => $currentPlan,
                'requestedPlan' => $targetPlan,
                'requestedPlanName' => $targetPlanData['name'],
                'userEmail' => method_exists($user, 'getEmail') ? $user->getEmail() : null,
                'message' => $message,
                'status' => 'PENDING',
            ],
        ]);
    }
}
