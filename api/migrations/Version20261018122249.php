<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261018122249 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE health_treatments (id BINARY(16) NOT NULL, title VARCHAR(150) NOT NULL, type VARCHAR(30) NOT NULL, administration_method VARCHAR(30) NOT NULL, target_age_days INT NOT NULL, scheduled_date DATE NOT NULL, administered_date DATE DEFAULT NULL, status VARCHAR(30) NOT NULL, quantity_used NUMERIC(10, 2) DEFAULT NULL, cost_fcfa INT DEFAULT NULL, veterinarian VARCHAR(100) DEFAULT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, flock_id BINARY(16) NOT NULL, inventory_item_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX idx_health_farm (farm_id), INDEX idx_health_flock (flock_id), INDEX idx_health_scheduled_date (scheduled_date), INDEX idx_health_status (status), INDEX IDX_5478BACE536BF4A2 (inventory_item_id), INDEX IDX_5478BACED05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE6DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE536BF4A2 FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACED05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE65FCFA0D');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE6DA78CF6');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE536BF4A2');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACED05A957B');
        $this->addSql('DROP TABLE health_treatments');
    }
}
