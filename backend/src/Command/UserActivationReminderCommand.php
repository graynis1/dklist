<?php

namespace App\Command;

use App\Entity\User;
use App\Utilities\MyMailer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:user-activation-reminder',
    description: 'Üyeliğini aktif etmeyen kullanıcılara hatırlatma maili gönderir',
)]
class UserActivationReminderCommand extends Command
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

        $io->title('Üyelik Aktivasyon Hatırlatması');

        // Mail doğrulaması yapılmamış kullanıcıları bul
        $qb = $this->entityManager->createQueryBuilder();
        $qb->select('u')
           ->from(User::class, 'u')
           ->where('u.mailAuth = :mailAuth')
           ->andWhere('u.disable = :disable')
           ->andWhere('u.createdDate <= :threeDaysAgo') // 3 gün önce kayıt olmuş
           ->andWhere('u.createdDate >= :thirtyDaysAgo') // Ama 30 günden eski değil
           ->setParameter('mailAuth', false)
           ->setParameter('disable', false)
           ->setParameter('threeDaysAgo', new \DateTime('-3 days'))
           ->setParameter('thirtyDaysAgo', new \DateTime('-30 days'));

        $users = $qb->getQuery()->getResult();

        $sentCount = 0;
        $disabledCount = 0;

        foreach ($users as $user) {
            if (!$user->getMail()) {
                continue;
            }

            $daysSinceRegistration = $user->getCreatedDate()->diff(new \DateTime())->days;

            try {
                // Farklı günlerde farklı mesajlar gönder
                if ($daysSinceRegistration >= 3 && $daysSinceRegistration < 7) {
                    // 3-7 gün arası: İlk hatırlatma
                    $subject = 'Hesabınızı Aktif Edin - DK List';
                    $templateType = 5; // İlk hatırlatma template
                } elseif ($daysSinceRegistration >= 7 && $daysSinceRegistration < 14) {
                    // 7-14 gün arası: İkinci hatırlatma
                    $subject = 'Hesabınız Hala Aktif Değil - DK List';
                    $templateType = 6; // İkinci hatırlatma template
                } elseif ($daysSinceRegistration >= 14 && $daysSinceRegistration < 30) {
                    // 14-30 gün arası: Son hatırlatma
                    $subject = 'Son Hatırlatma: Hesabınızı Aktif Edin - DK List';
                    $templateType = 7; // Son hatırlatma template
                } else {
                    continue; // Bu aralıkta değilse geç
                }

                $mailContent = [
                    'username' => $user->getUsername(),
                    'email' => $user->getMail(),
                    'registrationDate' => $user->getCreatedDate()->format('d.m.Y'),
                    'daysSince' => $daysSinceRegistration,
                    'activationToken' => $user->getMailAuthToken()
                ];

                $this->myMailer->sendMail(
                    $user->getMail(),
                    $subject,
                    $mailContent,
                    $templateType
                );

                $sentCount++;
                $io->text("✅ {$user->getUsername()} kullanıcısına hatırlatma gönderildi ({$daysSinceRegistration} gün)");

            } catch (\Exception $e) {
                $io->error("❌ {$user->getUsername()} kullanıcısına mail gönderilemedi: " . $e->getMessage());
            }
        }

        // 30 günden eski ve hala aktif olmayan hesapları devre dışı bırak
        $qb2 = $this->entityManager->createQueryBuilder();
        $qb2->select('u')
            ->from(User::class, 'u')
            ->where('u.mailAuth = :mailAuth')
            ->andWhere('u.disable = :disable')
            ->andWhere('u.createdDate <= :thirtyDaysAgo')
            ->setParameter('mailAuth', false)
            ->setParameter('disable', false)
            ->setParameter('thirtyDaysAgo', new \DateTime('-30 days'));

        $oldUsers = $qb2->getQuery()->getResult();

        foreach ($oldUsers as $user) {
            $user->setDisable(true);
            $this->entityManager->persist($user);
            $disabledCount++;
            
            $io->text("⏸️ Hesap devre dışı bırakıldı: {$user->getUsername()}");
        }

        $this->entityManager->flush();

        $io->success([
            "Toplam {$sentCount} hatırlatma gönderildi",
            "Toplam {$disabledCount} hesap devre dışı bırakıldı"
        ]);

        return Command::SUCCESS;
    }
} 