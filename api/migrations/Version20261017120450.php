<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017120450 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE contacts (id BINARY(16) NOT NULL, type VARCHAR(20) NOT NULL, name VARCHAR(150) NOT NULL, phone VARCHAR(30) DEFAULT NULL, email VARCHAR(180) DEFAULT NULL, address VARCHAR(255) DEFAULT NULL, city VARCHAR(100) DEFAULT NULL, notes LONGTEXT DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_farm_contact_type (farm_id, type), INDEX IDX_3340157365FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE transactions (id BINARY(16) NOT NULL, type VARCHAR(20) NOT NULL, category VARCHAR(40) NOT NULL, amount BIGINT NOT NULL, payment_method VARCHAR(30) NOT NULL, transaction_date DATE NOT NULL, reference VARCHAR(100) DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, contact_id BINARY(16) DEFAULT NULL, flock_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX idx_farm_transaction_date (farm_id, transaction_date), INDEX idx_farm_transaction_type (farm_id, type), INDEX idx_flock_transaction (flock_id), INDEX IDX_EAA81A4C65FCFA0D (farm_id), INDEX IDX_EAA81A4CE7A1254A (contact_id), INDEX IDX_EAA81A4CD05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE contacts ADD CONSTRAINT FK_3340157365FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4C65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4CE7A1254A FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4C6DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4CD05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE contacts DROP FOREIGN KEY FK_3340157365FCFA0D');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4C65FCFA0D');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4CE7A1254A');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4C6DA78CF6');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4CD05A957B');
        $this->addSql('DROP TABLE contacts');
        $this->addSql('DROP TABLE transactions');
    }
}
