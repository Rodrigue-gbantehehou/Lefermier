<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Building\CreateBuildingRequestDto;
use App\Dto\Building\UpdateBuildingRequestDto;
use App\Dto\Farm\CreateFarmRequestDto;
use App\Dto\Farm\UpdateFarmRequestDto;
use App\Entity\Building;
use App\Entity\Farm;
use App\Entity\FarmMembership;
use App\Entity\Organization;
use App\Entity\User;
use App\Enum\FarmRole;
use App\Repository\BuildingRepository;
use App\Repository\FarmRepository;
use App\Repository\OrganizationRepository;
use App\Service\Admin\CommercialPlanService;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\String\Slugger\SluggerInterface;
use Symfony\Component\Uid\Ulid;

class FarmService
{
    public function __construct(
        private readonly FarmRepository $farmRepository,
        private readonly BuildingRepository $buildingRepository,
        private readonly OrganizationRepository $organizationRepository,
        private readonly CommercialPlanService $commercialPlanService,
        private readonly EntityManagerInterface $entityManager,
        private readonly SluggerInterface $slugger,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getFarmsForUser(User $user): array
    {
        $farms = [];
        foreach ($user->getFarmMemberships() as $membership) {
            if ($membership->isActive()) {
                $farms[] = $this->serializeFarm($membership->getFarm(), $membership->getRole()->value);
            }
        }

        return $farms;
    }

    public function createFarm(User $user, CreateFarmRequestDto $dto): Farm
    {
        // Toute la logique de création est sérialisée dans une transaction InnoDB.
        // assertCanCreateFarm() y est appelé à l'intérieur pour que son verrou pessimiste
        // sur l'organisation soit effectif (isTransactionActive() = true).
        return $this->entityManager->wrapInTransaction(function () use ($user, $dto): Farm {
            // 0. Verrou pessimiste sur le User pour sérialiser les créations concurrentes.
            // Sans ce verrou, deux requêtes simultanées de création de première ferme peuvent
            // toutes deux constater l'absence d'organisation et en créer deux séparément.
            // Avec le verrou, la seconde requête attend le commit de la première, puis lit
            // l'organisation créée, et assertCanCreateFarm() applique correctement le quota.
            $this->entityManager->lock($user, LockMode::PESSIMISTIC_WRITE);
            if ($this->entityManager->contains($user)) {
                $this->entityManager->refresh($user, LockMode::PESSIMISTIC_WRITE);
            }

            $this->commercialPlanService->assertCanCreateFarm($user);

            // 1. Déterminer l'organisation de rattachement du propriétaire
            $organization = null;
            foreach ($user->getFarmMemberships() as $membership) {
                $existingOrg = $membership->getFarm()->getOrganization();
                if ($existingOrg !== null) {
                    $organization = $existingOrg;
                    break;
                }
            }

            // Si l'utilisateur n'a pas encore d'organisation, en créer une
            if ($organization === null) {
                $baseSlug = $this->slugger->slug($dto->name)->lower()->toString();
                if ($baseSlug === '') {
                    $baseSlug = 'organisation';
                }
                $uniqueSlug = $baseSlug;
                $counter = 1;
                while ($this->organizationRepository->findOneBy(['slug' => $uniqueSlug]) !== null) {
                    $uniqueSlug = sprintf('%s-%d', $baseSlug, $counter++);
                }
                $organization = new Organization($dto->name, $uniqueSlug);
                $this->entityManager->persist($organization);
            }

            // 2. Instanciation de la nouvelle exploitation
            $farm = new Farm($organization, $dto->name, $dto->productionType);

            $cleanCode = $dto->code;
            if (!$cleanCode) {
                $cleanCode = sprintf('FRM-%s-%03d', strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $dto->name) ?: 'FARM', 0, 4)), rand(100, 999));
            }
            $farm->setCode($cleanCode);
            $farm->setLocationCity($dto->locationCity);
            $farm->setLocationCountry($dto->locationCountry);
            $farm->setCurrency($dto->currency ?? 'XOF');
            $farm->setPhone($dto->phone);
            $farm->setEmail($dto->email);
            $farm->setAddress($dto->address);
            $farm->setIfu($dto->ifu);
            $farm->setRccm($dto->rccm);
            $farm->setDescription($dto->description);

            $this->entityManager->persist($farm);

            // 3. Attribution automatique du rôle OWNER au créateur
            $membership = new FarmMembership($farm, $user, FarmRole::OWNER);
            $this->entityManager->persist($membership);

            $this->entityManager->flush();

            return $farm;
        });
    }

    public function updateFarm(Farm $farm, UpdateFarmRequestDto $dto): Farm
    {
        $farm->setName($dto->name);
        $farm->setCode($dto->code);
        $farm->setProductionType($dto->productionType);
        $farm->setLocationCity($dto->locationCity);
        $farm->setLocationCountry($dto->locationCountry);
        $farm->setPhone($dto->phone);
        $farm->setEmail($dto->email);
        $farm->setAddress($dto->address);
        $farm->setIfu($dto->ifu);
        $farm->setRccm($dto->rccm);
        $farm->setDescription($dto->description);

        $this->entityManager->flush();

        return $farm;
    }

    public function createBuilding(Farm $farm, CreateBuildingRequestDto $dto): Building
    {
        return $this->entityManager->wrapInTransaction(function () use ($farm, $dto): Building {
            // 0. Contrôle d'accès et des quotas de la formule commerciale sous verrou de l'organisation
            $this->commercialPlanService->assertCanCreateBuilding($farm);

            $building = new Building($farm, $dto->name, $dto->type, $dto->capacity);
            if ($dto->surfaceArea !== null) {
                $building->setSurfaceArea((string) $dto->surfaceArea);
            }

            $this->entityManager->persist($building);
            $this->entityManager->flush();

            return $building;
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getBuildingsForFarm(Farm $farm, bool $onlyActive = false): array
    {
        $criteria = ['farm' => $farm];
        if ($onlyActive) {
            $criteria['isActive'] = true;
        }

        $buildings = $this->buildingRepository->findBy(
            $criteria,
            ['name' => 'ASC']
        );

        return array_map([$this, 'serializeBuilding'], $buildings);
    }

    public function updateBuilding(Building $building, UpdateBuildingRequestDto $dto): Building
    {
        if ($dto->name !== null) {
            $building->setName(trim($dto->name));
        }
        if ($dto->type !== null) {
            $building->setType($dto->type);
        }
        if ($dto->capacity !== null) {
            $building->setCapacity($dto->capacity);
        }
        if ($dto->surfaceArea !== null) {
            $building->setSurfaceArea((string) $dto->surfaceArea);
        }
        if ($dto->isActive !== null) {
            $building->setIsActive($dto->isActive);
        }

        $this->entityManager->flush();

        return $building;
    }

    public function deleteBuilding(Building $building): void
    {
        $this->entityManager->remove($building);
        $this->entityManager->flush();
    }

    public function getBuildingInFarm(Farm $farm, string $buildingId): Building
    {
        try {
            $ulid = Ulid::fromString($buildingId);
        } catch (\InvalidArgumentException) {
            throw new NotFoundHttpException('Bâtiment introuvable.');
        }

        $building = $this->buildingRepository->findOneBy([
            'id' => $ulid,
            'farm' => $farm,
        ]);

        if ($building === null) {
            throw new NotFoundHttpException('Bâtiment introuvable pour cette ferme.');
        }

        return $building;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeFarm(Farm $farm, ?string $role = null): array
    {
        $data = [
            'id' => $farm->getId()?->toBase32(),
            'name' => $farm->getName(),
            'code' => $farm->getCode(),
            'productionType' => $farm->getProductionType()->value,
            'currency' => $farm->getCurrency(),
            'locationCity' => $farm->getLocationCity(),
            'locationCountry' => $farm->getLocationCountry(),
            'phone' => $farm->getPhone(),
            'email' => $farm->getEmail(),
            'address' => $farm->getAddress(),
            'ifu' => $farm->getIfu(),
            'rccm' => $farm->getRccm(),
            'description' => $farm->getDescription(),
            'createdAt' => $farm->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $farm->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];

        if ($role !== null) {
            $data['role'] = $role;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeBuilding(Building $building): array
    {
        return [
            'id' => $building->getId()?->toBase32(),
            'farmId' => $building->getFarm()->getId()?->toBase32(),
            'name' => $building->getName(),
            'type' => $building->getType()->value,
            'capacity' => $building->getCapacity(),
            'surfaceArea' => $building->getSurfaceArea() !== null ? (float) $building->getSurfaceArea() : null,
            'isActive' => $building->isActive(),
            'createdAt' => $building->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    public function deleteFarm(Farm $farm): void
    {
        $this->entityManager->remove($farm);
        $this->entityManager->flush();
    }
}
