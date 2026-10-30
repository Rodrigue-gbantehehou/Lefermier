<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\Building;
use App\Entity\Contact;
use App\Entity\EggProduction;
use App\Entity\Farm;
use App\Entity\Flock;
use App\Entity\HealthTreatment;
use App\Entity\InventoryItem;
use App\Entity\Transaction;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PostRemoveEventArgs;
use Doctrine\ORM\Events;
use Symfony\Component\Uid\Ulid;

#[AsDoctrineListener(event: Events::postRemove)]
class DoctrineTombstoneListener
{
    public function postRemove(PostRemoveEventArgs $event): void
    {
        $entity = $event->getObject();
        $em = $event->getObjectManager();

        $farm = null;
        $resourceType = null;
        $resourceId = null;

        if ($entity instanceof EggProduction) {
            $farm = $entity->getFlock()->getFarm();
            $resourceType = 'egg_production';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof Flock) {
            $farm = $entity->getFarm();
            $resourceType = 'flock';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof Building) {
            $farm = $entity->getFarm();
            $resourceType = 'building';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof InventoryItem) {
            $farm = $entity->getFarm();
            $resourceType = 'inventory_item';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof HealthTreatment) {
            $farm = $entity->getFarm();
            $resourceType = 'health_treatment';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof Transaction) {
            $farm = $entity->getFarm();
            $resourceType = 'transaction';
            $resourceId = $entity->getId()?->toBase32();
        } elseif ($entity instanceof Contact) {
            $farm = $entity->getFarm();
            $resourceType = 'contact';
            $resourceId = $entity->getId()?->toBase32();
        }

        if ($farm instanceof Farm && $resourceType !== null && $resourceId !== null) {
            try {
                $em->getConnection()->insert('sync_tombstones', [
                    'id' => (new Ulid())->toBinary(),
                    'farm_id' => $farm->getId()?->toBinary(),
                    'resource_type' => $resourceType,
                    'resource_id' => $resourceId,
                    'deleted_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
                ]);
            } catch (\Throwable) {
                // Silently skip if database connection or schema is unavailable
            }
        }
    }
}
