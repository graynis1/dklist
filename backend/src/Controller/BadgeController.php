<?php

namespace App\Controller;

use App\Entity\Badges;
use App\Enums\UserTypeEnum;
use App\Utilities\DirtyController;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class BadgeController extends AbstractController {

    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
    }

    public function add(Request $request){

        $requestBody = $request->request->all();
        $comment     = isset( $requestBody['comment'] ) ? $requestBody['comment'] : null;
        $name        = isset( $requestBody['name'] )    ? $requestBody['name'] : null;
        $nameUS      = isset( $requestBody['nameUS'] )    ? $requestBody['nameUS'] : null;
        $commentUS   = isset( $requestBody['commentUS'] )    ? $requestBody['commentUS'] : null;
    
        foreach([$name, $comment] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        $imgFile    = $request->files->get('img');

        if ( is_null($comment) || is_null($name) ){
            return new JsonResponse( ['status' => false, 'message' => 'Token Ekleme sırasında eksik veri gönderildi', 'response' => null], 400);
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BadgeC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $img = $this->imageManager->saveImage($imgFile);

        if ( is_array($img) ){
            return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
        }

        $newBadge = new Badges();
        $newBadge->setComment($comment);
        $newBadge->setImg($img);
        $newBadge->setName($name);
        $newBadge->setNameUS($nameUS);
        $newBadge->setCommentUS($commentUS);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newBadge );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){

            $img = $this->imageManager->generateImageURL($newBadge->getImg());

            $data = [
                'id'        => $newBadge->getId(),
                'name'      => $newBadge->getName(),
                'comment'   => $newBadge->getComment(),
                'img'       => $img,
                'commentUS' => $newBadge->getCommentUS(),
                'nameUS'    => $newBadge->getNameUS(),
            ];
            return new JsonResponse( [ 'status' => true, 'message' => 'Yeni Rozet Eklendi', 'response' => $data ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BadgeC-add-2', 'response' => null ], 200);
        }
    }
    
    public function getAll(Request $request){
        $page           = json_decode( $request->query->get( 'page' ) );
        $pagePerSize    = json_decode( $request->query->get( 'pagePerSize' ) );
        $search         = $request->query->get( 'search' );
        $orderBy        = $request->query->get( 'orderBy' );
        $sortBy         = $request->query->get( 'sortBy' );

        if ( empty( $orderBy ) )
            $orderBy = 'ASC';
        if ( empty( $page ) || $page < 0 )
            $page = 1;
        if ( empty( $pagePerSize ) || $pagePerSize < 0 || $pagePerSize > 100 )
            $pagePerSize = 40;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'id';

        $qb = $this->entityManager->createQueryBuilder();
        $qb ->select('badge') ->from('App\Entity\Badges', 'badge')
            ->orderBy('badge.'.$sortBy, $orderBy);

        if ($search !== '') {
            $qb->where( $qb->expr()->like('LOWER(badge.name)', ':searchTermLower') )
                ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT badge.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }

        $badgeObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $badgeObjects as $badgeObject ){

            $img = $this->imageManager->generateImageURL($badgeObject->getImg());

            $data[] = [
                'id' => $badgeObject->getId(),
                'name' => $badgeObject->getName(),
                'comment' => $badgeObject->getComment(),
                'img' => $img,
                'commentUS' => $badgeObject->getCommentUS(),
                'nameUS' => $badgeObject->getNameUS(),
            ];
        }

        $meta = [
            'page'          => $page,
            'firstPage'     => $lastPage > 1 ? 1 : 0,
            'lastPage'      => $lastPage,
            'pagePerSize'   => $pagePerSize,
            'filteredCount' => $filteredCount, # uygun aramaya uyan, gösterilen-gösterilmeyen tüm sonuçların sayısı
            'viewCount'     => count($data), # Toplam gösterilen sonuç sayısıdır, pagePerSize 10 iken son sayfa için 3 sonuçta gösterilebilir gibi
            'sortBy'        => $sortBy,
            'orderBy'       => $orderBy,
        ];

        $response = [ 'meta' => $meta, 'data' => $data ];

        return new JsonResponse( ['status' => true, 'message' => 'Rozetler getirildi', 'response' => $response], 200);
    }

    public function delete( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BadgeC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedBadge = $this->entityManager->getRepository( Badges::class )->find($id);

        if ( ! $deletedBadge ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı rozet bulunamadı", 'response' => null ], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedBadge, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $img = $deletedBadge->getImg();
            $this->imageManager->deleteImage($img);
            return new JsonResponse( [ 'status' => true, 'message' => 'Rozet Silindi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BadgeC-delete-2', 'response' => null ], 200);
        }
    }

    public function deleteMultiple( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BadgeC-multi_delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload  = json_decode( $request->getContent() );
        $badges   = isset( $payload->badges ) ? $payload->badges : [];

        if ( empty($badges) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek Rozetlerin bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($badges);

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet rozet başarıyle silindi, silinemeyen rozet sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    private function multipleAction( Array $badges ){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $badges as $badge ){
            $item = $this->entityManager->getRepository(Badges::class)->find($badge);
            if ( ! $item ) {
                $result['fail'] = $result['fail'] + 1;
                continue;
            }

            $id      = $item->getId();
            $name    = $item->getName();
            $comment = $item->getComment();
            $img     = $item->getImg();

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, 'remove');

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $this->imageManager->deleteImage($img);
                $result['successItems'][] = [ 'id' => $id, 'name' => $name, 'comment' => $comment ];
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    public function update( int $id, Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #WC-update-img-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $badge = $this->entityManager->getRepository( Badges::class )->find( $id );

        if ( ! $badge ){
            return new JsonResponse( ['status' => false, 'message' => 'Resmini güncellemeye çalıştığınız yazar kayıtlı değil', 'response' => null], 400);
        }

        $requestBody = $request->request->all();
        $mode        = isset( $requestBody['mode'] ) ? $requestBody['mode'] : null;

        if ( ! $mode ) {
            return new JsonResponse( ['status' => false, 'message' => 'Rozet güncelleme için mod eksik gönderildi', 'response' => null], 400);
        }

        switch ($mode) {
            case 'comment':
                $newValue = isset( $requestBody[$mode] ) ? $requestBody[$mode] : null;
                if ( ! $newValue ) { return new JsonResponse( ['status' => false, 'message' => 'Rozet güncelleme için rozet açıklaması eksik gönderildi', 'response' => null], 400);}
                $badge->setComment($newValue);
                break;
            case 'name':
                $newValue = isset( $requestBody[$mode] ) ? $requestBody[$mode] : null;
                if ( ! $newValue ) { return new JsonResponse( ['status' => false, 'message' => 'Rozet güncelleme için rozet ismi eksik gönderildi', 'response' => null], 400);}
                $badge->setName($newValue);
                break;
            case 'commentUS':
                $newValue = isset( $requestBody[$mode] ) ? $requestBody[$mode] : null;
                if ( ! $newValue ) { return new JsonResponse( ['status' => false, 'message' => 'İngilizce Açıklama güncelleme için İngilizce Açıklama açıklaması eksik gönderildi', 'response' => null], 400);}
                $badge->setCommentUS($newValue);
                break;
            case 'nameUS':
                $newValue = isset( $requestBody[$mode] ) ? $requestBody[$mode] : null;
                if ( ! $newValue ) { return new JsonResponse( ['status' => false, 'message' => 'İngilizce isim güncelleme için İngilizce isim ismi eksik gönderildi', 'response' => null], 400);}
                $badge->setNameUS($newValue);
                break;
            case 'img':
                $imgFile = $request->files->get('img');
                if ( !$imgFile ){ return new JsonResponse( ['status' => false, 'message' => 'Rozet güncellemek için resim yüklenirken hata oluştu, muhtemelen resim doğru gönderilemedi!', 'response' => null], 400);}
                $oldImage = $badge->getImg();
                $img = $this->imageManager->saveImage($imgFile);
                if ( is_array($img) ){
                    return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'],'response' => null],  400);
                }
                $this->imageManager->deleteImage($oldImage);
                $badge->setImg($img);

                break;
            default:
                return new JsonResponse( ['status' => false, 'message' => 'Rozet güncellemek isteğinde tanımsız mod gönderildi', 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $badge );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $response = [
                'id'        => $badge->getId(),
                'img'       => $this->imageManager->generateImageURL($badge->getImg()),
                'name'      => $badge->getName(),
                'comment'   => $badge->getComment(),
                'commentUS' => $badge->getCommentUS(),
                'nameUS'    => $badge->getNameUS(),
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Resmi Güncellendi', 'response' => $response ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 200);
        }
    }

}