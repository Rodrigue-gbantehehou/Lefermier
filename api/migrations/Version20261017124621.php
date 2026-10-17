<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017124621 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE api_keys (id BINARY(16) NOT NULL, name VARCHAR(120) NOT NULL, key_prefix VARCHAR(16) NOT NULL, last_four VARCHAR(8) NOT NULL, key_hash VARCHAR(64) NOT NULL, scopes JSON NOT NULL, is_active TINYINT NOT NULL, last_used_at DATETIME DEFAULT NULL, expires_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, created_by_id BINARY(16) NOT NULL, UNIQUE INDEX UNIQ_9579321F57BFB971 (key_hash), INDEX idx_api_keys_hash (key_hash), INDEX idx_api_keys_farm (farm_id), INDEX IDX_9579321FB03A8386 (created_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE api_keys ADD CONSTRAINT FK_9579321F65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE api_keys ADD CONSTRAINT FK_9579321FB03A8386 FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE api_keys DROP FOREIGN KEY FK_9579321F65FCFA0D');
        $this->addSql('ALTER TABLE api_keys DROP FOREIGN KEY FK_9579321FB03A8386');
        $this->addSql('DROP TABLE api_keys');
    }
}
