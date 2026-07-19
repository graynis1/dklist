<?php

namespace App\Utilities;

use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\NotNullConstraintViolationException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\NoResultException;
use Doctrine\ORM\OptimisticLockException;
use Doctrine\ORM\TransactionRequiredException;

class OrmActionHandler
{
    private EntityManagerInterface $entityManager;
    private mixed $item;
    private string $operation;
    public $errorMessage = null;
    public $status       = false;
    public $error        = null;

    public function __construct(EntityManagerInterface $entityManager, mixed $item, $operation = 'add') {
        $this->entityManager = $entityManager;
        $this->item          = $item;
        $this->operation     = $operation;
        $this->do();
    }

    private function do(){
        try {
            if ( $this->operation === 'add' ){
                $this->entityManager->persist($this->item);
            }
            else if( $this->operation === 'remove' ){
                $this->entityManager->remove($this->item);
            }
            $this->entityManager->flush();
            $this->status = true;
        }
        catch ( UniqueConstraintViolationException | NotNullConstraintViolationException | OptimisticLockException |
                TransactionRequiredException | ORMException | ForeignKeyConstraintViolationException | NoResultException $e ) {
            $this->error        = true;
            $this->errorMessage = $e->getMessage().' #OAH-01';
        }
    }


}