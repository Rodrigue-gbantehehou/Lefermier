<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106040000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la colonne lock_token sur idempotency_records pour le fencing token et convertit les anciens mouvements de soins en HEALTH_CONSUMPTION';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE idempotency_records ADD lock_token VARCHAR(64) DEFAULT NULL');
        $this->addSql("UPDATE stock_movements SET type = 'HEALTH_CONSUMPTION' WHERE type = 'FEEDING' AND (reason LIKE 'Traitement sanitaire / vaccin : %' OR reason LIKE 'Traitement sanitaire : %')");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE stock_movements SET type = 'FEEDING' WHERE type = 'HEALTH_CONSUMPTION'");
        $this->addSql('ALTER TABLE idempotency_records DROP lock_token');
    }
}
