<?php

namespace App\Controller;

use App\Entity\Chat;
use App\Entity\Comment;
use App\Entity\Message;
use App\Entity\User;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class MessageController extends AbstractController{


    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
    }

    public function sendMessage(Request $request){
        
        $bearer = $request->headers->get('Authorization');
        $sender = (new SelfRequest($this->entityManager))->control($bearer);
        
        if (!$sender) {
            return new JsonResponse(['status' => false, 'message' => 'Böyle bir gönderici kullanıcı yok', 'response' => null], 404);
        }
    
        $payload = json_decode($request->getContent());
        $receiverID = isset($payload->receiverID) ? $payload->receiverID : null;
        $message = isset($payload->message) ? $payload->message : null;
    
        if (!$receiverID || !$message) {
            return new JsonResponse(['status' => false, 'message' => 'Alıcı bilgisi veya mesaj eksik gönderilmiş', 'response' => null], 400);
        }
    
        $receiver = $this->entityManager->getRepository(User::class)->find($receiverID);
        
        if (!$receiver) {
            return new JsonResponse(['status' => false, 'message' => 'Böyle bir alıcı kullanıcı yok', 'response' => null], 404);
        }
    
        $current = 'first';
        $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy(['firstUser' => $sender, 'secondUser' => $receiver]);
    
        if (!$chatObject) {
            $current = 'second';
            $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy(['firstUser' => $receiver, 'secondUser' => $sender]);
        }
    
        if (!$chatObject) {
            $current = 'first';
            $chatObject = new Chat();
            $chatObject->setFirstUser($sender);
            $chatObject->setSecondUser($receiver);
            $this->entityManager->persist($chatObject);
        }
    
        $messageObject = new Message();
        $messageObject->setSender($sender->getId());
        $messageObject->setReceiver($receiver->getId());
        $messageObject->setView($current === 'first');
        $messageObject->setView2($current === 'second');
        $messageObject->setMessage($message);
        $messageObject->setChat($chatObject);
        
        $this->entityManager->persist($messageObject);
        $this->entityManager->flush();
        
        $response= [
            'id'     => $messageObject->getId(),
            'sender' => [
                'id'        => $sender->getId(),
                'username'  => $sender->getUsername(),
                'image'     => $this->imageManager->generateImageURL($sender->getImage())
            ],
            'receiver' => [
                'id'        => $receiver->getId(),
                'username'  => $receiver->getUsername(),
                'image'     => $this->imageManager->generateImageURL($receiver->getImage())
            ],
            'message' => $messageObject->getMessage()
        ];
    
        return new JsonResponse(['status' => true, 'message' => 'Mesaj Başarıyla Eklendi', 'response' => $response], 200);
    }

    public function deleteMessage(Request $request, int $id){
        
        $bearer = $request->headers->get('Authorization');
        $currentUser = (new SelfRequest($this->entityManager))->control($bearer);
        
        if (!$currentUser) {
            return new JsonResponse(['status' => false, 'message' => 'Böyle bir gönderici kullanıcı yok', 'response' => null], 404);
        }
       
        $message = $this->entityManager->getRepository(Message::class)->find($id);
        
        if( !$message){
            return new JsonResponse(['status' => false, 'message' => 'Böyle Bir Mesaj Yok', 'response' => null], 404);
        }

        $sender = $this->entityManager->getRepository(User::class)->find( $message->getSender() );

        if( !$sender ){
            return new JsonResponse(['status' => false, 'message' => 'Mesajın sahibi bulunamadı', 'response' => null], 404);
        }

        if( $sender->getId() !== $currentUser->getId() ){
            return new JsonResponse(['status' => false, 'message' => 'Sadece Kendi Mesajını Silebilirsin', 'response' => null], 404);
        }
        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $message, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Mesaj veritabanından Silindi', 'response' => null ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => 'Mesaj silinirken bir hata oluştu : '.$ormActionHandler->errorMessage, 'response' => null ], 400);
    }

    public function deleteChat(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $otherUser = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user || !$otherUser) {
            return new JsonResponse(['status' => false, 'message' => 'Kullanıcıların birini veya ikisini bulamadım', 'response' => null], 404);
        }

        $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy([ 'firstUser' => $user, 'secondUser' => $otherUser ]);
    
        if (!$chatObject) {
            $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy([ 'firstUser' => $otherUser, 'secondUser' => $user ]);
        }

        if( !$chatObject ){
            return new JsonResponse(['status' => false, 'message' => 'chat objesini bulamadım', 'response' => null], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $chatObject, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Chat veritabanından Silindi', 'response' => null ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => 'Chat silinirken bir hata oluştu : '.$ormActionHandler->errorMessage, 'response' => null ], 400);
    }

    public function getUnviewedMessageCount(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if ( !$user ) {
            return new JsonResponse(['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

        $counter = 0;

        foreach($this->entityManager->getRepository(Chat::class)->findBy([ 'firstUser' => $user ]) as $chatObject){
            foreach( $chatObject->getChatMessages() as $messageObject ){
                if(!$messageObject->isView()){
                    $counter += 1;
                }
            }
        }

        foreach($this->entityManager->getRepository(Chat::class)->findBy([ 'secondUser' => $user ]) as $chatObject){
            foreach( $chatObject->getChatMessages() as $messageObject ){
                if(!$messageObject->isView2()){
                    $counter += 1;
                }
            }
        }

        return new JsonResponse( [ 'status' => true, 'message' => 'Okunmayan Mesaj Sayısı Getirildi', 'response' => $counter ], 200);
    }

    public function getMessages(Request $request, int $id){
        
        $bearer = $request->headers->get('Authorization');
        $currentUser = (new SelfRequest($this->entityManager))->control($bearer);
        
        if( ! $currentUser ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Böyle bir gönderici kullanıcı yok', 'response' => null ], 404);
        }
        
        $selectedUser = $id;

        $users = [];
        $messages = [];

        $chatObjects = $this->entityManager->getRepository(Chat::class)->createQueryBuilder('c')
            ->where('c.firstUser = :userId OR c.secondUser = :userId')
            ->setParameter('userId', $currentUser->getId())
            ->getQuery()
            ->getResult();

        foreach( $chatObjects as $chatObject ){
            if($chatObject->getFirstUser()->getId() === $currentUser->getId()){
                $user = $chatObject->getSecondUser();
            }
            else{
                $user = $chatObject->getFirstUser();
            }
            $users[] = [
                'id' => $user->getId(),
                'name' => $user->getUsername(),
                'image' => $this->imageManager->generateImageURL($user->getImage())
            ];
        }

        if( count($users)>0 ){

            if(!$selectedUser){
                $selectedUser = $users[0]['id'];
            }

            $targetUser = $this->entityManager->getRepository(User::class)->find($selectedUser);

            if (!$targetUser) {
                return new JsonResponse( [ 'status' => false, 'message' => 'Seçilen kullanıcı yok', 'response' => null ], 404);
            }


            $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy(['firstUser' => $targetUser, 'secondUser' => $currentUser]);
            if(!$chatObject){
                $chatObject = $this->entityManager->getRepository(Chat::class)->findOneBy(['secondUser' => $targetUser, 'firstUser' => $currentUser]);
            }

            if(!$chatObject){
                return new JsonResponse( [ 'status' => false, 'message' => 'Bir hata oluştu, chat objesi bulunamadı', 'response' => null ], 404);
            }

            foreach( $chatObject->getChatMessages() as $messageObject ){

                $sender   = intval($messageObject->getSender())   === $currentUser->getId() ? $currentUser : $targetUser;
                $receiver = intval($messageObject->getReceiver()) === $currentUser->getId() ? $currentUser : $targetUser;
                
                $messages[] = [
                    'id'     => $messageObject->getId(),
                    'sender' => [
                        'id'        => $sender->getId(),
                        'username'  => $sender->getUsername(),
                        'image'     => $this->imageManager->generateImageURL($sender->getImage())
                    ],
                    'receiver' => [
                        'id'        => $receiver->getId(),
                        'username'  => $receiver->getUsername(),
                        'image'     => $this->imageManager->generateImageURL($receiver->getImage())
                    ],
                    'message' => $messageObject->getMessage()
                ];
                
                if ($chatObject->getFirstUser()->getId() === $currentUser->getId()) {
                    $messageObject->setView(true);
                }
                else{
                    $messageObject->setView2(true);
                }
                
                $this->entityManager->persist($messageObject);
                $this->entityManager->flush();

            }
        }

        $response = [
            'users' => $users,
            'messages' => array_reverse($messages),
        ];

        return new JsonResponse(['status' => true, 'message' => 'Mesajlar Getirildi', 'response' => $response], 200);
    }

}