<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SyncTombstoneRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UlidType;
use Symfony\Component\Uid\Ulid;

#[ORM\Entity(repositoryClass: SyncTombstoneRepository::class)]
#[ORM\Table(name: 'sync_tombstones')]
#[ORM\Index(name: 'idx_tombstone_farm_date', columns: ['farm_id', 'deleted_at'])]
class SyncTombstone
{
    #[ORM\Id]
    #[ORM\Column(type: UlidType::NAME, unique: true)]
    private ?Ulid $id = null;

    #[ORM\ManyToOne(targetEntity: Farm::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Farm $farm;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $resourceType;

    #[ORM\Column(type: Types::STRING, length: 36)]
    private string $resourceId;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $deletedAt;

    public function __construct(
        Farm $farm,
        string $resourceType,
        string $resourceId
    ) {
        $this->id = new Ulid();
        $this->farm = $farm;
        $this->resourceType = $resourceType;
        $this->resourceId = $resourceId;
        $this->deletedAt = new \DateTimeImmutable();
    }

    public function getId(): ?Ulid
    {
        return $this->id;
    }

    public function getFarm(): Farm
    {
        return $this->farm;
    }

    public function getResourceType(): string
    {
        return $this->resourceType;
    }

    public function getResourceId(): string
    {
        return $this->resourceId;
    }

    public function getDeletedAt(): \DateTimeImmutable
    {
        return $this->deletedAt;
    }
}
