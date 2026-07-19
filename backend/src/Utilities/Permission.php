<?php

namespace App\Utilities;

use App\Entity\User;
use App\Enums\UserTypeEnum;
use Doctrine\ORM\EntityManagerInterface;


class Permission {

    public $error           = null;
    public $errorMessage    = null;
    public $errorCode       = null;
    public $permission      = false;
    private EntityManagerInterface $entityManager;
    private $token;
    private $accessUserTypes = [];
    private $userType;
    public User $user;

    public function __construct( $token, $entityManager, $accessUserTypes ) {
        $this->entityManager = $entityManager;
        $this->token = $token;
        $this->accessUserTypes = $accessUserTypes;
        $this->handlePermission();
    }

    private function handlePermission(){
        try {
            $this->checkTokenAndUserType();
            $this->checkPermission();
        }
        catch( \Exception $error ){
            $this->permission   = false;
            $this->errorMessage = $error->getMessage();
            $this->error        = true;
            $this->errorCode    = $error->getCode();
        }
    }

    private function checkTokenAndUserType(){

        if ( in_array( UserTypeEnum::All, $this->accessUserTypes ) ){
            $this->userType = \App\Enums\UserTypeEnum::All;
        }
        else{
            if ( is_null( $this->token ) ) {
                throw new \Exception( 'Token Gönderilmedi', 3);
            }

            $user = $this->entityManager->getRepository( User::class )->findOneBy( [ 'token' => str_replace('Bearer ', '', $this->token) ] );

            if ( ! $user ) {
                throw new \Exception( 'Tanımsız Kullanıcı', 1);
            }

            $this->user = $user;

            $userType = $user->getUserType();
            if ( $userType === 'SuperAdmin' )
                $this->userType = \App\Enums\UserTypeEnum::SuperAdmin;
            elseif ( $userType === 'Admin' )
                $this->userType = \App\Enums\UserTypeEnum::Admin;
            else if ( $userType === 'Mod' )
                $this->userType = \App\Enums\UserTypeEnum::Mod;
            else if ( $userType === 'Blog_Yazari' )
                $this->userType = \App\Enums\UserTypeEnum::Blogger;
            else if ( $userType === 'Üye' )
                $this->userType = \App\Enums\UserTypeEnum::Member;
            else
                throw new \Exception('Üyelik Tipi Tanımlanamadı', 2);
        }

    }

    private function checkPermission(){
        if ( !($this->userType === UserTypeEnum::SuperAdmin || in_array($this->userType, $this->accessUserTypes)) ){
            throw new \Exception('Bu işlem için yetkiniz yetersiz!', 4);
        }
    }
}