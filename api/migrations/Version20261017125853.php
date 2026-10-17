<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017125853 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE farm_roles (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(60) NOT NULL, description LONGTEXT DEFAULT NULL, permissions JSON NOT NULL, is_system TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_roles_farm (farm_id), UNIQUE INDEX uniq_farm_role_code (farm_id, code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE farm_roles ADD CONSTRAINT FK_FDBB519665FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_memberships ADD role_id BINARY(16) DEFAULT NULL');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF12D60322AC FOREIGN KEY (role_id) REFERENCES farm_roles (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_9C42CF12D60322AC ON farm_memberships (role_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE farm_roles DROP FOREIGN KEY FK_FDBB519665FCFA0D');
        $this->addSql('DROP TABLE farm_roles');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF12D60322AC');
        $this->addSql('DROP INDEX IDX_9C42CF12D60322AC ON farm_memberships');
        $this->addSql('ALTER TABLE farm_memberships DROP role_id');
    }
}
