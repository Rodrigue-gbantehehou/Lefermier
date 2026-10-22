<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\FarmRole;
use App\Repository\FarmMembershipRepository;
use App\Security\Permission;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: FarmMembershipRepository::class)]
#[ORM\Table(name: 'farm_memberships')]
#[ORM\UniqueConstraint(name: 'uniq_farm_user', columns: ['farm_id', 'user_id'])]
#[ORM\HasLifecycleCallbacks]
class FarmMembership
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class, inversedBy: 'farmMemberships')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'farmMemberships')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::STRING, length: 30, enumType: FarmRole::class)]
    private FarmRole $role;

    #[ORM\ManyToOne(targetEntity: Role::class)]
    #[ORM\JoinColumn(name: 'role_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Role $roleDefinition = null;

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        Farm $farm,
        User $user,
        FarmRole $role = FarmRole::OWNER,
        ?Role $roleDefinition = null,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->user = $user;
        $this->role = $role;
        $this->roleDefinition = $roleDefinition;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function setFarm(Farm $farm): self
    {
        $this->farm = $farm;
        return $this;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getRole(): FarmRole
    {
        return $this->role;
    }

    public function setRole(FarmRole $role): self
    {
        $this->role = $role;
        return $this;
    }

    public function getRoleDefinition(): ?Role
    {
        return $this->roleDefinition;
    }

    public function setRoleDefinition(?Role $roleDefinition): self
    {
        $this->roleDefinition = $roleDefinition;
        return $this;
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->roleDefinition !== null) {
            return $this->roleDefinition->hasPermission($permission);
        }

        // Rétrocompatibilité élégante avec les rôles par défaut enum
        return match ($this->role) {
            FarmRole::OWNER => true,
            FarmRole::ADMIN, FarmRole::MANAGER => $permission !== Permission::FARM_DELETE,
            FarmRole::PRODUCTION_LEAD => in_array($permission, [
                Permission::FLOCK_VIEW,
                Permission::FLOCK_CREATE,
                Permission::FLOCK_MOVEMENT,
                Permission::EGG_VIEW,
                Permission::EGG_CREATE,
                Permission::INVENTORY_VIEW,
                Permission::INVENTORY_MOVEMENT,
                Permission::DASHBOARD_VIEW,
            ], true),
            FarmRole::STOCK_KEEPER => in_array($permission, [
                Permission::INVENTORY_VIEW,
                Permission::INVENTORY_CREATE,
                Permission::INVENTORY_MOVEMENT,
                Permission::INVENTORY_VALUATION,
                Permission::DASHBOARD_VIEW,
            ], true),
            FarmRole::ACCOUNTANT => in_array($permission, [
                Permission::FINANCE_VIEW,
                Permission::FINANCE_CREATE,
                Permission::FINANCE_MARGIN,
                Permission::CONTACT_VIEW,
                Permission::CONTACT_CREATE,
                Permission::DASHBOARD_VIEW,
                Permission::DASHBOARD_FINANCIALS,
            ], true),
            FarmRole::VET_CONSULTANT => in_array($permission, [
                Permission::HEALTH_VIEW,
                Permission::HEALTH_MANAGE,
                Permission::FLOCK_VIEW,
                Permission::INVENTORY_VIEW,
                Permission::DASHBOARD_VIEW,
            ], true),
        };
    }

    /**
     * @return array<string>
     */
    public function getPermissions(): array
    {
        if ($this->roleDefinition !== null) {
            return $this->roleDefinition->getPermissions();
        }

        return match ($this->role) {
            FarmRole::OWNER => ['*'],
            FarmRole::ADMIN, FarmRole::MANAGER => array_values(array_diff(array_keys(Permission::all()), [Permission::FARM_DELETE])),
            FarmRole::PRODUCTION_LEAD => [
                Permission::FLOCK_VIEW,
                Permission::FLOCK_CREATE,
                Permission::FLOCK_MOVEMENT,
                Permission::EGG_VIEW,
                Permission::EGG_CREATE,
                Permission::INVENTORY_VIEW,
                Permission::INVENTORY_MOVEMENT,
                Permission::DASHBOARD_VIEW,
            ],
            FarmRole::STOCK_KEEPER => [
                Permission::INVENTORY_VIEW,
                Permission::INVENTORY_CREATE,
                Permission::INVENTORY_MOVEMENT,
                Permission::INVENTORY_VALUATION,
                Permission::DASHBOARD_VIEW,
            ],
            FarmRole::ACCOUNTANT => [
                Permission::FINANCE_VIEW,
                Permission::FINANCE_CREATE,
                Permission::FINANCE_MARGIN,
                Permission::CONTACT_VIEW,
                Permission::CONTACT_CREATE,
                Permission::DASHBOARD_VIEW,
                Permission::DASHBOARD_FINANCIALS,
            ],
            FarmRole::VET_CONSULTANT => [
                Permission::HEALTH_VIEW,
                Permission::HEALTH_MANAGE,
                Permission::FLOCK_VIEW,
                Permission::INVENTORY_VIEW,
                Permission::DASHBOARD_VIEW,
            ],
        };
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    #[ORM\PreUpdate]
    public function updateTimestamp(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
