<?php

namespace App\Controller;


use App\Entity\Badges;
use App\Entity\Blog;
use App\Entity\DKNotifiaction;
use App\Entity\Notice;
use App\Entity\Publisher;
use App\Entity\Store;
use App\Entity\SubComment;
use App\Entity\User;
use App\Enums\UserTypeEnum;
use App\Utilities\DirtyController;
use App\Utilities\ImageManager;
use App\Utilities\MyMailer;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class UserController extends AbstractController{


    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;
    private MyMailer $myMailer;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager, MyMailer $myMailer ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
        $this->myMailer  = $myMailer;
    }


    private function generateToken($length = 30) {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $token = '';
        for ($i = 0; $i < $length; $i++) {
            $token .= $characters[rand(0, strlen($characters) - 1)];
        }
        return $token;
    }

    public function register(Request $request){
        $payload   = json_decode( $request->getContent() );
        $name      = isset( $payload->name )      ? $payload->name      : null;
        $surname   = isset( $payload->surname )   ? $payload->surname   : null;
        $username  = isset( $payload->username )  ? $payload->username  : null;
        $mail      = isset( $payload->mail )      ? $payload->mail      : null;
        $birthDate = isset( $payload->birthDate ) ? $payload->birthDate : null;
        $password  = isset( $payload->password )  ? $payload->password  : null;
        $sex       = isset( $payload->sex )       ? $payload->sex       : null;
        $lang      = isset( $payload->lang )      ? $payload->lang      : null;


        if ( empty($name) || empty($surname) || empty($username) || empty($mail) || empty($birthDate) || empty($sex) ) {
            return new JsonResponse( ['status' => false, 'message' => 'Eksik Bilgi Gönderildi', 'response' => null], 400);
        }

        if ($this->entityManager->getRepository(User::class)->findBy(['username' => $username])) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? "$username username is used" : "$username kullanıcı adı kullanılıyor.", 'response' => null], 400);
        }

        if ($this->entityManager->getRepository(User::class)->findBy(['mail' => $mail])) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? "$mail e-mail address is used" : "$mail mail adresi kullanılıyor.", 'response' => null], 400);
        }

        foreach([$name, $surname, $username, $mail] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        $token = $this->generateToken();
        $newUser = new User();
        $newUser->setUsername($username);
        $newUser->setPassword($password);
        $newUser->setMail($mail);
        $newUser->setUserType('Üye');
        $newUser->setBirthDate(\DateTime::createFromFormat('Y-m-d', $birthDate));
        $newUser->setName($name);
        $newUser->setSurname($surname);
        $newUser->setToken($token);
        $newUser->setPrivacy(false);
        $newUser->setCreatedDate(new \DateTime());
        $newUser->setSex($sex);
        $newUser->setMailAuth(false);
        $newUser->setDisable(false);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newUser );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){

            $mailContent = [
                'token' => substr($token,0,5),
                'footer' => $lang === 'en' ? 'Thanks, DKList' : 'Teşekkürler, DKList Yönetimi',
                'mailHeader' => $lang === 'en' ? "Hello $name" : "Merhaba $name",
                'paragraph' => $lang === 'en' ? 'This is a verification email, and your verification code is provided below.' : 'Bu bir doğrulama mailidir, doğrulama kodunuz aşağıdadır. Bu kodu giriş yaparken kullanabilirsiniz.',
            ];

            $mailSend = $this->myMailer->sendMail($mail, $lang === 'en' ? 'DKList Mail Verification' : 'DKList Mail Doğrulaması', $mailContent);

            return new JsonResponse( [ 'status' => true, 'message' => 'Yeni Kullanıcı Eklendi', 'response' => $mailSend ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #UC-add-1', 'response' => null ], 400);
        }
    }

    public function login(Request $request){
        $payload  = json_decode( $request->getContent() );
        $username = isset( $payload->username )  ? $payload->username  : null;
        $password = isset( $payload->password )  ? $payload->password  : null;
        $lang     = isset( $payload->lang )      ? $payload->lang      : null;

        if (empty($username) || empty($password)) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'Username and password are required.' : 'Kullanıcı adı ve şifre gereklidir' , 'response' => null], 400);
        }

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $username]);

        if ( ! $user) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? "There is no user named '$username'" : "'$username' adında bir kullanıcı yok" , 'response' => null], 400);
        }

        if ( $user->getPassword() !== $password ) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'The password is incorrect.' : 'Şifre Yanlış' , 'response' => null], 404);
        }

        if ( $user->isDisable() ) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? "I have been banned from DKList. If you believe there is a mistake, please send an email." : "DKList'ten yasaklandınız. Bir yanlışlık olduğunu düşünüyorsanız mail atınız." , 'response' => null], 404);
        }

        $token = $user->getToken();
        $auth  = $user->isMailAuth();

        if ( !$auth ) {
            $token = null;
        }

        $publisherID = null;
        if($user->getPublisher()){
            $publisherID = $user->getPublisher()->getId();
        }

        $response = [
            'publisher' => $publisherID,
            'username'  => $user->getUsername(),
            'userType'  => $user->getUserType(),
            'token'     => $token,
            'auth'      => $auth,
            'img'       => $this->imageManager->generateImageURL($user->getImage()),
            'id'        => $user->getId(),
        ];
        return new JsonResponse( ['status' => true, 'message' => null , 'response' => $response], 200);
    }

    public function authAccount(Request $request){
        $payload = json_decode( $request->getContent() );
        $userId  = isset( $payload->userId ) ? $payload->userId : null;
        $code    = isset( $payload->code )   ? $payload->code   : null;
        $lang    = isset( $payload->lang )   ? $payload->lang   : null;
        
        if (empty($userId) || empty($code)) {
            return new JsonResponse( ['status' => false, 'message' => 'User ID ve code gerekli' , 'response' => null], 400);
        }

        $user = $this->entityManager->getRepository(User::class)->find($userId);
        if ( !$user ) {
            return new JsonResponse( ['status' => false, 'message' => "$userId numaralı kullanıcı bulunamadı" , 'response' => null], 404);
        }

        $token = substr($user->getToken(),0,5);
        if ( $token !== $code ) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'The verification code is incorrect.' : 'Doğrulama kodu yanlış' , 'response' => null], 400);
        }

        $user->setMailAuth(true);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );
        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => $lang === 'en' ? 'Verification has been completed.' : 'Doğrulama yapıldı', 'response' => $user->getToken() ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #UC-auth-1', 'response' => null ], 400);
        }
    }

    public function resetPasswordRequest(Request $request){
        $payload = json_decode( $request->getContent() );
        $target  = isset( $payload->target ) ? $payload->target : null;
        $lang    = isset( $payload->lang )   ? $payload->lang   : null;

        if (empty($target)) {
            return new JsonResponse( ['status' => false, 'message' => 'Reset İsteği İçin Eksik Bilgi Gönderildi', 'response' => null], 400);
        }
        
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['username' => $target]);
        
        if ( !$user ) {
            $user = $this->entityManager->getRepository(User::class)->findOneBy(['mail' => $target]);
        }
        
        if ( !$user ) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'There is no such account' : 'Böyle Bir Hesap Yok', 'response' => null], 404);
        }

        $name = $user->getName();
        $mail = $user->getMail();

        $mailContent = [
            'token' => substr($user->getToken(),25,30),
            'footer' => $lang === 'en' ? 'Thanks, DKList' : 'Teşekkürler, DKList Yönetimi',
            'mailHeader' => $lang === 'en' ? "Hello $name" : "Merhaba $name",
            'paragraph' => $lang === 'en' ? 'Password reset request received, your password reset code is below.' : 'Şifre sıfırlama isteği alındı, şifre sıfırlama kodunuz aşağıdadır.',
        ];

        $mailSend = $this->myMailer->sendMail($mail, $lang === 'en' ? 'DKList Password Reset Request' : 'DKList Parola Sıfırlama İsteği', $mailContent);

        return new JsonResponse( ['status' => true, 'message' => $lang === 'en' ? 'Check Your Inbox' : 'Gelen Kutunuzu Kontrol Edin', 'response' => [ 'userID' => $user->getId()]], 200);
    }

    public function resetPassword(Request $request){
        $payload = json_decode( $request->getContent() );
        $userID  = isset( $payload->userID ) ? $payload->userID : null;
        $code    = isset( $payload->code ) ? $payload->code : null;
        $lang    = isset( $payload->lang )  ? $payload->lang   : null;

        if ( empty($userID) || empty($code) ) {
            return new JsonResponse( ['status' => false, 'message' => 'Reset İçin Eksik Bilgi Gönderildi', 'response' => null], 400);
        }

        $user = $this->entityManager->getRepository(User::class)->find($userID);
        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'There is no such account' : 'Böyle Bir Hesap Yok', 'response' => null], 404);
        }

        if (substr($user->getToken(),25,30) !== $code) {
            return new JsonResponse( ['status' => false, 'message' => $lang === 'en' ? 'Wrong Code' : 'Yanlış Kod', 'response' => null], 400);
        }

        $user->setPassword($this->generateToken(10));
        $user->setToken($this->generateToken());
        $user->setMailAuth(true);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){

            $name = $user->getName();
            $mail = $user->getMail();
            $mailContent = [
                'token' => $user->getPassword(),
                'footer' => $lang === 'en' ? 'Thanks, DKList' : 'Teşekkürler, DKList Yönetimi',
                'mailHeader' => $lang === 'en' ? "Hello $name" : "Merhaba $name",
                'paragraph' => $lang === 'en' ? 'Your password has been reset. Your new password is below.' : 'Parolanız sıfırlandı. Yeni parolanız aşağıdadır.',
            ];

            $mailSend = $this->myMailer->sendMail($mail, $lang === 'en' ? 'Your DKList Password Has Been Reset' : 'DKList Parolanız Sıfırlandı', $mailContent);



            return new JsonResponse( [ 'status' => true, 'message' => 'Şifre Sıfırlandı', 'response' => $user->getToken() ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #UC-reset-1', 'response' => null ], 400);
        }
    }

    public function getUserForAdmin(Request $request){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Mod, UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #UserAdminGetC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }
        
        $page        = json_decode( $request->query->get( 'page' ) );
        $pagePerSize = json_decode( $request->query->get( 'pagePerSize' ) );
        $search      = $request->query->get( 'search' );
        $orderBy     = $request->query->get( 'orderBy' );
        $sortBy      = $request->query->get( 'sortBy' );
        $getAll      = $request->query->get( 'getAll' );
        
        if ( empty( $orderBy ) )
            $orderBy = 'ASC';
        if ( empty( $page ) || $page < 0 )
            $page = 1;
        if ( empty( $pagePerSize ) || $pagePerSize < 0 || $pagePerSize > 100 )
            $pagePerSize = 10;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'id';

        $qb = $this->entityManager->createQueryBuilder();
        $qb ->select('user') ->from('App\Entity\User', 'user')
            ->orderBy('user.'.$sortBy, $orderBy);

        if ($search !== '') {
            $qb->where( $qb->expr()->like('LOWER(user.username)', ':searchTermLower') )
                ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT user.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( !$getAll && $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }
        

        $users = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $users as $user ){
            
            if($user->getToken() === str_replace('Bearer ', '', $bearer) || $user->getUserType() === UserTypeEnum::SuperAdmin->value ){
                continue;
            }

            $birthDate = $user->getBirthDate();
            if ( $birthDate ){
                $birthDate = $birthDate->format('Y-m-d');
            }
            $createdDate = $user->getCreatedDate();
            if ( $createdDate ){
                $createdDate = $createdDate->format('Y-m-d');
            }

            $badges = [];
            foreach ($user->getBadges() as $badge ) {
                $img = $this->imageManager->generateImageURL($badge->getImg());
                $badges[] = [
                    'id' => $badge->getId(),
                    'name' => $badge->getName(),
                    'img' => $img
                ];
            }

            $publisher = null;
            if( $user->getPublisher() ){
                $publisher = [
                    'value'  => $user->getPublisher()->getId(),
                    'label'  => $user->getPublisher()->getName(),
                ];
            }

            $data[] = [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'surname' => $user->getSurname(),
                'username' => $user->getUsername(),
                'mail' => $user->getMail(),
                'userType' => $user->getUserType(),
                'auth' => $user->isMailAuth(),
                'disabled' => $user->isDisable(),
                'img' => $this->imageManager->generateImageURL($user->getImage()),
                'birthDate' => $birthDate,
                'createdDate' => $createdDate,
                'badges' => $badges,
                'publisher' => $publisher
            ];
        }

        $meta = [
            'page'          => $page,
            'firstPage'     => $lastPage > 1 ? 1 : 0,
            'lastPage'      => $lastPage,
            'pagePerSize'   => $pagePerSize,
            'filteredCount' => $filteredCount, # uygun aramaya uyan, gösterilen-gösterilmeyen tüm sonuçların sayısı
            'viewCount'     => count($data), # Toplam gösterilen sonuç sayısıdır, pagePerSize 10 iken son sayfa için 3 sonuçta gösterilebilir gibi
            'sortBy'        => $sortBy,
            'orderBy'       => $orderBy,
        ];

        $response = [ 'meta' => $meta, 'data' => $data ];

        return new JsonResponse( ['status' => true, 'message' => 'Kullanıcı bilgileri getirildi', 'response' => $response], 200);
    }

    public function userAdminUpdate(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, []);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #UserAdminUpdate-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $requestBody = $request->request->all();
        $mode = isset( $requestBody['mode'] ) ? $requestBody['mode'] : null;

        if ( !$mode ){
            return new JsonResponse( ['status' => false, 'message' => 'Mod Gönderilmedi' , 'response' => null], 400);
        }

        $user = $this->entityManager->getRepository(User::class)->find($id);

        if ( ! $user ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen kullanıcı bulunamadı' , 'response' => null], 404);
        }

        $newValue = isset( $requestBody['newValue'] ) ? $requestBody['newValue'] : null;

        if ( ! $newValue ){ 
            if ( $mode === 'img' ) {
                $newValue = $request->files->get('newValue');
                if ( !$newValue ){
                    return new JsonResponse( ['status' => false, 'message' => 'Resim yüklenirken hata oluştu, muhtemelen resim doğru gönderilemedi!', 'response' => null], 400);
                }
            }
            else{
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için bilgi gönderilmedi' , 'response' => null], 400); 
            }
        }

        switch ( $mode ){
            case 'userType';
                if (!in_array($newValue, ['Üye', 'Standart Üye', 'Mod', 'Admin'])) {
                    return new JsonResponse(['status' => false, 'message' => 'Tanımsız Tip', 'response' => null], 401);
                }
                $user->setUserType($newValue);
                break;
            case 'disabled';
                $user->setDisable(!$user->isDisable());
                break;
            case 'badge';
                $newValue = json_decode($newValue);
                if (!is_array($newValue)) {
                    return new JsonResponse(['status' => false, 'message' => "Rozet id'leri array olmalı!", 'response' => null], 400);
                }
                foreach ($user->getBadges() as $badge) { $user->removeBadge($badge); }
                foreach ($newValue as $badgeID) {
                    $badge = $this->entityManager->getRepository(Badges::class)->find($badgeID);
                    if ( $badge ) {
                        $user->addBadge($badge);
                    }
                }
                break;
            case 'img':
                $oldImage = $user->getImage();
                if ( $oldImage ){
                    $deleteImg = $this->imageManager->deleteImage($oldImage);
                    if ( $deleteImg['status'] === true ){
                        $user->setImage(null);
                    }
                }
                if ( $newValue !== 'remove' ) {
                    $saveImageResult = $this->imageManager->saveImage($newValue);
                    if ( is_array($saveImageResult) ) {
                        return new JsonResponse(['status' => false, 'message' => $saveImageResult['errorMessage'], 'response' => null], 400);
                    }
                    $user->setImage($saveImageResult);
                }
                break;
            case 'publisher':

                if( $newValue === 'remove' ){
                    $user->setPublisher(null);
                }
                else{
                    $publisher = $this->entityManager->getRepository(Publisher::class)->find($newValue);;
                    if( ! $publisher ){
                        return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Yayınevi Yok' , 'response' => null], 404 );
                    }
                    $user->setPublisher($publisher);
                }
                break;
            default;
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için yanlış mod gönderildi' , 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $birthDate = $user->getBirthDate();
            if ( $birthDate ){
                $birthDate = $birthDate->format('Y-m-d');
            }
            $createdDate = $user->getCreatedDate();
            if ( $createdDate ){
                $createdDate = $createdDate->format('Y-m-d');
            }

            $badges = [];
            foreach ($user->getBadges() as $badge ) {
                $badgeImage = $this->imageManager->generateImageURL($badge->getImg());
                $badges[]   = [
                    'id' => $badge->getId(),
                    'name' => $badge->getName(),
                    'img' => $badgeImage
                ];
            }

            $response = [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'surname' => $user->getSurname(),
                'username' => $user->getUsername(),
                'mail' => $user->getMail(),
                'userType' => $user->getUserType(),
                'auth' => $user->isMailAuth(),
                'disabled' => $user->isDisable(),
                'img' => $this->imageManager->generateImageURL($user->getImage()),
                'birthDate' => $birthDate,
                'createdDate' => $createdDate,
                'badges' => $badges
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Kullanıcı Güncellendi', 'response' => $response ], 200);
        }
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
    } 

    public function deleteUserAdmin( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, []);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedUser = $this->entityManager->getRepository(User::class)->find($id);

        if ( ! $deletedUser ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı yazar bulunamadı", 'response' => null ], 404);
        }

        foreach($deletedUser->getComments() as $comment){
            foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $comment->getId(), 'type' => 'comment']) as $notice ){
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
            }
            $subComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'comment', 'parentID' => $comment->getId()]);

            foreach($subComments as $subComment){
                foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $subComment->getId(), 'type' => 'comment']) as $notice ){
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
                }
                $nestedComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'subComment', 'parentID' => $subComment->getId()]);
                foreach($nestedComments as $nestedComment){
                    foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $nestedComment->getId(), 'type' => 'comment']) as $notice ){
                        $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
                    }
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
            }    
            
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
        }

        foreach($deletedUser->getUserSubComments() as $subComment){
            $nestedComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'subComment', 'parentID' => $subComment->getId()]);
            foreach($nestedComments as $nestedComment){
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
            }
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
        }

        foreach ($this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $deletedUser]) as $notify) {
            new OrmActionHandler( $this->entityManager, $notify, 'remove');
        }

        foreach ($this->entityManager->getRepository(DKNotifiaction::class)->findBy(['senderUser' => $deletedUser]) as $notify) {
            new OrmActionHandler( $this->entityManager, $notify, 'remove');
        }

        foreach ($this->entityManager->getRepository(Blog::class)->findBy(['owner' => $deletedUser]) as $blog) {
            $blog->setOwner(null);
            new OrmActionHandler( $this->entityManager, $blog);
        }

        $this->imageManager->deleteImage($deletedUser->getImage());

        foreach( $this->entityManager->getRepository(Store::class)->findBy(['owner' => $deletedUser]) as $storeObject ){
            foreach( $storeObject->getPictures() as $pictureObject ){
                $this->imageManager->deleteImage($pictureObject->getImageName());
            }
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedUser, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $img = $deletedUser->getImage();
            if ( $img ){
                $this->imageManager->deleteImage($img);
            }
            return new JsonResponse( [ 'status' => true, 'message' => 'Kullanıcı Silindi', 'response' => [ 'deletedUser' => $deletedUser->getName(), 'id' => $id] ], 200);
        }
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CUser-remove-1', 'response' => null ], 400);
    }

    public function deleteMultipleUserAdmin( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, []);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload  = json_decode( $request->getContent() );
        $users  = isset( $payload->users ) ? $payload->users : [];

        if ( empty($users) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek Kullanıcının bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($users);

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet kullanıcı başarıyle silindi, silinemeyen kullanıcı sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    private function multipleAction( Array $users ){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $users as $user ){
            $item = $this->entityManager->getRepository(User::class)->find($user);
            if ( ! $item ) {
                $result['fail'] = $result['fail'] + 1;
                continue;
            }
            $id    = $item->getId();
            $value = $item->getName();
            $img   = $item->getImage();

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, 'remove');

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $result['successItems'][] = [ 'id' => $id, 'user' => $value ];
                if ( $img ){
                    $this->imageManager->deleteImage($img);
                }
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    public function getUserOptions() {
        
        $badgeObjects = $this->entityManager->getRepository(Badges::class)->findAll();
        $badges = [];

        foreach ( $badgeObjects as $badgeObject ) {
            $badges[] = [
                'id'   => $badgeObject->getId(),
                'name' => $badgeObject->getName(),
                'image'=> $this->imageManager->generateImageURL($badgeObject->getImg())
            ];
        }

        return new JsonResponse( [ 'status' => true, 'message' => 'Rozetler Getirildi', 'response' => $badges ], 200);
    }

    public function getTopUsers(){

        $qb = $this->entityManager->createQueryBuilder();
    
        $qb->select('user', 'COUNT(read.id) as readCount')
           ->from(User::class, 'user')
           ->leftJoin('user.readStatuses', 'read')
           ->groupBy('user.id')
           ->orderBy('readCount', 'DESC')
           ->setMaxResults(20);
    
        $userObjects = $qb->getQuery()->getResult();

        $users = [];

        foreach ($userObjects as $userObject) {
            $user = $userObject[0];
            $users[] = [
                'id'        => $user->getId(),
                'username'  => $user->getUsername(),
                'img'       => $this->imageManager->generateImageURL($user->getImage())
            ];
        }

        return new JsonResponse( ['status' => true, 'message' => null , 'response' => $users], 200);
    }

}