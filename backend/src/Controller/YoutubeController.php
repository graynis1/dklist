<?php

namespace App\Controller;

use App\Entity\Youtube;
use App\Enums\UserTypeEnum;
use App\Utilities\DirtyController;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class YoutubeController extends AbstractController
{
    private EntityManagerInterface $entityManager;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;
    }

    public function getAll(Request $request){

        $page        = json_decode($request->query->get('page'));
        $pagePerSize = json_decode($request->query->get('pagePerSize'));
        $search      = $request->query->get('search');
        $orderBy     = $request->query->get('orderBy');
        $sortBy      = $request->query->get('sortBy');

        if (empty($orderBy))
            $orderBy = 'ASC';
        if (empty($page) || $page < 0)
            $page = 1;
        if (empty($pagePerSize) || $pagePerSize < 0 || $pagePerSize > 100)
            $pagePerSize = 40;
        if (empty($search))
            $search = '';
        if (empty($sortBy))
            $sortBy = 'id';

        $qb = $this->entityManager->createQueryBuilder();

        $filterQuery = [
            $qb->expr()->like('LOWER(youtube.title)', ':searchTermLower'),
        ];
        $qb->select('youtube')
            ->from('App\Entity\Youtube', 'youtube')
            ->where(...$filterQuery)
            ->orderBy('youtube.' . $sortBy, $orderBy)
            ->setParameter('searchTermLower', '%' . strtolower($search) . '%');

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT youtube.id)')->getQuery()->getSingleScalarResult();

        $lastPage = ceil($filteredCount / $pagePerSize);
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ($filteredCount > 0) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)
                ->setMaxResults($pagePerSize);
        }

        $youtubeObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $youtubeObjects as $youtubeObject ){

            $data[] = [
                'id'          => $youtubeObject->getId(),
                'title'       => $youtubeObject->getTitle(),
                'embededCode' => $youtubeObject->getEmbededCode(),
                'view'        => $youtubeObject->getView()
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

        return new JsonResponse( ['status' => true, 'message' => 'youtube videoları getirildi', 'response' => $response], 200);
    }

    public function add(Request $request){
        
        $payload        = json_decode( $request->getContent() );
        $embededCode    = isset( $payload->embededCode ) ? $payload->embededCode : null;
        $title          = isset( $payload->title ) ? $payload->title : null;
        
        if( (new DirtyController())->control($title)){
            return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
        }

        if ( ! $embededCode || !$title ){
            return new JsonResponse( ['status' => false, 'message' => 'Youtube kaynak kodu veya başlığı eksik gönderildi', 'response' => null], 400);
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #YoutubeC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }
        

        $newYoutube = new Youtube();
        $newYoutube->setTitle($title);
        $newYoutube->setEmbededCode($embededCode);
        
        $control = $this->viewControl();
        if ( !$control['view1']) {
            $newYoutube->setView(1);
        } 
        else if( !$control['view2']){
            $newYoutube->setView(2);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newYoutube );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $response = [
                'id'          => $newYoutube->getId(),
                'title'       => $newYoutube->getTitle(),
                'embededCode' => $newYoutube->getEmbededCode(),
                'view'        => $newYoutube->getView()
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Youtube Videosu Eklendi', 'response' => $response ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-add-2', 'response' => null ], 400);
        }
    }

    public function delete( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #YoutubeC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedYoutubeVideo = $this->entityManager->getRepository(Youtube::class)->find($id);

        if ( ! $deletedYoutubeVideo ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı youtube videosu bulunamadı", 'response' => null ], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedYoutubeVideo, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Youtube Videosu Silindi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #YoutubeC-remove-1', 'response' => null ], 400);
        }
    }

    public function deleteMultiple( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #YoutubeC-delete-2';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload    = json_decode( $request->getContent() );
        $youtubeIDs = isset( $payload->youtubeIDs ) ? $payload->youtubeIDs : [];

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ] );

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #YoutubeC-remove-3';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }


        if ( empty($youtubeIDs) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek youtube videolarının bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($youtubeIDs);

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet youtube videosu başarıyle silindi, silinemeyen video sayısı sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CYoutube-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $youtubeVideoObject = $this->entityManager->getRepository(Youtube::class)->find($id);

        if ( is_null($youtubeVideoObject) ){
            return new JsonResponse( ['status' => false, 'message' => 'Youtube videosu güncelleştirme işleminde ilgili Youtube videosu bulunamadı', 'response' => null], 404);
        }

        $payload    = json_decode( $request->getContent() );
        $newValue   = isset( $payload->newValue ) ? $payload->newValue : null;
        $mode       = isset( $payload->mode )     ? $payload->mode : null;

        if ( empty($newValue) && $newValue !== 0 ) 
            return new JsonResponse( ['status' => false, 'message' => 'Youtube videosu güncelleştirme işleminde veri gönderilmedi', 'response' => null], 404);

        switch($mode){
            case 'embededCode':
                $youtubeVideoObject->setEmbededCode($newValue);
                break;
            case 'title':
                $youtubeVideoObject->setTitle($newValue);
                break;
            case 'view':
                if ($newValue !== 0) {
                    $beforeObject = $this->entityManager->getRepository(Youtube::class)->findOneBy(['view' => $newValue]);
                    if ($beforeObject) {
                        $beforeObject->setView(null);
                        $ormActionHandler = new OrmActionHandler( $this->entityManager, $beforeObject, 'update');
                        if ( !$ormActionHandler->status && $ormActionHandler->error && $ormActionHandler->errorMessage ){
                            return new JsonResponse( [ 'status' => true, 'message' => 'Youtube Videosunun gösterimi güncellenirken bir hata oluştu', 'response' => null], 401);
                        }
                    }
                }
                $youtubeVideoObject->setView($newValue === 0 ? null : $newValue);
                break;
            default:
                return new JsonResponse( ['status' => false, 'message' => 'Youtube videosu güncelleştirme işleminde bir hata oluştu', 'response' => null], 404);
                break;
        }
        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $youtubeVideoObject, 'update');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Youtube Videosu güncellendi', 'response' => null], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-update-1', 'response' => null ], 400);
        }
    }

    private function multipleAction( Array $youtubeVideos ){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $youtubeVideos as $youtubeID ){

            $item = $this->entityManager->getRepository(Youtube::class)->find($youtubeID);
            if ( ! $item ) {
                $result['fail'] = $result['fail'] + 1;
                continue;
            }

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, 'remove' );

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $result['successItems'][] = [ 'id' => $item->getId(), 'title' => $item->getTitle(), 'embededCode' => $item->getEmbededCode() ];
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    private function viewControl(){
        $view1 = $this->entityManager->getRepository(Youtube::class)->findOneBy(['view' => 1]);
        $view2 = $this->entityManager->getRepository(Youtube::class)->findOneBy(['view' => 2]);

        return [
            'view1' => $view1 ? $view1 : false,
            'view2' => $view2 ? $view2 : false,
        ];
    }

}


