<?php

namespace App\Controller;

use App\Entity\Store;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class TestStoreController extends AbstractController
{
    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    public function getAllStore(Request $request)
    {
        try {
            // ADIM 1: Parametreleri al
            $page = $request->query->get('page') ? (int)$request->query->get('page') : 1;
            $pagePerSize = $request->query->get('pagePerSize') ? (int)$request->query->get('pagePerSize') : 40;
            $search = $request->query->get('search') ?: '';

            if ($page < 1) $page = 1;
            if ($pagePerSize < 1 || $pagePerSize > 100) $pagePerSize = 40;

            // ADIM 2: QueryBuilder oluştur
            $qb = $this->entityManager->createQueryBuilder();
            
            // ADIM 3: Basit query ile test et
            try {
                $testCount = $this->entityManager->createQueryBuilder()
                    ->select('COUNT(s.id)')
                    ->from(Store::class, 's')
                    ->getQuery()
                    ->getSingleScalarResult();
                    
                // Eğer buraya kadar geldiyse, EntityManager çalışıyor
                
            } catch (\Exception $countError) {
                return new JsonResponse([
                    'status' => false, 
                    'message' => 'COUNT sorgusu hatası: ' . $countError->getMessage(), 
                    'response' => null
                ], 500);
            }

            // ADIM 4: Ana query'yi çalıştır
            try {
                $qb->select('s.id, s.title, s.content, s.slug, s.price, s.location, s.stock, s.state, sp.imageName as image')
                   ->from(Store::class, 's')
                   ->leftJoin('s.pictures', 'sp')
                   ->orderBy('s.id', 'DESC')
                   ->setMaxResults($pagePerSize)
                   ->setFirstResult(($page - 1) * $pagePerSize);

                if ($search) {
                    $qb->andWhere('s.title LIKE :search OR s.content LIKE :search')
                       ->setParameter('search', '%' . $search . '%');
                }

                $stores = $qb->getQuery()->getArrayResult();
                
            } catch (\Exception $queryError) {
                return new JsonResponse([
                    'status' => false, 
                    'message' => 'Ana query hatası: ' . $queryError->getMessage(), 
                    'response' => null
                ], 500);
            }

            // ADIM 5: Veri işleme
            $data = [];
            foreach ($stores as $store) {
                $data[] = [
                    'id' => $store['id'],
                    'title' => $store['title'] ?: 'Başlık Yok',
                    'content' => $store['content'] ?: 'İçerik Yok',
                    'slug' => $store['slug'] ?: 'slug-' . $store['id'],
                    'price' => $store['price'] ?: 0,
                    'location' => $store['location'] ?: 'Konum Belirtilmemiş',
                    'stock' => $store['stock'] ?: 1,
                    'state' => $store['state'] ?: 'İyi Durumda',
                    'image' => $store['image'] ? '/uploads/store/' . $store['image'] : null,
                    'owner' => [
                        'id' => 1,
                        'username' => 'Kullanıcı',
                        'image' => null
                    ],
                    'book' => null
                ];
            }

            // Eğer database'de store yoksa, demo data göster
            if (empty($data)) {
                $data = [
                    [
                        'id' => 1,
                        'title' => 'Demo: Suç ve Ceza',
                        'content' => 'Dostoyevski\'nin ünlü romanı, temiz durumda.',
                        'slug' => 'demo-suc-ve-ceza',
                        'price' => 25,
                        'location' => 'İstanbul',
                        'stock' => 1,
                        'state' => 'İyi Durumda',
                        'image' => null,
                        'owner' => [
                            'id' => 1,
                            'username' => 'KitapSever',
                            'image' => null
                        ],
                        'book' => [
                            'id' => 1,
                            'name' => 'Suç ve Ceza',
                            'slug' => 'suc-ve-ceza',
                            'image' => null
                        ]
                    ]
                ];
            }

            // ADIM 6: Total count
            $totalCount = $testCount; // Zaten yukarıda hesapladık

            $lastPage = $totalCount > 0 ? ceil($totalCount / $pagePerSize) : 1;

            $response = [
                'meta' => [
                    'page' => $page,
                    'firstPage' => 1,
                    'lastPage' => $lastPage,
                    'pagePerSize' => $pagePerSize,
                    'filteredCount' => $totalCount,
                    'viewCount' => count($data),
                    'sortBy' => 'id',
                    'orderBy' => 'DESC'
                ], 
                'store' => $data
            ];
            
            $message = $totalCount > 0 ? 
                "Askıda kitaplar getirildi ($totalCount gerçek store)" : 
                "Demo veriler gösteriliyor (database boş)";
            
            return new JsonResponse([
                'status' => true, 
                'message' => $message, 
                'response' => $response
            ], 200);
            
        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => false, 
                'message' => 'GENEL HATA: ' . $e->getMessage() . ' - Dosya: ' . $e->getFile() . ' - Satır: ' . $e->getLine(), 
                'response' => null
            ], 500);
        }
    }
} 