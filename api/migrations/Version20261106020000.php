<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261106020000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute quantity_before et quantity_after sur flock_movements pour tracer avec exactitude les effectifs avant/apres scission ou ajustement';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE flock_movements ADD quantity_before INT DEFAULT NULL, ADD quantity_after INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE flock_movements DROP quantity_before, DROP quantity_after');
    }
}
