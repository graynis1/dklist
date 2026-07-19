<?php

namespace App\Controller;

use App\Entity\Book;
use App\Entity\Store;
use App\Entity\StorePicture;
use App\Utilities\DirtyController;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\String\Slugger\AsciiSlugger;

class StoreController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private AsciiSlugger $slugger;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;
        $this->slugger = new AsciiSlugger();
    }

    public function add(Request $request){

        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $requestBody = $request->request->all();

        $title       = isset( $requestBody['title'] )   ? $requestBody['title']   : null;
        $content     = isset( $requestBody['content'] ) ? $requestBody['content'] : null;

        foreach([$title, $content] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }
        
        $state       = isset( $requestBody['state'] )    ? $requestBody['state']    : null;
        $stock       = isset( $requestBody['stock'] )    ? $requestBody['stock']    : null;
        $bookID      = isset( $requestBody['bookID'] )   ? $requestBody['bookID']   : null;
        $shipment    = isset( $requestBody['shipment'] ) ? $requestBody['shipment'] : null;
        $location    = isset( $requestBody['location'] ) ? $requestBody['location'] : null;
        $price       = isset( $requestBody['price'] )    ? $requestBody['price']    : null;
        $pictures    = $request->files->get('pictures');

        if ( !$title || !$content || count($pictures) === 0) {
            return new JsonResponse( ['status' => false, 'message' => 'ürün başlığı ve içeriği gönderilmelidir..!', 'response' => null], 401);
        }

        $book = null;
        if ($bookID) {
            $book = $this->entityManager->getRepository(Book::class)->find($bookID);            
        }
        
        if( $price ){
            if(gettype(json_decode($price)) !== 'double' && $price <= 0){
                return new JsonResponse( ['status' => false, 'message' => 'Fiyat pozitif bir sayı olmalıdır', 'response' => null], 401);
            }
        }

        $newStore = new Store();

        $newStore->setTitle($title) ;
        $newStore->setContent($content) ;
        $newStore->setState($state) ;
        $newStore->setStock($stock) ;
        $newStore->setOwner($user) ;
        $newStore->setBook($book);
        $newStore->setShipment($shipment);
        $newStore->setSlug($this->slugger->slug($user->getUsername().'/'.$title));
        $newStore->setPrice($price);
        $newStore->setLocation($location);
        $newStore->setCreatedDate(new \DateTime());
        $newStore->setIsActive(true);
        $newStore->setStatus('active');

        $this->entityManager->persist($newStore);
        $this->entityManager->flush();

        foreach ($pictures as $picture) {

            $storePicture = new StorePicture();
            $storePicture->setImageName($this->imageManager->saveImage($picture));
            $storePicture->setAdvert($newStore);
            $this->entityManager->persist($storePicture);
            $this->entityManager->flush();
            
            $newStore->addPicture($storePicture);
            
            $this->entityManager->persist($newStore);
            $this->entityManager->flush();
        }

        $response[] = [
            'id'       => $newStore->getId(),
            'title'    => $newStore->getTitle(),
            'content'  => $newStore->getContent(),
            'slug'     => $newStore->getSlug(),
            'stock'    => $newStore->getStock(),
            'state'    => $newStore->getState(),
            'shipment' => $newStore->getShipment(),
            'owner'   => [
                'id'        => $newStore->getOwner()->getId(),
                'username'  => $newStore->getOwner()->getUsername(),
                'image'     => $newStore->getOwner()->getImage(),
            ],
            'book'    => !$book ? null : [
                'id'    => $book->getId(),
                'name'  => $book->getName(),
                'slug'  =>$book->getslug(),
                'image' => $this->imageManager->generateImageURL($book->getImage())
            ]

        ];
        return new JsonResponse( [ 'status' => true, 'message' => 'Askıda Kitap İlanı Kaydedildi', 'response' => $response ], 200);
    }

    public function get( Request $request, string $slug ) {

        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $store = $this->entityManager->getRepository(Store::class)->findOneBy(['slug' => $slug]);

        if ( !$store ) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir İlan Yok', 'response' => null], 404);
        }

        $pictures = [];

        foreach ($store->getPictures() as $pic ) {
            $pictures[] = $this->imageManager->generateImageURL($pic->getImageName());
        }

        $book = $store->getBook();

        $response = [
            'id'       => $store->getId(),
            'title'    => $store->getTitle(),
            'content'  => $store->getContent(),
            'slug'     => $store->getSlug(),
            'stock'    => $store->getStock(),
            'state'    => $store->getState(),
            'shipment' => $store->getShipment(),
            'location' => $store->getLocation(),
            'price'    => $store->getPrice(),
            'pictures' => $pictures,
            'self'     => !$user ? false : $user->getId() === $store->getOwner()->getId(),
            'owner'    => [
                'id'        => $store->getOwner()->getId(),
                'username'  => $store->getOwner()->getUsername(),
                'image'     => $store->getOwner()->getImage(),
            ],
            'book'   => !$book ? null : [
                'id'    => $book->getId(),
                'name'  => $book->getName(),
                'slug'  => $book->getslug(),
                'image' => $this->imageManager->generateImageURL($book->getImage())
            ]
        ];

        return new JsonResponse( [ 'status' => true, 'message' => 'Askıda Kitap İlanı Getirildi', 'response' => $response ], 200);
    }

    public function getAllStore(Request $request){

        try {
            // DEBUG 1: Başlangıç
            error_log("DEBUG 1: Başlangıç");
            
            // DEBUG 2: Repository çağrısı
            error_log("DEBUG 2: Repository çağrısı");
            $repo = $this->entityManager->getRepository(Store::class);
            
            // DEBUG 3: QueryBuilder
            error_log("DEBUG 3: QueryBuilder");
            $qb = $repo->createQueryBuilder('s');
            
            // DEBUG 4: Select
            error_log("DEBUG 4: Select");
            $qb->select('s.id, s.title');
            
            // DEBUG 5: Where
            error_log("DEBUG 5: Where");
            $qb->where('s.isActive = :active');
            
            // DEBUG 6: Parameter
            error_log("DEBUG 6: Parameter");
            $qb->setParameter('active', true);
            
            // DEBUG 7: Limit
            error_log("DEBUG 7: Limit");
            $qb->setMaxResults(5);
            
            // DEBUG 8: Query
            error_log("DEBUG 8: Query");
            $query = $qb->getQuery();
            
            // DEBUG 9: Execute
            error_log("DEBUG 9: Execute");
            $stores = $query->getArrayResult();
            
            // DEBUG 10: Response
            error_log("DEBUG 10: Response - Count: " . count($stores));
    
            $response = [
                'meta' => ['page' => 1], 
                'store' => []
            ];
            
            return new JsonResponse(['status' => true, 'message' => 'DEBUG OK - ' . count($stores) . ' store', 'response' => $response], 200);
            
        } catch (\Exception $e) {
            error_log("HATA: " . $e->getMessage() . " - Line: " . $e->getLine());
            return new JsonResponse(['status' => false, 'message' => 'HATA: ' . $e->getMessage() . ' - Line: ' . $e->getLine(), 'response' => null], 500);
        }
    }

    public function delete(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir Kullanıcı Yok', 'response' => null], 404);
        }

        $store = $this->entityManager->getRepository(Store::class)->find($id);

        if (!$store) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle Bir İlan Yok', 'response' => null], 404);
        }

        if ($store->getOwner()->getId() !== $user->getId()) {
            return new JsonResponse( ['status' => false, 'message' => 'Yetkisiz İstek', 'response' => null], 401);
        }

        $pics = [];

        foreach( $this->entityManager->getRepository(StorePicture::class)->findBy(['advert' => $store]) as $pictureObject ){
            $pics[] = $pictureObject->getImageName();
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $store, 'remove');
        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            foreach( $pics as $pic ){
                $this->imageManager->deleteImage($pic);
            }
            return new JsonResponse( [ 'status' => true, 'message' => 'Kitap Silindi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-delete-2', 'response' => null ], 400);
        }
    }

}
