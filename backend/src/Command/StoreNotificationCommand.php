<?php

namespace App\Command;

use App\Entity\Store;
use App\Utilities\MyMailer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:store-notification',
    description: 'Askıda kitap ilanları için aylık bildirim gönderir',
)]
class StoreNotificationCommand extends Command
{
    private EntityManagerInterface $entityManager;
    private MyMailer $myMailer;

    public function __construct(EntityManagerInterface $entityManager, MyMailer $myMailer)
    {
        $this->entityManager = $entityManager;
        $this->myMailer = $myMailer;
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Askıda Kitap İlanları - Aylık Bildirim');

        // 30 gün önce veya daha eski bildirim gönderilmiş aktif ilanları bul
        $qb = $this->entityManager->createQueryBuilder();
        $qb->select('s')
           ->from(Store::class, 's')
           ->where('s.isActive = :active')
           ->andWhere('s.status = :status')
           ->andWhere(
               $qb->expr()->orX(
                   's.lastNotificationDate IS NULL',
                   's.lastNotificationDate <= :thirtyDaysAgo'
               )
           )
           ->setParameter('active', true)
           ->setParameter('status', 'active')
           ->setParameter('thirtyDaysAgo', new \DateTime('-30 days'));

        $stores = $qb->getQuery()->getResult();

        $sentCount = 0;
        $passiveCount = 0;

        foreach ($stores as $store) {
            $owner = $store->getOwner();
            
            if (!$owner || !$owner->getMail() || !$owner->isMailAuth()) {
                continue;
            }

            try {
                // Mail gönder
                $subject = 'İlanınızın Durumu - DK List';
                $mailContent = [
                    'username' => $owner->getUsername(),
                    'storeTitle' => $store->getTitle(),
                    'storeSlug' => $store->getSlug(),
                    'createdDate' => $store->getCreatedDate()->format('d.m.Y'),
                    'bookTitle' => $store->getBook() ? $store->getBook()->getTitle() : 'Bilinmiyor'
                ];

                $this->myMailer->sendMail(
                    $owner->getMail(),
                    $subject,
                    $mailContent,
                    4 // Store notification template
                );

                // Son bildirim tarihini güncelle
                $store->setLastNotificationDate(new \DateTime());
                $this->entityManager->persist($store);
                
                $sentCount++;
                $io->text("✅ {$owner->getUsername()} kullanıcısına bildirim gönderildi: {$store->getTitle()}");

            } catch (\Exception $e) {
                $io->error("❌ {$owner->getUsername()} kullanıcısına mail gönderilemedi: " . $e->getMessage());
            }
        }

        // 60 günden eski ve bildirim gönderilmiş ilanları pasife al
        $qb2 = $this->entityManager->createQueryBuilder();
        $qb2->select('s')
            ->from(Store::class, 's')
            ->where('s.isActive = :active')
            ->andWhere('s.status = :status')
            ->andWhere('s.lastNotificationDate IS NOT NULL')
            ->andWhere('s.lastNotificationDate <= :sixtyDaysAgo')
            ->setParameter('active', true)
            ->setParameter('status', 'active')
            ->setParameter('sixtyDaysAgo', new \DateTime('-60 days'));

        $oldStores = $qb2->getQuery()->getResult();

        foreach ($oldStores as $store) {
            $store->setIsActive(false);
            $store->setStatus('passive');
            $this->entityManager->persist($store);
            $passiveCount++;
            
            $io->text("⏸️ İlan pasife alındı: {$store->getTitle()}");
        }

        $this->entityManager->flush();

        $io->success([
            "Toplam {$sentCount} bildirim gönderildi",
            "Toplam {$passiveCount} ilan pasife alındı"
        ]);

        return Command::SUCCESS;
    }
} 