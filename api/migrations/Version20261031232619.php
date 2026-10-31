<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261031232619 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE farm_membership_buildings (farm_membership_id BINARY(16) NOT NULL, building_id BINARY(16) NOT NULL, INDEX IDX_57B0D8FDFD41EB64 (farm_membership_id), INDEX IDX_57B0D8FD4D2A7E12 (building_id), PRIMARY KEY (farm_membership_id, building_id)) DEFAULT CHARACTER SET utf8mb4 ENGINE = InnoDB');
        $this->addSql('ALTER TABLE farm_membership_buildings ADD CONSTRAINT FK_57B0D8FDFD41EB64 FOREIGN KEY (farm_membership_id) REFERENCES farm_memberships (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE farm_membership_buildings ADD CONSTRAINT FK_57B0D8FD4D2A7E12 FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE farm_membership_buildings DROP FOREIGN KEY FK_57B0D8FDFD41EB64');
        $this->addSql('ALTER TABLE farm_membership_buildings DROP FOREIGN KEY FK_57B0D8FD4D2A7E12');
        $this->addSql('DROP TABLE farm_membership_buildings');
    }
}
