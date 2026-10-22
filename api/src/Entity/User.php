<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\Column(type: Types::STRING, length: 180, unique: true)]
    private string $email;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $password;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 30, nullable: true)]
    private ?string $phone = null;

    /**
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $roles = [];

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isActive = true;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $passwordResetToken = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $passwordResetExpiresAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /**
     * @var Collection<int, FarmMembership>
     */
    #[ORM\OneToMany(targetEntity: FarmMembership::class, mappedBy: 'user', cascade: ['persist', 'remove'])]
    private Collection $farmMemberships;

    #[ORM\ManyToOne(targetEntity: AdminRole::class)]
    #[ORM\JoinColumn(name: 'admin_role_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?AdminRole $adminRole = null;

    public function __construct(string $email, string $firstName, string $lastName)
    {
        $this->id = new Ulid();
        $this->email = $email;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->farmMemberships = new ArrayCollection();
        $this->roles = ['ROLE_USER'];
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): self
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): self
    {
        $this->lastName = $lastName;
        return $this;
    }

    public function getFullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): self
    {
        $this->phone = $phone;
        return $this;
    }

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';

        if ($this->adminRole !== null) {
            $roles[] = 'ROLE_ADMIN';
            $roles[] = 'ROLE_' . $this->adminRole->getCode();
            if ($this->adminRole->hasPermission('*')) {
                $roles[] = 'ROLE_SUPER_ADMIN';
            }
        }

        return array_values(array_unique($roles));
    }

    public function getAdminRole(): ?AdminRole
    {
        return $this->adminRole;
    }

    public function setAdminRole(?AdminRole $adminRole): self
    {
        $this->adminRole = $adminRole;
        return $this;
    }

    public function hasAdminPermission(string $permission): bool
    {
        if (in_array('ROLE_SUPER_ADMIN', $this->roles, true)) {
            return true;
        }

        return $this->adminRole !== null && $this->adminRole->hasPermission($permission);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): self
    {
        $this->roles = $roles;
        return $this;
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

    /**
     * @return Collection<int, FarmMembership>
     */
    public function getFarmMemberships(): Collection
    {
        return $this->farmMemberships;
    }

    public function getPasswordResetToken(): ?string
    {
        return $this->passwordResetToken;
    }

    public function setPasswordResetToken(?string $passwordResetToken): self
    {
        $this->passwordResetToken = $passwordResetToken;
        return $this;
    }

    public function getPasswordResetExpiresAt(): ?\DateTimeImmutable
    {
        return $this->passwordResetExpiresAt;
    }

    public function setPasswordResetExpiresAt(?\DateTimeImmutable $passwordResetExpiresAt): self
    {
        $this->passwordResetExpiresAt = $passwordResetExpiresAt;
        return $this;
    }

    public function isPasswordResetTokenValid(string $token): bool
    {
        if ($this->passwordResetToken === null || $this->passwordResetExpiresAt === null) {
            return false;
        }

        if ($this->passwordResetExpiresAt < new \DateTimeImmutable()) {
            return false;
        }

        return hash_equals($this->passwordResetToken, $token);
    }

    public function eraseCredentials(): void
    {
        // Nettoyage des données sensibles temporaires si nécessaire
    }
}
