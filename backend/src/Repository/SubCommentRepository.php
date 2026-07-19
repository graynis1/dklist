<?php

namespace App\Repository;

use App\Entity\SubComment;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SubComment>
 *
 * @method SubComment|null find($id, $lockMode = null, $lockVersion = null)
 * @method SubComment|null findOneBy(array $criteria, array $orderBy = null)
 * @method SubComment[]    findAll()
 * @method SubComment[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class SubCommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SubComment::class);
    }

//    /**
//     * @return SubComment[] Returns an array of SubComment objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('s')
//            ->andWhere('s.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('s.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?SubComment
//    {
//        return $this->createQueryBuilder('s')
//            ->andWhere('s.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
