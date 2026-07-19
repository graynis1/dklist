<?php

namespace App\Utilities;


use App\Entity\DKNotifiaction;
use App\Entity\User;
use App\Utilities\OrmActionHandler;
use Doctrine\ORM\EntityManagerInterface;

class NotifyManager {
    
    private EntityManagerInterface $entityManager;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;
    }

    public function addNotification(User $ownerUser, User $sender, $messageTR, $messageUS){

        if( $ownerUser->getId() === $sender->getId() ){
            return [ 'status' => false, 'message'=> 'İki kullanıcıda aynı' ];
        }

        foreach( $this->entityManager->getRepository(DKNotifiaction::class)->findBy(['ownerUser' => $ownerUser, 'senderUser' => $sender ]) as $notify ){
            if( $messageTR === $notify->getCommentTR() ){
                return [ 'status' => false, 'message'=> 'Benzer bildirim eklenmeye çalışılınıyor' ];
            }
        }

        $newNotification = new DKNotifiaction();
        $newNotification->setOwnerUser($ownerUser);
        $newNotification->setSenderUser($sender);
        $newNotification->setCommentTR($messageTR);
        $newNotification->setCommentUS($messageUS);
        $newNotification->setView(false);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newNotification);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return [ 'status' => true, 'message'=> 'mevzu tamam' ];
        }

        return [ 'status' => false, 'message'=> 'orm hatası aldık : '.$ormActionHandler->errorMessage ];
    }
}
