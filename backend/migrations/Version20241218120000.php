<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20241218120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Update Notice entity for user reporting functionality';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE notice CHANGE comment_id comment_id BIGINT DEFAULT NULL');
        $this->addSql('ALTER TABLE notice ADD reported_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notice ADD reporter_user_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE notice ADD reason LONGTEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE notice ADD created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
        $this->addSql('ALTER TABLE notice ADD is_resolved TINYINT(1) NOT NULL DEFAULT 0');
        $this->addSql('ALTER TABLE notice ADD CONSTRAINT FK_480D45C2E1B55931 FOREIGN KEY (reported_user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE notice ADD CONSTRAINT FK_480D45C2F65A3B00 FOREIGN KEY (reporter_user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_480D45C2E1B55931 ON notice (reported_user_id)');
        $this->addSql('CREATE INDEX IDX_480D45C2F65A3B00 ON notice (reporter_user_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE notice DROP FOREIGN KEY FK_480D45C2E1B55931');
        $this->addSql('ALTER TABLE notice DROP FOREIGN KEY FK_480D45C2F65A3B00');
        $this->addSql('DROP INDEX IDX_480D45C2E1B55931 ON notice');
        $this->addSql('DROP INDEX IDX_480D45C2F65A3B00 ON notice');
        $this->addSql('ALTER TABLE notice DROP reported_user_id');
        $this->addSql('ALTER TABLE notice DROP reporter_user_id');
        $this->addSql('ALTER TABLE notice DROP reason');
        $this->addSql('ALTER TABLE notice DROP created_at');
        $this->addSql('ALTER TABLE notice DROP is_resolved');
        $this->addSql('ALTER TABLE notice CHANGE comment_id comment_id BIGINT NOT NULL');
    }
} 