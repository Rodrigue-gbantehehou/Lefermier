<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261017112956 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE egg_productions (id BINARY(16) NOT NULL, production_date DATE NOT NULL, session VARCHAR(20) NOT NULL, good_eggs INT NOT NULL, cracked_eggs INT NOT NULL, dirty_eggs INT NOT NULL, deformed_eggs INT NOT NULL, total_eggs INT NOT NULL, trays_count INT NOT NULL, loose_eggs_count INT NOT NULL, flock_quantity_at_date INT NOT NULL, laying_rate NUMERIC(5, 2) NOT NULL, notes LONGTEXT DEFAULT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, flock_id BINARY(16) NOT NULL, recorded_by_id BINARY(16) DEFAULT NULL, UNIQUE INDEX uniq_flock_date_session (flock_id, production_date, session), INDEX IDX_A245B5336DA78CF6 (flock_id), INDEX IDX_A245B533D05A957B (recorded_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE egg_productions ADD CONSTRAINT FK_A245B5336DA78CF6 FOREIGN KEY (flock_id) REFERENCES flocks (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE egg_productions ADD CONSTRAINT FK_A245B533D05A957B FOREIGN KEY (recorded_by_id) REFERENCES users (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE egg_productions DROP FOREIGN KEY FK_A245B5336DA78CF6');
        $this->addSql('ALTER TABLE egg_productions DROP FOREIGN KEY FK_A245B533D05A957B');
        $this->addSql('DROP TABLE egg_productions');
    }
}
