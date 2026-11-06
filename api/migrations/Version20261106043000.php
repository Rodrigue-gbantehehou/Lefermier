<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106043000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Synchronisation du schéma complet (plans abonnements, logs audit admin, rôles admin, colonnes utilisateurs et organisations)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE IF NOT EXISTS admin_audit_logs (id BINARY(16) NOT NULL, actor_id VARCHAR(100) DEFAULT NULL, actor_email VARCHAR(180) NOT NULL, actor_name VARCHAR(200) NOT NULL, actor_role VARCHAR(100) NOT NULL, action VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL, target_type VARCHAR(100) NOT NULL, target_id VARCHAR(100) NOT NULL, target_name VARCHAR(255) NOT NULL, details LONGTEXT NOT NULL, client_ip VARCHAR(45) DEFAULT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, INDEX idx_admin_audit_action (action), INDEX idx_admin_audit_created_at (created_at), INDEX idx_admin_audit_target (target_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS admin_roles (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(60) NOT NULL, description LONGTEXT DEFAULT NULL, permissions JSON NOT NULL, is_system TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_admin_role_code (code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS subscription_plans (id BINARY(16) NOT NULL, sku VARCHAR(50) NOT NULL, name VARCHAR(120) NOT NULL, tier VARCHAR(80) NOT NULL, badge VARCHAR(50) DEFAULT NULL, description LONGTEXT DEFAULT NULL, price_monthly INT NOT NULL, price_annually INT NOT NULL, currency VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL, available_from DATETIME DEFAULT NULL, available_to DATETIME DEFAULT NULL, is_visibility_public TINYINT NOT NULL, trial_days INT NOT NULL, allowed_billing_cycles JSON NOT NULL, modules JSON NOT NULL, quotas JSON NOT NULL, features JSON NOT NULL, flags JSON NOT NULL, is_popular TINYINT NOT NULL, is_recommended TINYINT NOT NULL, is_active TINYINT NOT NULL, is_system TINYINT NOT NULL, version INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_subscription_plan_sku (sku), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS subscription_upgrade_requests (id BINARY(16) NOT NULL, current_plan VARCHAR(50) NOT NULL, target_plan VARCHAR(50) NOT NULL, target_plan_name VARCHAR(150) NOT NULL, billing_cycle VARCHAR(20) NOT NULL, message LONGTEXT DEFAULT NULL, status VARCHAR(30) NOT NULL, admin_notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, processed_at DATETIME DEFAULT NULL, farm_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, user_id BINARY(16) NOT NULL, processed_by_id BINARY(16) DEFAULT NULL, INDEX idx_sub_req_status (status), INDEX idx_sub_req_created_at (created_at), INDEX IDX_D858AB2265FCFA0D (farm_id), INDEX IDX_D858AB2232C8A3DE (organization_id), INDEX IDX_D858AB22A76ED395 (user_id), INDEX IDX_D858AB222FFD4FD3 (processed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');

        // Colonnes conditionnelles : on n'ajoute chaque colonne que si elle est absente.
        // Évite une erreur "Duplicate column name" sur une base déjà partiellement migrée.
        $db = $this->connection->getDatabase();

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'farms' AND COLUMN_NAME = 'phone'
                ),
                'ALTER TABLE farms ADD phone VARCHAR(50) DEFAULT NULL, ADD email VARCHAR(150) DEFAULT NULL, ADD address VARCHAR(255) DEFAULT NULL, ADD ifu VARCHAR(50) DEFAULT NULL, ADD rccm VARCHAR(50) DEFAULT NULL, ADD description VARCHAR(255) DEFAULT NULL',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'inventory_items' AND COLUMN_NAME = 'custom_category'
                ),
                'ALTER TABLE inventory_items ADD custom_category VARCHAR(100) DEFAULT NULL, ADD package_weight_kg NUMERIC(8, 2) DEFAULT NULL',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'subscription_billing_cycle'
                ),
                \"ALTER TABLE organizations ADD subscription_billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', ADD subscription_renewal_date DATETIME DEFAULT NULL, ADD subscription_trial_ends_at DATETIME DEFAULT NULL\",
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'payment_status'
                ),
                \"ALTER TABLE transactions ADD payment_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', ADD paid_amount BIGINT DEFAULT NULL, ADD due_date DATE DEFAULT NULL\",
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_token'
                ),
                'ALTER TABLE users ADD password_reset_token VARCHAR(100) DEFAULT NULL, ADD password_reset_expires_at DATETIME DEFAULT NULL, ADD admin_role_id BINARY(16) DEFAULT NULL',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        // FK et index : idempotents via IF NOT EXISTS (MySQL 8+)
        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'FK_1483A5E9123FA025'
                ),
                'ALTER TABLE users ADD CONSTRAINT FK_1483A5E9123FA025 FOREIGN KEY (admin_role_id) REFERENCES admin_roles (id) ON DELETE SET NULL',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        $this->addSql('CREATE INDEX IF NOT EXISTS IDX_1483A5E9123FA025 ON users (admin_role_id)');

        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2265FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2232C8A3DE FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB22A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB222FFD4FD3 FOREIGN KEY (processed_by_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // Contraintes FK de subscription_upgrade_requests : DROP FOREIGN KEY IF EXISTS (MySQL 8.0.29+)
        // Sécurité : ne lève pas d'erreur si la FK n'existe pas (rollback partiel).
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY IF EXISTS FK_D858AB2265FCFA0D');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY IF EXISTS FK_D858AB2232C8A3DE');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY IF EXISTS FK_D858AB22A76ED395');
        $this->addSql('ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY IF EXISTS FK_D858AB222FFD4FD3');

        // Tables créées par cette migration uniquement → DROP IF EXISTS pour sécuriser le rollback
        // sur une base où certaines tables préexistaient avant la migration.
        $this->addSql('DROP TABLE IF EXISTS subscription_upgrade_requests');
        $this->addSql('DROP TABLE IF EXISTS subscription_plans');

        // admin_roles : supprimer la FK et l'index sur users avant de supprimer la table référencée
        $this->addSql('DROP INDEX IF EXISTS IDX_1483A5E9123FA025 ON users');
        $this->addSql('ALTER TABLE users DROP FOREIGN KEY IF EXISTS FK_1483A5E9123FA025');
        $this->addSql('DROP TABLE IF EXISTS admin_roles');
        $this->addSql('DROP TABLE IF EXISTS admin_audit_logs');

        // Colonnes conditionnelles : ne supprimer que si présentes.
        // Un rollback sur une base où ces colonnes préexistaient ne doit pas les supprimer.
        $db = $this->connection->getDatabase();

        $conditionalDrops = [
            'users' => ['password_reset_token', 'password_reset_expires_at', 'admin_role_id'],
            'farms' => ['phone', 'email', 'address', 'ifu', 'rccm', 'description'],
            'inventory_items' => ['custom_category', 'package_weight_kg'],
            'organizations' => ['subscription_billing_cycle', 'subscription_renewal_date', 'subscription_trial_ends_at'],
            'transactions' => ['payment_status', 'paid_amount', 'due_date'],
        ];

        foreach ($conditionalDrops as $table => $columns) {
            foreach ($columns as $column) {
                $this->addSql("
                    SELECT IF(
                        EXISTS (
                            SELECT 1 FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table' AND COLUMN_NAME = '$column'
                        ),
                        'ALTER TABLE $table DROP COLUMN $column',
                        'SELECT 1'
                    ) INTO @sql
                ");
                $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
            }
        }
    }
}
