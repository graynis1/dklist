<?php

namespace App\Repository;

use App\Entity\DKNotifiaction;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DKNotifiaction>
 *
 * @method DKNotifiaction|null find($id, $lockMode = null, $lockVersion = null)
 * @method DKNotifiaction|null findOneBy(array $criteria, array $orderBy = null)
 * @method DKNotifiaction[]    findAll()
 * @method DKNotifiaction[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class DKNotifiactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DKNotifiaction::class);
    }

//    /**
//     * @return DKNotifiaction[] Returns an array of DKNotifiaction objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('d')
//            ->andWhere('d.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('d.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?DKNotifiaction
//    {
//        return $this->createQueryBuilder('d')
//            ->andWhere('d.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
