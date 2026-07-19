<?php

namespace App\Controller;

use App\Entity\DKNotifiaction;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class NotificationController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
    }

    public function delete(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if(!$user){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $notificationObject = $this->entityManager->getRepository(DKNotifiaction::class)->find($id);

        if(!$notificationObject || $notificationObject->getOwnerUser()->getId() !== $user->getId()){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir bildirim yok veya yanlış eşleşme var', 'response' => null], 400);
        }


        $ormActionHandler = new OrmActionHandler( $this->entityManager, $notificationObject, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Bildirim Silindi', 'response' => null], 200);
        }
         
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #NotificationController-delete', 'response' => null ], 404);
    }

    public function setViewAllNotify(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if(!$user){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        foreach( $this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $user, 'view' => false]) as $notify ){
            $notify->setView(true);
            new OrmActionHandler( $this->entityManager, $notify );
        }

        return new JsonResponse( [ 'status' => true, 'message' => 'Tüm Bildirimlerin Görüntülenmesi Ayarlandı', 'response' => null], 200);
    }

    public function getViewCountNotify(Request $request){
        
        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if(!$user){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $count = count($this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $user, 'view' => false]));
       
        return new JsonResponse( [ 'status' => true, 'message' => 'Bildirim sayacı bilgisi getirildi', 'response' => $count], 200);
    }

    public function getNotifications(Request $request){

        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if(!$user){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $notifications = [];

        foreach($this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $user]) as $notify){

            $otherUser = $notify->getSenderUser();

            $notifications[] = [
                'id' => $notify->getId(),
                'contentTR' => $notify->getCommentTR(),
                'contentUS' => $notify->getCommentUS(),
                'view'      => $notify->isView(),
                'otherUser' => [
                    'id'        => $otherUser->getId(),
                    'username'  => $otherUser->getUsername(),
                    'image'     => $this->imageManager->generateImageURL($otherUser->getImage()),
                ]
            ];
        }

        return new JsonResponse( ['status' => true, 'message' => 'Bildirimler getirildi', 'response' => array_reverse($notifications)], 200);
    }

    public function deleteAll(Request $request){
        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if(!$user){
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $notificationObjects = $this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $user]);

        foreach($notificationObjects as $notifyObject){
            new OrmActionHandler( $this->entityManager, $notifyObject, 'remove');
        }

        return new JsonResponse( ['status' => true, 'message' => 'Bildirimler silindi', 'response' => null], 200);
    }
}
