<?php

namespace App\Controller;

use App\Utilities\MyMailer;
use App\Enums\UserTypeEnum;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class MailController extends AbstractController
{

    private MyMailer $myMailer;
    private EntityManagerInterface $entityManager;

    public function __construct(MyMailer $myMailer, EntityManagerInterface $entityManager){
        $this->myMailer = $myMailer;
        $this->entityManager = $entityManager;
    }

    public function sendMail(){
        return new JsonResponse(['status' => $this->myMailer->sendMail('xyzumut06@gmail.com')], 200);
    }

    /**
     * Test mail templates
     */
    public function testMailTemplate(Request $request): JsonResponse
    {
        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Admin, UserTypeEnum::SuperAdmin]);

        if ($permission->error === true) {
            $message = 'Bir hata oluştu, hata kodu #MailController-test-1';
            if (in_array($permission->errorCode, [1, 2, 3, 4])) {
                $message = $permission->errorMessage;
            }
            return new JsonResponse(['status' => false, 'message' => $message, 'response' => null], 401);
        }

        $payload = json_decode($request->getContent());
        $templateType = isset($payload->templateType) ? $payload->templateType : 1;
        $testEmail = isset($payload->testEmail) ? $payload->testEmail : 'test@example.com';

        try {
            $subject = '';
            $mailContent = [];

            switch ($templateType) {
                case 1:
                    $subject = 'Test Mail Template 1 - DK List';
                    $mailContent = [
                        'mailHeader' => 'Test Mail Başlığı',
                        'paragraph' => 'Bu bir test mailidir. Template 1 test ediliyor.'
                    ];
                    break;

                case 3:
                    $subject = 'Test Blog Onay - DK List';
                    $mailContent = [
                        'username' => 'Test Kullanıcı',
                        'blogTitle' => 'Test Blog Başlığı',
                        'blogSlug' => 'test-blog-basligi',
                        'approvalDate' => date('d.m.Y H:i')
                    ];
                    break;

                case 4:
                    $subject = 'Test Store Bildirimi - DK List';
                    $mailContent = [
                        'username' => 'Test Kullanıcı',
                        'storeTitle' => 'Test İlan Başlığı',
                        'storeSlug' => 'test-ilan-basligi',
                        'createdDate' => date('d.m.Y'),
                        'bookTitle' => 'Test Kitap Adı'
                    ];
                    break;

                case 5:
                    $subject = 'Test Aktivasyon Hatırlatması 1 - DK List';
                    $mailContent = [
                        'username' => 'Test Kullanıcı',
                        'email' => $testEmail,
                        'registrationDate' => date('d.m.Y'),
                        'daysSince' => 5,
                        'activationToken' => 'test-activation-token-123'
                    ];
                    break;

                case 6:
                    $subject = 'Test Aktivasyon Hatırlatması 2 - DK List';
                    $mailContent = [
                        'username' => 'Test Kullanıcı',
                        'email' => $testEmail,
                        'registrationDate' => date('d.m.Y', strtotime('-10 days')),
                        'daysSince' => 10,
                        'activationToken' => 'test-activation-token-123'
                    ];
                    break;

                case 7:
                    $subject = 'Test Son Hatırlatma - DK List';
                    $mailContent = [
                        'username' => 'Test Kullanıcı',
                        'email' => $testEmail,
                        'registrationDate' => date('d.m.Y', strtotime('-20 days')),
                        'daysSince' => 20,
                        'activationToken' => 'test-activation-token-123'
                    ];
                    break;

                default:
                    return new JsonResponse(['status' => false, 'message' => 'Geçersiz template tipi'], 400);
            }

            $result = $this->myMailer->sendMail($testEmail, $subject, $mailContent, $templateType);

            if ($result) {
                return new JsonResponse([
                    'status' => true, 
                    'message' => "Template $templateType test maili $testEmail adresine gönderildi",
                    'response' => [
                        'templateType' => $templateType,
                        'testEmail' => $testEmail,
                        'subject' => $subject
                    ]
                ], 200);
            } else {
                return new JsonResponse(['status' => false, 'message' => 'Mail gönderilemedi'], 500);
            }

        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => false, 
                'message' => 'Mail gönderim hatası: ' . $e->getMessage()
            ], 500);
        }
    }
}
