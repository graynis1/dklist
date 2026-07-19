<?php

namespace App\Command;

use App\Utilities\MyMailer;
use App\Entity\Book;
use App\Entity\Publisher;
use App\Entity\User;
use App\Enums\SexEnum;
use App\Enums\UserTypeEnum;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Twig\Environment;

#[AsCommand(
    name: 'Test',
    description: 'Test komutu',
)]
class TestCommand extends Command
{
    private EntityManagerInterface $entityManager;
    private Environment $twig;
    private MyMailer $myMailer;
    public function __construct( EntityManagerInterface $entityManager, Environment $twig, MyMailer $myMailer )
    {
        parent::__construct();
        $this->entityManager = $entityManager;
        $this->twig = $twig;
        $this->myMailer = $myMailer;
    }

    protected function configure(): void
    {
        $this
            ->addArgument('arg1', InputArgument::OPTIONAL, 'Argument description')
            ->addOption('option1', null, InputOption::VALUE_NONE, 'Option description')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        return $this->mailtest();
        return $this->bookTest($input, $output);
    }

    private function mailtest() {
        $myMailer = $this->myMailer;
        $name = 'isim';
        $lang = null;
        $userId = 31;
        $mailContent = [
            'confirmLink' => $_SERVER['HTTP_HOST']."/verify?userID=$userId",
            'footer' => $lang === 'us' ? 'Thanks, DKList' : 'Teşekkürler, DKList Yönetimi',
            'mailHeader' => $lang === 'us' ? "Hello $name" : "Merhaba $name",
            'paragraph' => $lang === 'us' ? 'This is a verification email, please click the button below to verify.' : 'Bu bir doğrulama mailidir, hesabınızı doğrulamak için lütfen aşağıdaki doğrulama butonuna basın',
            'confirmText' => $lang === 'us' ? 'Verify' : 'Hesabı Doğrula'
        ];
        $myMailer->sendMail('xyzumut06@gmail.com', $lang === 'us' ? 'DKList Mail Verification' : 'DKList Mail Doğrulaması', $mailContent);
        return 1;
    }

    private function bookTest($input, $output) : int {

        $publisherID = 1;
        $publisher = $this->entityManager->getRepository(Publisher::class)->find($publisherID);
        if ( ! $publisher ){
            # sıkıntı
        }

        $newBook = new Book();
        $newBook->setName('Kitap Adi');#
        $newBook->setLang('TR');
        $newBook->setPublisher($publisher);
        $newBook->setDate(null);
        $newBook->setContent(null);
        $newBook->setFormat(null);
        $newBook->setIsbn(null);
        $newBook->setImage(null);

        $this->entityManager->persist($newBook);
        $this->entityManager->flush();
        return 1;
    }


    private function publisherTest($input, $output) : int {
        $newPublisher = new Publisher();
        $newPublisher->setName('Araç&Gereç Yayın Evi');
        $this->entityManager->persist($newPublisher);
        $this->entityManager->flush();
        return 1;
    }

    private function userTest($input, $output) : int {
        $username = 'admin';
        $mail     = $username.'@gmail.com';

        try {
            $this->userIsUnique($username, $mail);
            $newUser = new User();
            $newUser->setUsername($username);
            $newUser->setPassword('umut5248');
            $newUser->setMail($mail);
            $newUser->setToken($this->generateToken());
            $newUser->setUserType(UserTypeEnum::Admin->value);
            $newUser->setName('Umut');
            $newUser->setSurname('Gedik');
            $newUser->setBirthDate(\DateTime::createFromFormat('Y-m-d', '2023-12-12'));
            $newUser->setPrivacy(false);
            $newUser->setCreatedDate(\DateTime::createFromFormat('Y-m-d', date('Y-m-d')));
            $newUser->setSex(SexEnum::Male->value);
            try {
                $this->entityManager->persist($newUser);
                $this->entityManager->flush();
                $output->writeln('Komut bitti');
                return Command::SUCCESS;
            }
            catch(\Exception $error){

                $output->writeln('Komut patladı[1]');
                $output->writeln($error->getMessage());
            }
        }
        catch(\Exception $error){
            $output->writeln('Komut patladı[2]');
            $output->writeln($error->getMessage());
        }
        return Command::FAILURE;
    }
    private function generateToken($length = 30) {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $token = '';
        for ($i = 0; $i < $length; $i++) {
            $token .= $characters[rand(0, strlen($characters) - 1)];
        }
        return $token;
    }

    /**
     * @param $username
     * @param $mail
     * @return bool
     * @throws \Exception
     */
    private function userIsUnique( $username, $mail) : bool {
        if ( $this->entityManager->getRepository(User::class)->findOneBy(['username' => $username]) )
            throw new \Exception('Girilen kullanıcı adı hali hazırda kayıtlı!');

        if( $this->entityManager->getRepository(User::class)->findOneBy(['mail' => $mail]) )
            throw new \Exception('Girilen mail adresi hali hazırda kayıtlı!');

        return true;
    }
}
