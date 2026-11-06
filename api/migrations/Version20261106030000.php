<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106030000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute business_key sur health_treatments et un index unique (flock_id, business_key) pour garantir la deduplication et l\'idempotence de la prophylaxie';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE health_treatments ADD business_key VARCHAR(100) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_health_flock_business_key ON health_treatments (flock_id, business_key)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_health_flock_business_key ON health_treatments');
        $this->addSql('ALTER TABLE health_treatments DROP business_key');
    }
}
