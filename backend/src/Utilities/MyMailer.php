<?php
namespace App\Utilities;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Twig\Environment;

class MyMailer {

    private Environment $twig;
    private MailerInterface $mailer;
    private string $fromAddress;
    private string $fromName;

    public function __construct(Environment $twig, MailerInterface $mailer, string $mailerFromAddress, string $mailerFromName)
    {
        $this->twig = $twig;
        $this->mailer = $mailer;
        $this->fromAddress = $mailerFromAddress;
        $this->fromName = $mailerFromName;
    }

    public function sendMail($target, $subject, $content = [], $template=1 ){

        if ( !is_array($content) ) {
            $content = [];
        }

        $email = ( new Email() )
            ->from(new Address($this->fromAddress, $this->fromName))
            ->to( $target )
            ->subject( $subject )
            ->html( $this->twig->render(
                "mail-template-$template/index.html.twig", // Şablon dosyası
                $content
            ));

        $this->mailer->send( $email );

        return true;
    }
}