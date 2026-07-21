<?php

namespace App\Controller;

use App\Entity\Newsletter;
use App\Enums\UserTypeEnum;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class NewsletterController extends AbstractController
{
    private EntityManagerInterface $entityManager;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;
    }

    public function add(Request $request){

        $payload    = json_decode( $request->getContent() );
        $mail       = isset( $payload->mail ) ? $payload->mail : null;
        
        if ( is_null($mail) ){
            return new JsonResponse( ['status' => false, 'message' => 'Mail Bilgisi Eksik Gönderildi', 'response' => null], 400);
        }

        if ( $this->entityManager->getRepository( Newsletter::class )->findOneBy( [ 'mail' => $mail] )){
            return new JsonResponse( ['status' => false, 'message' => "$mail zaten var !", 'response' => null], 400);
        }

        $newSletter = new Newsletter();
        $newSletter->setMail($mail);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newSletter);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Mail Eklendi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-add-2', 'response' => null ], 400);
        }
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
        if ( empty( $pagePerSize ) || $pagePerSize > 500 )
            $pagePerSize = 100;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'id';

        $qb = $this->entityManager->createQueryBuilder();
        $qb ->select('newsletter') ->from('App\Entity\Newsletter', 'newsletter')
            ->orderBy('newsletter.'.$sortBy, $orderBy);

        if ($search !== '') {
            $qb->where( $qb->expr()->like('LOWER(newsletter.mail)', ':searchTermLower') )
                ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT newsletter.id)')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( !$getAll && $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }

        $objects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $objects as $object ){
            $data[] = [
                'id'   => $object->getId(),
                'mail' => $object->getMail(),
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

        return new JsonResponse( ['status' => true, 'message' => 'Bültendeki mail bilgileri getirildi', 'response' => $response], 200);
    }

    public function delete( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #newsletterC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedItem = $this->entityManager->getRepository(Newsletter::class)->find($id);

        if ( ! $deletedItem ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı mail bulunamadı", 'response' => null ], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedItem, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Mail bültenden Silindi', 'response' => [ 'deletedCategory' => $deletedItem->getMail() ] ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #NewsletterC-remove-1', 'response' => null ], 400);
        }
    }
    
}