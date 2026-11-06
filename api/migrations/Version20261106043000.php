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
        $db = $this->connection->getDatabase();

        // ── Suivi précis de ce que cette migration crée réellement ───────────────
        // La table _mig_43000_state est créée en tout début de up() et supprimée
        // en fin de down(). Elle liste exactement les éléments créés par ce up(),
        // ce qui permet au down() de ne détruire QUE ce que cette migration a ajouté,
        // et de ne jamais toucher aux colonnes/tables qui préexistaient.
        //
        // TRUNCATE immédiat après CREATE : garantit un état propre même en cas de
        // relance après une exécution interrompue. Les entrées de la tentative
        // précédente sont effacées ; la nouvelle exécution repart d'une ardoise vierge
        // et enregistre uniquement les éléments qu'elle crée réellement.
        $this->addSql('CREATE TABLE IF NOT EXISTS _mig_43000_state (item VARCHAR(255) NOT NULL, PRIMARY KEY (item)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        $this->addSql('TRUNCATE TABLE _mig_43000_state');

        // ── Tables : CREATE TABLE IF NOT EXISTS ──────────────────────────────────
        // On note dans _mig_43000_state uniquement les tables qui n'existaient PAS.
        foreach (['admin_audit_logs', 'admin_roles', 'subscription_plans', 'subscription_upgrade_requests'] as $tbl) {
            $this->addSql("
                SELECT COUNT(*) INTO @tbl_existed
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$tbl'
            ");
            // Insertion de la clé de suivi si la table était absente
            $this->addSql("
                INSERT IGNORE INTO _mig_43000_state (item)
                SELECT 'table:$tbl' WHERE @tbl_existed = 0
            ");
        }

        $this->addSql('CREATE TABLE IF NOT EXISTS admin_audit_logs (id BINARY(16) NOT NULL, actor_id VARCHAR(100) DEFAULT NULL, actor_email VARCHAR(180) NOT NULL, actor_name VARCHAR(200) NOT NULL, actor_role VARCHAR(100) NOT NULL, action VARCHAR(100) NOT NULL, label VARCHAR(255) NOT NULL, target_type VARCHAR(100) NOT NULL, target_id VARCHAR(100) NOT NULL, target_name VARCHAR(255) NOT NULL, details LONGTEXT NOT NULL, client_ip VARCHAR(45) DEFAULT NULL, status VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL, INDEX idx_admin_audit_action (action), INDEX idx_admin_audit_created_at (created_at), INDEX idx_admin_audit_target (target_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS admin_roles (id BINARY(16) NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(60) NOT NULL, description LONGTEXT DEFAULT NULL, permissions JSON NOT NULL, is_system TINYINT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_admin_role_code (code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS subscription_plans (id BINARY(16) NOT NULL, sku VARCHAR(50) NOT NULL, name VARCHAR(120) NOT NULL, tier VARCHAR(80) NOT NULL, badge VARCHAR(50) DEFAULT NULL, description LONGTEXT DEFAULT NULL, price_monthly INT NOT NULL, price_annually INT NOT NULL, currency VARCHAR(10) NOT NULL, status VARCHAR(20) NOT NULL, available_from DATETIME DEFAULT NULL, available_to DATETIME DEFAULT NULL, is_visibility_public TINYINT NOT NULL, trial_days INT NOT NULL, allowed_billing_cycles JSON NOT NULL, modules JSON NOT NULL, quotas JSON NOT NULL, features JSON NOT NULL, flags JSON NOT NULL, is_popular TINYINT NOT NULL, is_recommended TINYINT NOT NULL, is_active TINYINT NOT NULL, is_system TINYINT NOT NULL, version INT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, UNIQUE INDEX uniq_subscription_plan_sku (sku), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('CREATE TABLE IF NOT EXISTS subscription_upgrade_requests (id BINARY(16) NOT NULL, current_plan VARCHAR(50) NOT NULL, target_plan VARCHAR(50) NOT NULL, target_plan_name VARCHAR(150) NOT NULL, billing_cycle VARCHAR(20) NOT NULL, message LONGTEXT DEFAULT NULL, status VARCHAR(30) NOT NULL, admin_notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, processed_at DATETIME DEFAULT NULL, farm_id BINARY(16) NOT NULL, organization_id BINARY(16) NOT NULL, user_id BINARY(16) NOT NULL, processed_by_id BINARY(16) DEFAULT NULL, INDEX idx_sub_req_status (status), INDEX idx_sub_req_created_at (created_at), INDEX IDX_D858AB2265FCFA0D (farm_id), INDEX IDX_D858AB2232C8A3DE (organization_id), INDEX IDX_D858AB22A76ED395 (user_id), INDEX IDX_D858AB222FFD4FD3 (processed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');

        // ── Colonnes : chaque colonne vérifiée individuellement ──────────────────
        // Si la colonne est absente → on l'ajoute ET on l'enregistre dans _mig_43000_state.
        // Si la colonne était déjà présente → on ne fait rien, et surtout le down()
        // ne la supprimera pas (car elle ne sera pas dans _mig_43000_state).
        $conditionalAdds = [
            'farms' => [
                'phone'       => 'ALTER TABLE farms ADD phone VARCHAR(50) DEFAULT NULL',
                'email'       => 'ALTER TABLE farms ADD email VARCHAR(150) DEFAULT NULL',
                'address'     => 'ALTER TABLE farms ADD address VARCHAR(255) DEFAULT NULL',
                'ifu'         => 'ALTER TABLE farms ADD ifu VARCHAR(50) DEFAULT NULL',
                'rccm'        => 'ALTER TABLE farms ADD rccm VARCHAR(50) DEFAULT NULL',
                'description' => 'ALTER TABLE farms ADD description VARCHAR(255) DEFAULT NULL',
            ],
            'inventory_items' => [
                'custom_category'   => 'ALTER TABLE inventory_items ADD custom_category VARCHAR(100) DEFAULT NULL',
                'package_weight_kg' => 'ALTER TABLE inventory_items ADD package_weight_kg NUMERIC(8, 2) DEFAULT NULL',
            ],
            'organizations' => [
                'subscription_billing_cycle' => "ALTER TABLE organizations ADD subscription_billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY'",
                'subscription_renewal_date'  => 'ALTER TABLE organizations ADD subscription_renewal_date DATETIME DEFAULT NULL',
                'subscription_trial_ends_at' => 'ALTER TABLE organizations ADD subscription_trial_ends_at DATETIME DEFAULT NULL',
            ],
            'transactions' => [
                'payment_status' => "ALTER TABLE transactions ADD payment_status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED'",
                'paid_amount'    => 'ALTER TABLE transactions ADD paid_amount BIGINT DEFAULT NULL',
                'due_date'       => 'ALTER TABLE transactions ADD due_date DATE DEFAULT NULL',
            ],
            'users' => [
                'password_reset_token'      => 'ALTER TABLE users ADD password_reset_token VARCHAR(100) DEFAULT NULL',
                'password_reset_expires_at' => 'ALTER TABLE users ADD password_reset_expires_at DATETIME DEFAULT NULL',
                'admin_role_id'             => 'ALTER TABLE users ADD admin_role_id BINARY(16) DEFAULT NULL',
            ],
        ];

        foreach ($conditionalAdds as $table => $columns) {
            foreach ($columns as $column => $alterSql) {
                // Vérifier si la colonne est absente et la créer si besoin
                $escapedSql = str_replace("'", "''", $alterSql);
                $this->addSql("
                    SELECT IF(
                        NOT EXISTS (
                            SELECT 1 FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table' AND COLUMN_NAME = '$column'
                        ),
                        '$escapedSql',
                        'SELECT 1'
                    ) INTO @sql
                ");
                $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
                // Enregistrer uniquement les colonnes que CETTE migration a créées
                $this->addSql("
                    INSERT IGNORE INTO _mig_43000_state (item)
                    SELECT 'col:$table:$column'
                    WHERE @sql != 'SELECT 1'
                ");
            }
        }

        // ── FK et index ──────────────────────────────────────────────────────────
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
        $this->addSql("INSERT IGNORE INTO _mig_43000_state (item) SELECT 'fk:users:FK_1483A5E9123FA025' WHERE @sql != 'SELECT 1'");

        $this->addSql("
            SELECT IF(
                NOT EXISTS (
                    SELECT 1 FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_1483A5E9123FA025'
                ),
                'CREATE INDEX IDX_1483A5E9123FA025 ON users (admin_role_id)',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
        $this->addSql("INSERT IGNORE INTO _mig_43000_state (item) SELECT 'idx:users:IDX_1483A5E9123FA025' WHERE @sql != 'SELECT 1'");

        // ── FK de subscription_upgrade_requests : chaque contrainte vérifiée ────
        // individuellement dans information_schema avant ajout, et enregistrée
        // dans _mig_43000_state uniquement si elle a été créée par ce up().
        $subFks = [
            'FK_D858AB2265FCFA0D' => 'ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2265FCFA0D FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE',
            'FK_D858AB2232C8A3DE' => 'ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB2232C8A3DE FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE',
            'FK_D858AB22A76ED395' => 'ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB22A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE',
            'FK_D858AB222FFD4FD3' => 'ALTER TABLE subscription_upgrade_requests ADD CONSTRAINT FK_D858AB222FFD4FD3 FOREIGN KEY (processed_by_id) REFERENCES users (id) ON DELETE SET NULL',
        ];

        foreach ($subFks as $fkName => $fkSql) {
            $escapedFkSql = str_replace("'", "''", $fkSql);
            $this->addSql("
                SELECT IF(
                    NOT EXISTS (
                        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                        WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'subscription_upgrade_requests'
                          AND CONSTRAINT_NAME = '$fkName' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                    ),
                    '$escapedFkSql',
                    'SELECT 1'
                ) INTO @sql
            ");
            $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
            $this->addSql("INSERT IGNORE INTO _mig_43000_state (item) SELECT 'fk:subscription_upgrade_requests:$fkName' WHERE @sql != 'SELECT 1'");
        }
    }

    public function down(Schema $schema): void
    {
        // down() ne supprime QUE les éléments enregistrés dans _mig_43000_state
        // lors du up(). Un élément qui préexistait avant la migration n'y figure pas
        // et ne sera donc jamais détruit par ce rollback.
        //
        // Toutes les lectures de _mig_43000_state passent par PREPARE/EXECUTE pour
        // éviter une erreur "table not found" si la table n'existe pas (migration
        // jamais appliquée, ou déjà rollbackée).
        $db = $this->connection->getDatabase();

        // Vérifier si la table de suivi existe
        $this->addSql("
            SELECT COUNT(*) INTO @state_exists
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '_mig_43000_state'
        ");

        // ── FK de subscription_upgrade_requests : vérifiées individuellement ─────
        // dans _mig_43000_state via PREPARE, cohérent avec tous les autres éléments.
        foreach (['FK_D858AB2265FCFA0D', 'FK_D858AB2232C8A3DE', 'FK_D858AB22A76ED395', 'FK_D858AB222FFD4FD3'] as $fk) {
            $this->addSql("
                SET @check_stmt = IF(
                    @state_exists > 0,
                    CONCAT('SELECT COUNT(*) INTO @was_created FROM _mig_43000_state WHERE item = ''fk:subscription_upgrade_requests:$fk'''),
                    'SELECT 0 INTO @was_created'
                )
            ");
            $this->addSql('PREPARE chk FROM @check_stmt; EXECUTE chk; DEALLOCATE PREPARE chk');
            $this->addSql("
                SELECT IF(
                    @was_created > 0 AND EXISTS (
                        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                        WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'subscription_upgrade_requests'
                          AND CONSTRAINT_NAME = '$fk' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                    ),
                    'ALTER TABLE subscription_upgrade_requests DROP FOREIGN KEY $fk',
                    'SELECT 1'
                ) INTO @sql
            ");
            $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
        }

        // ── Tables : détruites seulement si CETTE migration les a créées ──────
        // La vérification dans _mig_43000_state passe par PREPARE pour éviter
        // l'erreur "table not found" si _mig_43000_state n'existe pas.
        foreach (['subscription_upgrade_requests', 'subscription_plans', 'admin_roles', 'admin_audit_logs'] as $tbl) {
            // Étape 1 : vérifier dans _mig_43000_state via instruction préparée
            $this->addSql("
                SET @check_stmt = IF(
                    @state_exists > 0,
                    CONCAT('SELECT COUNT(*) INTO @was_created FROM _mig_43000_state WHERE item = ''table:$tbl'''),
                    'SELECT 0 INTO @was_created'
                )
            ");
            $this->addSql('PREPARE chk FROM @check_stmt; EXECUTE chk; DEALLOCATE PREPARE chk');
            // Étape 2 : supprimer la table seulement si elle a été créée par ce up()
            $this->addSql("
                SELECT IF(
                    @was_created > 0 AND EXISTS (
                        SELECT 1 FROM information_schema.TABLES
                        WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$tbl'
                    ),
                    'DROP TABLE $tbl',
                    'SELECT 1'
                ) INTO @sql
            ");
            $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');
        }

        // ── Index IDX_1483A5E9123FA025 sur users ─────────────────────────────
        $this->addSql("
            SET @check_stmt = IF(
                @state_exists > 0,
                'SELECT COUNT(*) INTO @was_created FROM _mig_43000_state WHERE item = ''idx:users:IDX_1483A5E9123FA025''',
                'SELECT 0 INTO @was_created'
            )
        ");
        $this->addSql('PREPARE chk FROM @check_stmt; EXECUTE chk; DEALLOCATE PREPARE chk');
        $this->addSql("
            SELECT IF(
                @was_created > 0 AND EXISTS (
                    SELECT 1 FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_1483A5E9123FA025'
                ),
                'DROP INDEX IDX_1483A5E9123FA025 ON users',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        // ── FK FK_1483A5E9123FA025 sur users ─────────────────────────────────
        $this->addSql("
            SET @check_stmt = IF(
                @state_exists > 0,
                'SELECT COUNT(*) INTO @was_created FROM _mig_43000_state WHERE item = ''fk:users:FK_1483A5E9123FA025''',
                'SELECT 0 INTO @was_created'
            )
        ");
        $this->addSql('PREPARE chk FROM @check_stmt; EXECUTE chk; DEALLOCATE PREPARE chk');
        $this->addSql("
            SELECT IF(
                @was_created > 0 AND EXISTS (
                    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = 'users'
                      AND CONSTRAINT_NAME = 'FK_1483A5E9123FA025' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                ),
                'ALTER TABLE users DROP FOREIGN KEY FK_1483A5E9123FA025',
                'SELECT 1'
            ) INTO @sql
        ");
        $this->addSql('PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt');

        // ── Colonnes : uniquement si enregistrées dans _mig_43000_state ──────
        $allColumns = [
            'users'           => ['password_reset_token', 'password_reset_expires_at', 'admin_role_id'],
            'farms'           => ['phone', 'email', 'address', 'ifu', 'rccm', 'description'],
            'inventory_items' => ['custom_category', 'package_weight_kg'],
            'organizations'   => ['subscription_billing_cycle', 'subscription_renewal_date', 'subscription_trial_ends_at'],
            'transactions'    => ['payment_status', 'paid_amount', 'due_date'],
        ];

        foreach ($allColumns as $table => $columns) {
            foreach ($columns as $column) {
                // Vérifier via PREPARE si la colonne a été créée par ce up()
                $this->addSql("
                    SET @check_stmt = IF(
                        @state_exists > 0,
                        CONCAT('SELECT COUNT(*) INTO @was_created FROM _mig_43000_state WHERE item = ''col:$table:$column'''),
                        'SELECT 0 INTO @was_created'
                    )
                ");
                $this->addSql('PREPARE chk FROM @check_stmt; EXECUTE chk; DEALLOCATE PREPARE chk');
                $this->addSql("
                    SELECT IF(
                        @was_created > 0 AND EXISTS (
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

        // ── Nettoyage final ───────────────────────────────────────────────────
        $this->addSql('DROP TABLE IF EXISTS _mig_43000_state');
    }
}
