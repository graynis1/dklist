<?php

namespace App\Repository;

use App\Entity\UserReadStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserReadStatus>
 *
 * @method UserReadStatus|null find($id, $lockMode = null, $lockVersion = null)
 * @method UserReadStatus|null findOneBy(array $criteria, array $orderBy = null)
 * @method UserReadStatus[]    findAll()
 * @method UserReadStatus[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class UserReadStatusRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserReadStatus::class);
    }

//    /**
//     * @return UserReadStatus[] Returns an array of UserReadStatus objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('u')
//            ->andWhere('u.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('u.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?UserReadStatus
//    {
//        return $this->createQueryBuilder('u')
//            ->andWhere('u.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
