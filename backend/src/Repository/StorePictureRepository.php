<?php

namespace App\Repository;

use App\Entity\StorePicture;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StorePicture>
 *
 * @method StorePicture|null find($id, $lockMode = null, $lockVersion = null)
 * @method StorePicture|null findOneBy(array $criteria, array $orderBy = null)
 * @method StorePicture[]    findAll()
 * @method StorePicture[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class StorePictureRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StorePicture::class);
    }

//    /**
//     * @return StorePicture[] Returns an array of StorePicture objects
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

//    public function findOneBySomeField($value): ?StorePicture
//    {
//        return $this->createQueryBuilder('s')
//            ->andWhere('s.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
