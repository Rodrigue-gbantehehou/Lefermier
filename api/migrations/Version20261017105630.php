<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017105630 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE flock_movements (id BINARY(16) NOT NULL, type VARCHAR(30) NOT NULL, quantity INT NOT NULL, movement_date DATE NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, flock_id BINARY(16) NOT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX IDX_82B090576DA78CF6 (flock_id), INDEX IDX_82B09057D05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE flocks (id BINARY(16) NOT NULL, code VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, poultry_type VARCHAR(30) NOT NULL, strain VARCHAR(100) DEFAULT NULL, initial_quantity INT NOT NULL, current_quantity INT NOT NULL, initial_age_days INT NOT NULL, start_date DATE NOT NULL, estimated_end_date DATE DEFAULT NULL, actual_end_date DATE DEFAULT NULL, status VARCHAR(30) NOT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, building_id BINARY(16) DEFAULT NULL, UNIQUE INDEX uniq_farm_flock_code (farm_id, code), INDEX IDX_557CD76E65FCFA0D (farm_id), INDEX IDX_557CD76E4D2A7E12 (building_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B090576DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B09057D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE flocks ADD CONSTRAINT FK_557CD76E65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flocks ADD CONSTRAINT FK_557CD76E4D2A7E12 FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B090576DA78CF6');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B09057D05A957B');
        $this->addSql('ALTER TABLE flocks DROP FOREIGN KEY FK_557CD76E65FCFA0D');
        $this->addSql('ALTER TABLE flocks DROP FOREIGN KEY FK_557CD76E4D2A7E12');
        $this->addSql('DROP TABLE flock_movements');
        $this->addSql('DROP TABLE flocks');
    }
}
