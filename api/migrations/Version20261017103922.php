<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017103922 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE buildings (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, type VARCHAR(30) NOT NULL, capacity INT NOT NULL, surface_area NUMERIC(8, 2) DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX IDX_9A51B6A765FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farm_memberships (id BINARY(16) NOT NULL, role VARCHAR(30) NOT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, user_id BINARY(16) NOT NULL, UNIQUE INDEX uniq_farm_user (farm_id, user_id), INDEX IDX_9C42CF1265FCFA0D (farm_id), INDEX IDX_9C42CF12A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farms (id BINARY(16) NOT NULL, name VARCHAR(150) NOT NULL, code VARCHAR(50) DEFAULT NULL, production_type VARCHAR(30) NOT NULL, currency VARCHAR(3) NOT NULL, location_city VARCHAR(100) DEFAULT NULL, location_country VARCHAR(2) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, organization_id BINARY(16) NOT NULL, INDEX IDX_1DE06CC432C8A3DE (organization_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE organizations (id BINARY(16) NOT NULL, name VARCHAR(150) NOT NULL, slug VARCHAR(160) NOT NULL, subscription_plan VARCHAR(50) NOT NULL, status VARCHAR(30) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_427C1C7F989D9B62 (slug), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE users (id BINARY(16) NOT NULL, email VARCHAR(180) NOT NULL, password VARCHAR(255) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, phone VARCHAR(30) DEFAULT NULL, roles JSON NOT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_1483A5E9E7927C74 (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE buildings ADD CONSTRAINT FK_9A51B6A765FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF1265FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF12A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farms ADD CONSTRAINT FK_1DE06CC432C8A3DE FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE buildings DROP FOREIGN KEY FK_9A51B6A765FCFA0D');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF1265FCFA0D');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF12A76ED395');
        $this->addSql('ALTER TABLE farms DROP FOREIGN KEY FK_1DE06CC432C8A3DE');
        $this->addSql('DROP TABLE buildings');
        $this->addSql('DROP TABLE farm_memberships');
        $this->addSql('DROP TABLE farms');
        $this->addSql('DROP TABLE organizations');
        $this->addSql('DROP TABLE users');
    }
}
