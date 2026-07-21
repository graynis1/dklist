<?php

namespace App\Controller;

use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\Publisher;
use App\Entity\Store;
use App\Entity\SubComment;
use App\Enums\CommentParentEnum;
use App\Enums\CommentTypeEnum;
use App\Utilities\OrmActionHandler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Enums\UserTypeEnum;
use App\Utilities\DirtyController;
use App\Utilities\Permission;
use Symfony\Component\String\Slugger\AsciiSlugger;

class PublisherController extends AbstractController
{

    private EntityManagerInterface $entityManager;
    private AsciiSlugger $slugger;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;        
        $this->slugger = new AsciiSlugger();
    }

    /**
     * Yayın Evi ekleyen method, raw json olarak ' publisherName ' adında bir değişken ister.
     * @param Request $request
     * @return JsonResponse
     */
    public function add(Request $request){

        $payload = json_decode( $request->getContent() );
        $publisherName  = isset( $payload->publisherName ) ? $payload->publisherName : null;
        if ( is_null($publisherName) ){
            return new JsonResponse( ['status' => false, 'message' => 'Yayın Evi Bilgisi Eksik', 'response' => null], 400);
        }

        if( (new DirtyController())->control($publisherName)){
            return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #PC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( $this->entityManager->getRepository( Publisher::class )->findOneBy( [ 'name' => $publisherName] )){
            return new JsonResponse( ['status' => false, 'message' => "$publisherName isimli yayınevi zaten var !", 'response' => null], 400);
        }

        $newPublisher = new Publisher();
        $newPublisher->setName($publisherName);
        $newPublisher->setSlug($this->slugger->slug($publisherName));

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newPublisher );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evi Eklendi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #PC-add-2', 'response' => null ], 400);
        }
    }

    public function addMultiple(Request $request){
        $payload    = json_decode( $request->getContent() );
        $publishers = isset( $payload->publishers ) ? $payload->publishers : [];

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( empty($publishers) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Yayınevi bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($publishers);

        $fail       = $doAction['fail'];
        $addedItems = $doAction['successItems'];
        $success = count($addedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet yayınevi başarıyle eklendi, eklenemeyen yayınevi sayısı : $fail", 'response' => $addedItems ], 200);
    }

    public function getAll(Request $request){

        $page           = json_decode( $request->query->get( 'page' ) );
        $pagePerSize    = json_decode( $request->query->get( 'pagePerSize' ) );
        $search         = $request->query->get( 'search' );
        $orderBy        = $request->query->get( 'orderBy' );
        $sortBy         = $request->query->get( 'sortBy' );
        $getAll         = $request->query->get( 'getAll' );

        if ( empty( $orderBy ) )
            $orderBy = 'ASC';
        if ( empty( $page ) || $page < 0 )
            $page = 1;
        if ( empty( $pagePerSize ) || $pagePerSize < 0 || $pagePerSize > 100 )
            $pagePerSize = 40;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'name'; // TODO değişiklik3

        $qb = $this->entityManager->createQueryBuilder();
        $qb ->select('publishers') ->from('App\Entity\Publisher', 'publishers')
            ->orderBy('publishers.'.$sortBy, $orderBy);

        if ($search !== '') {
            $qb->where( $qb->expr()->like('LOWER(publishers.name)', ':searchTermLower') )
                ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT publishers.id)')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( !$getAll && $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }

        $publiserObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $publiserObjects as $publiserObject ){

            $data[] = [
                'id'        => $publiserObject->getId(),
                'name'      => $publiserObject->getName(),
                'slug'      => $publiserObject->getSlug()
            ];
        }

        $meta = [
            'page'          => $page,
            'firstPage'     => $lastPage > 1 ? 1 : 0,
            'lastPage'      => $lastPage,
            'pagePerSize'   => $pagePerSize,
            'filteredCount' => $filteredCount, # uygun aramaya uyan, gösterilen-gösterilmeyen tüm sonuçların sayısı
            'viewCount'     => count($data),   # Toplam gösterilen sonuç sayısıdır, pagePerSize 10 iken son sayfa için 3 sonuçta gösterilebilir gibi
            'sortBy'        => $sortBy,
            'orderBy'       => $orderBy,
        ];

        $response = [ 'meta' => $meta, 'data' => $data ];

        return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evleri Getirildi', 'response' => $response ], 200);
    }

    public function get( int $id, Request $request ){

        $publiserObject = $this->entityManager->getRepository(Publisher::class)->find($id);
        if ( ! $publiserObject ){
            return new JsonResponse( ['status' => false, 'message' => "$id id'li yayın evi bulunamadı", 'response' => null], 404);
        }

        $books = [];

        foreach ( $publiserObject->getBooks() as $book ){
            $books[] = [
                'id'        => $book->getId(),
                'name'      => $book->getName(),
                'lang'      => $book->getLang(),
                'content'   => $book->getContent(),
                'image'     => $book->getImage()
            ];
        }

        $data[] = [
            'id'    => $publiserObject->getId(),
            'name'  => $publiserObject->getName(),
            'books' => $books
        ];

        return new JsonResponse( ['status' => true, 'message' => "$id id'li yayın evi bilgileri getirildi", 'response' => $data ], 200);
    }

    public function delete( int $id, Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #PC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $publisher = $this->entityManager->getRepository(Publisher::class)->find($id);

        if ( ! $publisher ){
            return new JsonResponse( ['status' => false, 'message' =>"$id id'li kayıt evi bulunamadı", 'response' => null], 404);
        }

        foreach($publisher->getBooks() as $book){
            $stores = $this->entityManager->getRepository(Store::class)->findBy(['book' => $book]); 

            foreach( $stores as $store ){
                $store->setBook(null);
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $store);
                if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                    return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evi silinirken yayın evinin bağlantılı olduğu kitaplar askıda kitaptan kaldırılamadığı için istek iptal edildi , '.$ormActionHandler->errorMessage, 'response' => null ], 400);
                }
            }

            foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Book, 'targetID' => $book->getId() ]) as $comment ) {
                foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId() ]) as $subComment ) {
                    foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId() ]) as $nestedComment ) {
                        $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                    }
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
            }
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $publisher, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evi Silindi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #PC-delete-2', 'response' => null ], 401);
        }

    }

    public function deleteMultiple( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #PC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload    = json_decode( $request->getContent() );
        $publishers = isset( $payload->publishers ) ? $payload->publishers : [];

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ] );

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #PC-remove-2';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( empty($publishers) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek yayın evlerinin bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($publishers, 'remove');

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet yayın evi başarıyle silindi, silinemeyen yayın evi sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #PC-update-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $publisherObject = $this->entityManager->getRepository(Publisher::class)->find($id);

        if ( is_null($publisherObject) ){
            return new JsonResponse( ['status' => false, 'message' => 'Yayın evi güncelleme işleminde ilgili yayın evi bulunamadı', 'response' => null], 404);
        }

        $payload      = json_decode( $request->getContent() );
        $newPublisher = isset( $payload->newPublisher ) ? $payload->newPublisher : null;

        if ( is_null($newPublisher) ){
            return new JsonResponse( ['status' => false, 'message' => 'Yayın evi güncelleştirme işleminde yeni yayın evi ismi gönderilmedi', 'response' => null], 400);
        }

        $publisherObject->setName($newPublisher);
        $publisherObject->setSlug($this->slugger->slug($newPublisher));

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $publisherObject, 'update');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evi güncellendi', 'response' => null], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #PC-update-2', 'response' => null ], 400);
        }

    }

    private function multipleAction( Array $publishers, String $operation = 'add'){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $publishers as $publisher ){

            if ( $operation === 'add' ) {
                if ( $this->entityManager->getRepository( Publisher::class )->findOneBy( [ 'name' => $publisher] )){
                    $result['fail'] = $result['fail'] + 1;
                    continue;
                }
                $item = new Publisher();
                $item->setName($publisher);
                $item->setSlug($this->slugger->slug($publisher));

            }
            else{
                $item = $this->entityManager->getRepository( Publisher::class )->findOneBy( [ 'name' => $publisher] );
                if ( ! $item ) {
                    $result['fail'] = $result['fail'] + 1;
                    continue;
                }

                foreach($item->getBooks() as $book){
                    $stores = $this->entityManager->getRepository(Store::class)->findBy(['book' => $book]); 
        
                    foreach( $stores as $store ){
                        $store->setBook(null);
                        $ormActionHandler = new OrmActionHandler( $this->entityManager, $store);
                        if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                            return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evi silinirken yayın evinin bağlantılı olduğu kitaplar askıda kitaptan kaldırılamadığı için istek iptal edildi , '.$ormActionHandler->errorMessage, 'response' => null ], 400);
                        }
                    }
        
                    foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Book, 'targetID' => $book->getId() ]) as $comment ) {
                        foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId() ]) as $subComment ) {
                            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId() ]) as $nestedComment ) {
                                $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                            }
                            $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
                        }
                        $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
                    }
                }
            }

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, $operation );

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $id    = $item->getId();
                $value = $item->getName();
                $result['successItems'][] = [ 'id' => $id, 'name' => $value ];
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    public function getAllPublishersForUser(){

        $publishers = [];

        foreach( $this->entityManager->getRepository(Publisher::class)->findAll() as $publisher ){
            $publishers[] = [
                'value' => $publisher->getId(),
                'label' => $publisher->getName()
            ];
        }
        return new JsonResponse( [ 'status' => true, 'message' => 'Yayın Evleri getirildi', 'response' => $publishers ], 200);
    }

}