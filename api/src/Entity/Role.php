<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\RoleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: RoleRepository::class)]
#[ORM\Table(name: 'farm_roles')]
#[ORM\Index(columns: ['farm_id'], name: 'idx_roles_farm')]
#[ORM\UniqueConstraint(name: 'uniq_farm_role_code', columns: ['farm_id', 'code'])]
#[ORM\HasLifecycleCallbacks]
class Role
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private Ulid $id;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(name: 'farm_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 60)]
    private string $code;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    /**
     * @var array<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $permissions = [];

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isSystem = false;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @param array<string> $permissions
     */
    public function __construct(
        Farm $farm,
        string $name,
        string $code,
        array $permissions = [],
        ?string $description = null,
        bool $isSystem = false,
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->name = $name;
        $this->code = strtoupper(trim($code));
        $this->permissions = $permissions;
        $this->description = $description;
        $this->isSystem = $isSystem;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = strtoupper(trim($code));
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    /**
     * @return array<string>
     */
    public function getPermissions(): array
    {
        return $this->permissions;
    }

    /**
     * @param array<string> $permissions
     */
    public function setPermissions(array $permissions): self
    {
        $this->permissions = array_values(array_unique($permissions));
        return $this;
    }

    public function hasPermission(string $permission): bool
    {
        if (in_array('*', $this->permissions, true)) {
            return true;
        }

        return in_array($permission, $this->permissions, true);
    }

    public function isSystem(): bool
    {
        return $this->isSystem;
    }

    public function setIsSystem(bool $isSystem): self
    {
        $this->isSystem = $isSystem;
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
    public function preUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
