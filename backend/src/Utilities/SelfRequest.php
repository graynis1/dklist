<?php

namespace App\Utilities;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class SelfRequest {

    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager) {
        $this->entityManager = $entityManager;
    }

    /**
     * Bu Metot gelen token'a bakar. Token var ise sahibini bulur ve bu kullanıcıyı döndürür
     * @param string bearerToken
     * @return User
     */
    public function control($bearerToken){

        if(!$bearerToken){
            return null;
        }
        
        $token = str_replace('Bearer ', '', $bearerToken);

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['token' => $token]);

        return $user;
    }
}