<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261106220819 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE admin_audit_logs (id BINARY(16) NOT NULL, actor_id VARCHAR(100) DEFAULT NULL, actor_email VARCHAR(180) NOT NULL, actor_name VARCHAR(200) NOT NULL, actor_role VARCHAR(100) NOT NULL, action VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL, target_type VARCHAR(100) NOT NULL, target_id VARCHAR(100) NOT NULL, target_name VARCHAR(255) NOT NULL, details LONGTEXT NOT NULL, client_ip VARCHAR(45) DEFAULT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, INDEX idx_admin_audit_action (action), INDEX idx_admin_audit_created_at (created_at), INDEX idx_admin_audit_target (target_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE admin_roles (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(60) NOT NULL, description LONGTEXT DEFAULT NULL, permissions JSON NOT NULL, is_system TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_admin_role_code (code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE api_keys (id BINARY(16) NOT NULL, name VARCHAR(120) NOT NULL, key_prefix VARCHAR(16) NOT NULL, last_four VARCHAR(8) NOT NULL, key_hash VARCHAR(64) NOT NULL, scopes JSON NOT NULL, is_active TINYINT NOT NULL, last_used_at DATETIME DEFAULT NULL, expires_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, created_by_id BINARY(16) NOT NULL, UNIQUE INDEX UNIQ_9579321F57BFB971 (key_hash), INDEX idx_api_keys_hash (key_hash), INDEX idx_api_keys_farm (farm_id), INDEX IDX_9579321FB03A8386 (created_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE buildings (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, type VARCHAR(30) NOT NULL, capacity INT NOT NULL, surface_area NUMERIC(8, 2) DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX IDX_9A51B6A765FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE contacts (id BINARY(16) NOT NULL, type VARCHAR(20) NOT NULL, name VARCHAR(150) NOT NULL, phone VARCHAR(30) DEFAULT NULL, email VARCHAR(180) DEFAULT NULL, address VARCHAR(255) DEFAULT NULL, city VARCHAR(100) DEFAULT NULL, notes LONGTEXT DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_farm_contact_type (farm_id, type), INDEX IDX_3340157365FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE device_refresh_tokens (id BINARY(16) NOT NULL, refresh_token_hash VARCHAR(64) NOT NULL, device_id VARCHAR(100) NOT NULL, device_name VARCHAR(100) DEFAULT NULL, family_id VARCHAR(64) NOT NULL, generation INT NOT NULL, is_revoked TINYINT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL, last_used_at DATETIME DEFAULT NULL, user_id BINARY(16) NOT NULL, UNIQUE INDEX UNIQ_3DE116117288F9EC (refresh_token_hash), INDEX idx_device_token_user_device (user_id, device_id), INDEX idx_device_token_family (family_id), INDEX idx_device_token_hash (refresh_token_hash), INDEX IDX_3DE11611A76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE egg_productions (id BINARY(16) NOT NULL, production_date DATE NOT NULL, session VARCHAR(20) NOT NULL, good_eggs INT NOT NULL, cracked_eggs INT NOT NULL, dirty_eggs INT NOT NULL, deformed_eggs INT NOT NULL, total_eggs INT NOT NULL, trays_count INT NOT NULL, loose_eggs_count INT NOT NULL, flock_quantity_at_date INT NOT NULL, laying_rate NUMERIC(5, 2) NOT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, flock_id BINARY(16) NOT NULL, recorded_by_id BINARY(16) DEFAULT NULL, UNIQUE INDEX uniq_flock_date_session (flock_id, production_date, session), INDEX IDX_A245B5336DA78CF6 (flock_id), INDEX IDX_A245B533D05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farm_memberships (id BINARY(16) NOT NULL, role VARCHAR(30) NOT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, user_id BINARY(16) NOT NULL, role_id BINARY(16) DEFAULT NULL, UNIQUE INDEX uniq_farm_user (farm_id, user_id), INDEX IDX_9C42CF1265FCFA0D (farm_id), INDEX IDX_9C42CF12A76ED395 (user_id), INDEX IDX_9C42CF12D60322AC (role_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farm_membership_buildings (farm_membership_id BINARY(16) NOT NULL, building_id BINARY(16) NOT NULL, INDEX IDX_57B0D8FDFD41EB64 (farm_membership_id), INDEX IDX_57B0D8FD4D2A7E12 (building_id), PRIMARY KEY (farm_membership_id, building_id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farm_roles (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(60) NOT NULL, description LONGTEXT DEFAULT NULL, permissions JSON NOT NULL, is_system TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_roles_farm (farm_id), UNIQUE INDEX uniq_farm_role_code (farm_id, code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE farms (id BINARY(16) NOT NULL, name VARCHAR(150) NOT NULL, code VARCHAR(50) DEFAULT NULL, production_type VARCHAR(30) NOT NULL, currency VARCHAR(3) NOT NULL, location_city VARCHAR(100) DEFAULT NULL, location_country VARCHAR(2) NOT NULL, phone VARCHAR(50) DEFAULT NULL, email VARCHAR(150) DEFAULT NULL, address VARCHAR(255) DEFAULT NULL, ifu VARCHAR(50) DEFAULT NULL, rccm VARCHAR(50) DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, organization_id BINARY(16) NOT NULL, INDEX IDX_1DE06CC432C8A3DE (organization_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE flock_movements (id BINARY(16) NOT NULL, type VARCHAR(30) NOT NULL, quantity INT NOT NULL, movement_date DATE NOT NULL, reason VARCHAR(255) DEFAULT NULL, quantity_before INT DEFAULT NULL, quantity_after INT DEFAULT NULL, created_at DATETIME NOT NULL, flock_id BINARY(16) NOT NULL, recorded_by_id BINARY(16) DEFAULT NULL, source_building_id BINARY(16) DEFAULT NULL, target_building_id BINARY(16) DEFAULT NULL, INDEX IDX_82B090576DA78CF6 (flock_id), INDEX IDX_82B09057D05A957B (recorded_by_id), INDEX IDX_82B0905771552EB2 (source_building_id), INDEX IDX_82B09057CA103118 (target_building_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE flocks (id BINARY(16) NOT NULL, code VARCHAR(50) NOT NULL, name VARCHAR(100) NOT NULL, poultry_type VARCHAR(30) NOT NULL, strain VARCHAR(100) DEFAULT NULL, initial_quantity INT NOT NULL, current_quantity INT NOT NULL, initial_age_days INT NOT NULL, start_date DATE NOT NULL, estimated_end_date DATE DEFAULT NULL, actual_end_date DATE DEFAULT NULL, status VARCHAR(30) NOT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, building_id BINARY(16) DEFAULT NULL, UNIQUE INDEX uniq_farm_flock_code (farm_id, code), INDEX IDX_557CD76E65FCFA0D (farm_id), INDEX IDX_557CD76E4D2A7E12 (building_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE health_treatments (id BINARY(16) NOT NULL, title VARCHAR(150) NOT NULL, type VARCHAR(30) NOT NULL, administration_method VARCHAR(30) NOT NULL, target_age_days INT NOT NULL, scheduled_date DATE NOT NULL, administered_date DATE DEFAULT NULL, status VARCHAR(30) NOT NULL, quantity_used NUMERIC(10, 2) DEFAULT NULL, cost_fcfa INT DEFAULT NULL, veterinarian VARCHAR(100) DEFAULT NULL, notes LONGTEXT DEFAULT NULL, business_key VARCHAR(100) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, flock_id BINARY(16) NOT NULL, inventory_item_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX idx_health_farm (farm_id), INDEX idx_health_flock (flock_id), INDEX idx_health_scheduled_date (scheduled_date), INDEX idx_health_status (status), UNIQUE INDEX uniq_health_flock_business_key (flock_id, business_key), INDEX IDX_5478BACE536BF4A2 (inventory_item_id), INDEX IDX_5478BACED05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE idempotency_records (id BINARY(16) NOT NULL, idempotency_key VARCHAR(64) NOT NULL, request_path VARCHAR(255) NOT NULL, request_method VARCHAR(10) NOT NULL, request_hash VARCHAR(64) NOT NULL, lock_token VARCHAR(64) DEFAULT NULL, status VARCHAR(20) NOT NULL, response_status_code INT DEFAULT NULL, response_headers JSON DEFAULT NULL, response_body MEDIUMTEXT DEFAULT NULL, created_at DATETIME NOT NULL, locked_until DATETIME NOT NULL, user_id BINARY(16) NOT NULL, farm_id BINARY(16) DEFAULT NULL, INDEX idx_idem_user_farm (user_id, farm_id), INDEX idx_idem_created_at (created_at), UNIQUE INDEX uniq_idempotency_key (idempotency_key), INDEX IDX_CBC8586CA76ED395 (user_id), INDEX IDX_CBC8586C65FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE inventory_items (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, category VARCHAR(30) NOT NULL, custom_category VARCHAR(100) DEFAULT NULL, unit VARCHAR(30) NOT NULL, package_weight_kg NUMERIC(8, 2) DEFAULT NULL, current_stock NUMERIC(10, 2) NOT NULL, alert_threshold NUMERIC(10, 2) DEFAULT NULL, unit_price INT DEFAULT NULL, notes LONGTEXT DEFAULT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, UNIQUE INDEX uniq_farm_inventory_item (farm_id, name, category), INDEX IDX_3D82424D65FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE organizations (id BINARY(16) NOT NULL, name VARCHAR(150) NOT NULL, slug VARCHAR(160) NOT NULL, subscription_plan VARCHAR(50) NOT NULL, subscription_billing_cycle VARCHAR(20) NOT NULL, subscription_renewal_date DATETIME DEFAULT NULL, subscription_trial_ends_at DATETIME DEFAULT NULL, status VARCHAR(30) NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX UNIQ_427C1C7F989D9B62 (slug), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE stock_movements (id BINARY(16) NOT NULL, type VARCHAR(30) NOT NULL, quantity NUMERIC(10, 2) NOT NULL, unit VARCHAR(30) NOT NULL, unit_price INT DEFAULT NULL, movement_date DATE NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, item_id BINARY(16) NOT NULL, flock_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX IDX_A0BE93C9126F525E (item_id), INDEX IDX_A0BE93C96DA78CF6 (flock_id), INDEX IDX_A0BE93C9D05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE subscription_plans (id BINARY(16) NOT NULL, sku VARCHAR(50) NOT NULL, name VARCHAR(120) NOT NULL, tier VARCHAR(80) NOT NULL, badge VARCHAR(50) DEFAULT NULL, description LONGTEXT DEFAULT NULL, price_monthly INT NOT NULL, price_annually INT NOT NULL, currency VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL, available_from DATETIME DEFAULT NULL, available_to DATETIME DEFAULT NULL, is_visibility_public TINYINT NOT NULL, trial_days INT NOT NULL, allowed_billing_cycles JSON NOT NULL, modules JSON NOT NULL, quotas JSON NOT NULL, features JSON NOT NULL, flags JSON NOT NULL, is_popular TINYINT NOT NULL, is_recommended TINYINT NOT NULL, is_active TINYINT NOT NULL, is_system TINYINT NOT NULL, version INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_subscription_plan_sku (sku), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE subscription_upgrade_requests (id BINARY(16) NOT NULL, current_plan VARCHAR(50) NOT NULL, target_plan VARCHAR(50) NOT NULL, target_plan_name VARCHAR(150) NOT NULL, billing_cycle VARCHAR(20) NOT NULL, message LONGTEXT DEFAULT NULL, status VARCHAR(30) NOT NULL, admin_notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, processed_at DATETIME DEFAULT NULL, farm_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, user_id BINARY(16) NOT NULL, processed_by_id BINARY(16) DEFAULT NULL, INDEX idx_sub_req_status (status), INDEX idx_sub_req_created_at (created_at), INDEX IDX_D858AB2265FCFA0D (farm_id), INDEX IDX_D858AB2232C8A3DE (organization_id), INDEX IDX_D858AB22A76ED395 (user_id), INDEX IDX_D858AB222FFD4FD3 (processed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE sync_tombstones (id BINARY(16) NOT NULL, resource_type VARCHAR(50) NOT NULL, resource_id VARCHAR(36) NOT NULL, deleted_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, INDEX idx_tombstone_farm_date (farm_id, deleted_at), INDEX IDX_9E85BA8965FCFA0D (farm_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE transactions (id BINARY(16) NOT NULL, type VARCHAR(20) NOT NULL, category VARCHAR(40) NOT NULL, amount BIGINT NOT NULL, payment_status VARCHAR(20) NOT NULL, paid_amount BIGINT DEFAULT NULL, due_date DATE DEFAULT NULL, payment_method VARCHAR(30) NOT NULL, transaction_date DATE NOT NULL, reference VARCHAR(100) DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, farm_id BINARY(16) NOT NULL, contact_id BINARY(16) DEFAULT NULL, flock_id BINARY(16) DEFAULT NULL, recorded_by_id BINARY(16) DEFAULT NULL, INDEX idx_farm_transaction_date (farm_id, transaction_date), INDEX idx_farm_transaction_type (farm_id, type), INDEX idx_flock_transaction (flock_id), INDEX IDX_EAA81A4C65FCFA0D (farm_id), INDEX IDX_EAA81A4CE7A1254A (contact_id), INDEX IDX_EAA81A4CD05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE users (id BINARY(16) NOT NULL, email VARCHAR(180) NOT NULL, password VARCHAR(255) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, phone VARCHAR(30) DEFAULT NULL, roles JSON NOT NULL, is_active TINYINT NOT NULL, password_reset_token VARCHAR(100) DEFAULT NULL, password_reset_expires_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, admin_role_id BINARY(16) DEFAULT NULL, UNIQUE INDEX UNIQ_1483A5E9E7927C74 (email), INDEX IDX_1483A5E9123FA025 (admin_role_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE api_keys ADD CONSTRAINT FK_9579321F65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE api_keys ADD CONSTRAINT FK_9579321FB03A8386 FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE buildings ADD CONSTRAINT FK_9A51B6A765FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE contacts ADD CONSTRAINT FK_3340157365FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE device_refresh_tokens ADD CONSTRAINT FK_3DE11611A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE egg_productions ADD CONSTRAINT FK_A245B5336DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE egg_productions ADD CONSTRAINT FK_A245B533D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF1265FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF12A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_memberships ADD CONSTRAINT FK_9C42CF12D60322AC FOREIGN KEY (role_id) REFERENCES farm_roles (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE farm_membership_buildings ADD CONSTRAINT FK_57B0D8FDFD41EB64 FOREIGN KEY (farm_membership_id) REFERENCES farm_memberships (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_membership_buildings ADD CONSTRAINT FK_57B0D8FD4D2A7E12 FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_roles ADD CONSTRAINT FK_FDBB519665FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farms ADD CONSTRAINT FK_1DE06CC432C8A3DE FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B090576DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B09057D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B0905771552EB2 FOREIGN KEY (source_building_id) REFERENCES buildings (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE flock_movements ADD CONSTRAINT FK_82B09057CA103118 FOREIGN KEY (target_building_id) REFERENCES buildings (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE flocks ADD CONSTRAINT FK_557CD76E65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE flocks ADD CONSTRAINT FK_557CD76E4D2A7E12 FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE6DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACE536BF4A2 FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE health_treatments ADD CONSTRAINT FK_5478BACED05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE idempotency_records ADD CONSTRAINT FK_CBC8586CA76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE idempotency_records ADD CONSTRAINT FK_CBC8586C65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE inventory_items ADD CONSTRAINT FK_3D82424D65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C9126F525E FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C96DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE stock_movements ADD CONSTRAINT FK_A0BE93C9D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2265FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2232C8A3DE FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB22A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB222FFD4FD3 FOREIGN KEY (processed_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE sync_tombstones ADD CONSTRAINT FK_9E85BA8965FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4C65FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4CE7A1254A FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4C6DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE transactions ADD CONSTRAINT FK_EAA81A4CD05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE users ADD CONSTRAINT FK_1483A5E9123FA025 FOREIGN KEY (admin_role_id) REFERENCES admin_roles (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE api_keys DROP FOREIGN KEY FK_9579321F65FCFA0D');
        $this->addSql('ALTER TABLE api_keys DROP FOREIGN KEY FK_9579321FB03A8386');
        $this->addSql('ALTER TABLE buildings DROP FOREIGN KEY FK_9A51B6A765FCFA0D');
        $this->addSql('ALTER TABLE contacts DROP FOREIGN KEY FK_3340157365FCFA0D');
        $this->addSql('ALTER TABLE device_refresh_tokens DROP FOREIGN KEY FK_3DE11611A76ED395');
        $this->addSql('ALTER TABLE egg_productions DROP FOREIGN KEY FK_A245B5336DA78CF6');
        $this->addSql('ALTER TABLE egg_productions DROP FOREIGN KEY FK_A245B533D05A957B');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF1265FCFA0D');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF12A76ED395');
        $this->addSql('ALTER TABLE farm_memberships DROP FOREIGN KEY FK_9C42CF12D60322AC');
        $this->addSql('ALTER TABLE farm_membership_buildings DROP FOREIGN KEY FK_57B0D8FDFD41EB64');
        $this->addSql('ALTER TABLE farm_membership_buildings DROP FOREIGN KEY FK_57B0D8FD4D2A7E12');
        $this->addSql('ALTER TABLE farm_roles DROP FOREIGN KEY FK_FDBB519665FCFA0D');
        $this->addSql('ALTER TABLE farms DROP FOREIGN KEY FK_1DE06CC432C8A3DE');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B090576DA78CF6');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B09057D05A957B');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B0905771552EB2');
        $this->addSql('ALTER TABLE flock_movements DROP FOREIGN KEY FK_82B09057CA103118');
        $this->addSql('ALTER TABLE flocks DROP FOREIGN KEY FK_557CD76E65FCFA0D');
        $this->addSql('ALTER TABLE flocks DROP FOREIGN KEY FK_557CD76E4D2A7E12');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE65FCFA0D');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE6DA78CF6');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACE536BF4A2');
        $this->addSql('ALTER TABLE health_treatments DROP FOREIGN KEY FK_5478BACED05A957B');
        $this->addSql('ALTER TABLE idempotency_records DROP FOREIGN KEY FK_CBC8586CA76ED395');
        $this->addSql('ALTER TABLE idempotency_records DROP FOREIGN KEY FK_CBC8586C65FCFA0D');
        $this->addSql('ALTER TABLE inventory_items DROP FOREIGN KEY FK_3D82424D65FCFA0D');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C9126F525E');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C96DA78CF6');
        $this->addSql('ALTER TABLE stock_movements DROP FOREIGN KEY FK_A0BE93C9D05A957B');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY FK_D858AB2265FCFA0D');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY FK_D858AB2232C8A3DE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY FK_D858AB22A76ED395');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY FK_D858AB222FFD4FD3');
        $this->addSql('ALTER TABLE sync_tombstones DROP FOREIGN KEY FK_9E85BA8965FCFA0D');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4C65FCFA0D');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4CE7A1254A');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4C6DA78CF6');
        $this->addSql('ALTER TABLE transactions DROP FOREIGN KEY FK_EAA81A4CD05A957B');
        $this->addSql('ALTER TABLE users DROP FOREIGN KEY FK_1483A5E9123FA025');
        $this->addSql('DROP TABLE admin_audit_logs');
        $this->addSql('DROP TABLE admin_roles');
        $this->addSql('DROP TABLE api_keys');
        $this->addSql('DROP TABLE buildings');
        $this->addSql('DROP TABLE contacts');
        $this->addSql('DROP TABLE device_refresh_tokens');
        $this->addSql('DROP TABLE egg_productions');
        $this->addSql('DROP TABLE farm_memberships');
        $this->addSql('DROP TABLE farm_membership_buildings');
        $this->addSql('DROP TABLE farm_roles');
        $this->addSql('DROP TABLE farms');
        $this->addSql('DROP TABLE flock_movements');
        $this->addSql('DROP TABLE flocks');
        $this->addSql('DROP TABLE health_treatments');
        $this->addSql('DROP TABLE idempotency_records');
        $this->addSql('DROP TABLE inventory_items');
        $this->addSql('DROP TABLE organizations');
        $this->addSql('DROP TABLE stock_movements');
        $this->addSql('DROP TABLE subscription_plans');
        $this->addSql('DROP TABLE subscription_upgrade_requests');
        $this->addSql('DROP TABLE sync_tombstones');
        $this->addSql('DROP TABLE transactions');
        $this->addSql('DROP TABLE users');
    }
}
