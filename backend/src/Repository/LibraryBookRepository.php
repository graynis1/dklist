<?php

namespace App\Repository;

use App\Entity\LibraryBook;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<LibraryBook>
 *
 * @method LibraryBook|null find($id, $lockMode = null, $lockVersion = null)
 * @method LibraryBook|null findOneBy(array $criteria, array $orderBy = null)
 * @method LibraryBook[]    findAll()
 * @method LibraryBook[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class LibraryBookRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LibraryBook::class);
    }

//    /**
//     * @return LibraryBook[] Returns an array of LibraryBook objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('l')
//            ->andWhere('l.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('l.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?LibraryBook
//    {
//        return $this->createQueryBuilder('l')
//            ->andWhere('l.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
