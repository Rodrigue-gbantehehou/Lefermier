<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017111245 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE inventory_items (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, category VARCHAR(30) NOT NULL, unit VARCHAR(30) NOT NULL, current_stock NUMERIC(10, 2) NOT NULL, alert_threshold NUMERIC(10, 2) DEFAULT NULL, unit_price INT DEFAULT NULL, notes LONGTEXT DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, UNIQUE INDEX uniq_farm_inventory_item (farm_id, name, category), INDEX IDX_3D82424D65FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE stock_movements (id BINARY(16) NOT NULL, type VARCHAR(30) NOT NULL, quantity NUMERIC(10, 2) NOT NULL, unit VARCHAR(30) NOT NULL, unit_price INT DEFAULT NULL, movement_date DATE NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, item_id BINARY(16) NOT NULL, flock_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX IDX_A0BE93C9126F525E (item_id), INDEX IDX_A0BE93C96DA78CF6 (flock_id), INDEX IDX_A0BE93C9D05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE inventory_items ADD CONSTRAINT FK_3D82424D65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C9126F525E FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C96DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C9D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE inventory_items DROP FOREIGN KEY FK_3D82424D65FCFA0D');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C9126F525E');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C96DA78CF6');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C9D05A957B');
        $this->addSql('DROP TABLE inventory_items');
        $this->addSql('DROP TABLE stock_movements');
    }
}
