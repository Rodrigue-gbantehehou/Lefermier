<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\Contact\CreateContactRequestDto;
use App\Dto\Contact\UpdateContactRequestDto;
use App\Entity\Contact;
use App\Entity\Farm;
use Doctrine\ORM\EntityManagerInterface;

class ContactService
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function createContact(Farm $farm, CreateContactRequestDto $dto): Contact
    {
        $contact = new Contact(
            $farm,
            $dto->name,
            $dto->type,
            $dto->phone,
            $dto->city
        );

        $contact->setEmail($dto->email);
        $contact->setAddress($dto->address);
        $contact->setNotes($dto->notes);

        $this->entityManager->persist($contact);
        $this->entityManager->flush();

        return $contact;
    }

    public function updateContact(Contact $contact, UpdateContactRequestDto $dto): Contact
    {
        $contact->setName($dto->name);
        $contact->setType($dto->type);
        $contact->setPhone($dto->phone);
        $contact->setEmail($dto->email);
        $contact->setAddress($dto->address);
        $contact->setCity($dto->city);
        $contact->setNotes($dto->notes);
        $contact->setIsActive($dto->isActive);

        $this->entityManager->flush();

        return $contact;
    }

    public function deleteContact(Contact $contact): void
    {
        $this->entityManager->remove($contact);
        $this->entityManager->flush();
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeContact(Contact $c): array
    {
        return [
            'id' => $c->getId()?->toBase32(),
            'farmId' => $c->getFarm()->getId()?->toBase32(),
            'name' => $c->getName(),
            'type' => $c->getType()->value,
            'phone' => $c->getPhone(),
            'email' => $c->getEmail(),
            'address' => $c->getAddress(),
            'city' => $c->getCity(),
            'notes' => $c->getNotes(),
            'isActive' => $c->isActive(),
            'createdAt' => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $c->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
