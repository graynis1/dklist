<?php

namespace App\Repository;

use App\Entity\Badges;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Badges>
 *
 * @method Badges|null find($id, $lockMode = null, $lockVersion = null)
 * @method Badges|null findOneBy(array $criteria, array $orderBy = null)
 * @method Badges[]    findAll()
 * @method Badges[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class BadgesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Badges::class);
    }

//    /**
//     * @return Badges[] Returns an array of Badges objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('b')
//            ->andWhere('b.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('b.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?Badges
//    {
//        return $this->createQueryBuilder('b')
//            ->andWhere('b.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
