<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Contact;
use App\Entity\Farm;
use App\Enum\ContactType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Contact>
 */
class ContactRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Contact::class);
    }

    /**
     * @return Contact[]
     */
    public function findByFarm(
        Farm $farm,
        ?ContactType $type = null,
        ?string $search = null,
        bool $onlyActive = true,
    ): array {
        $qb = $this->createQueryBuilder('c')
            ->andWhere('c.farm = :farm')
            ->setParameter('farm', $farm->getId(), 'ulid')
            ->orderBy('c.name', 'ASC');

        if ($onlyActive) {
            $qb->andWhere('c.isActive = true');
        }

        if ($type !== null) {
            $qb->andWhere('c.type = :type OR c.type = :bothType')
                ->setParameter('type', $type)
                ->setParameter('bothType', ContactType::BOTH);
        }

        if ($search !== null && trim($search) !== '') {
            $qb->andWhere('LOWER(c.name) LIKE :search OR c.phone LIKE :search OR LOWER(c.city) LIKE :search')
                ->setParameter('search', '%' . mb_strtolower(trim($search)) . '%');
        }

        return $qb->getQuery()->getResult();
    }
}
