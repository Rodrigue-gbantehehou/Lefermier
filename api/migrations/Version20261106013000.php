<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106013000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute source_building_id et target_building_id sur flock_movements pour tracer les transferts de bandes';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE flock_movements ADD source_building_id BINARY(16) DEFAULT NULL, ADD target_building_id BINARY(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_FLOCK_MOV_SRC_BLDG FOREIGN KEY (source_building_id) REFERENCES buildings (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_FLOCK_MOV_TGT_BLDG FOREIGN KEY (target_building_id) REFERENCES buildings (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_FLOCK_MOV_SRC_BLDG ON flock_movements (source_building_id)');
        $this->addSql('CREATE INDEX IDX_FLOCK_MOV_TGT_BLDG ON flock_movements (target_building_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_FLOCK_MOV_SRC_BLDG');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_FLOCK_MOV_TGT_BLDG');
        $this->addSql('DROP INDEX IDX_FLOCK_MOV_SRC_BLDG ON flock_movements');
        $this->addSql('DROP INDEX IDX_FLOCK_MOV_TGT_BLDG ON flock_movements');
        $this->addSql('ALTER TABLE flock_movements DROP source_building_id, DROP target_building_id');
    }
}

