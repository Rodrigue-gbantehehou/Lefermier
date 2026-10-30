<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261027141419 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE device_refresh_tokens (id BINARY(16) NOT NULL, refresh_token_hash VARCHAR(64) NOT NULL, device_id VARCHAR(100) NOT NULL, device_name VARCHAR(100) DEFAULT NULL, family_id VARCHAR(64) NOT NULL, generation INT NOT NULL, is_revoked TINYINT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL, last_used_at DATETIME DEFAULT NULL, user_id BINARY(16) NOT NULL, UNIQUE INDEX UNIQ_3DE116117288F9EC (refresh_token_hash), INDEX idx_device_token_user_device (user_id, device_id), INDEX idx_device_token_family (family_id), INDEX idx_device_token_hash (refresh_token_hash), INDEX IDX_3DE11611A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE idempotency_records (id BINARY(16) NOT NULL, idempotency_key VARCHAR(64) NOT NULL, request_path VARCHAR(255) NOT NULL, request_method VARCHAR(10) NOT NULL, request_hash VARCHAR(64) NOT NULL, status VARCHAR(20) NOT NULL, response_status_code INT DEFAULT NULL, response_headers JSON DEFAULT NULL, response_body MEDIUMTEXT DEFAULT NULL, created_at DATETIME NOT NULL, locked_until DATETIME NOT NULL, user_id BINARY(16) NOT NULL, farm_id BINARY(16) DEFAULT NULL, INDEX idx_idem_user_farm (user_id, farm_id), INDEX idx_idem_created_at (created_at), UNIQUE INDEX uniq_idempotency_key (idempotency_key), INDEX IDX_CBC8586CA76ED395 (user_id), INDEX IDX_CBC8586C65FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE sync_tombstones (id BINARY(16) NOT NULL, resource_type VARCHAR(50) NOT NULL, resource_id VARCHAR(36) NOT NULL, deleted_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_tombstone_farm_date (farm_id, deleted_at), INDEX IDX_9E85BA8965FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE device_refresh_tokens ADD CONSTRAINT FK_3DE11611A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE idempotency_records ADD CONSTRAINT FK_CBC8586CA76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE idempotency_records ADD CONSTRAINT FK_CBC8586C65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE sync_tombstones ADD CONSTRAINT FK_9E85BA8965FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE device_refresh_tokens DROP FOREIGN KEY FK_3DE11611A76ED395');
        $this->addSql('ALTER TABLE idempotency_records DROP FOREIGN KEY FK_CBC8586CA76ED395');
        $this->addSql('ALTER TABLE idempotency_records DROP FOREIGN KEY FK_CBC8586C65FCFA0D');
        $this->addSql('ALTER TABLE sync_tombstones DROP FOREIGN KEY FK_9E85BA8965FCFA0D');
        $this->addSql('DROP TABLE device_refresh_tokens');
        $this->addSql('DROP TABLE idempotency_records');
        $this->addSql('DROP TABLE sync_tombstones');
    }
}
