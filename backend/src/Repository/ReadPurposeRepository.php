<?php

namespace App\Repository;

use App\Entity\ReadPurpose;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ReadPurpose>
 *
 * @method ReadPurpose|null find($id, $lockMode = null, $lockVersion = null)
 * @method ReadPurpose|null findOneBy(array $criteria, array $orderBy = null)
 * @method ReadPurpose[]    findAll()
 * @method ReadPurpose[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ReadPurposeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReadPurpose::class);
    }

//    /**
//     * @return ReadPurpose[] Returns an array of ReadPurpose objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('r')
//            ->andWhere('r.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('r.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?ReadPurpose
//    {
//        return $this->createQueryBuilder('r')
//            ->andWhere('r.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
