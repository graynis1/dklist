<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Entity\CommentLike;
use App\Entity\Score;
use App\Entity\SubComment;
use App\Entity\User;
use App\Entity\Writer;
use App\Enums\CommentParentEnum;
use App\Enums\CommentTypeEnum;
use App\Enums\ScoreEnum;
use App\Enums\UserTypeEnum;
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

class WriterController extends AbstractController
{

    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;
        private AsciiSlugger $slugger;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
        $this->slugger = new AsciiSlugger();
    }

    public function add(Request $request){

        $requestBody = $request->request->all();
        $writerName = isset( $requestBody['writerName'] ) ? $requestBody['writerName'] : null;
        $date       = isset( $requestBody['date'] )       ? \DateTime::createFromFormat('Y-m-d', $requestBody['date']) : null;
        $biyo       = isset( $requestBody['biyo'] )       ? $requestBody['biyo'] : null;
        $imgFile    = $request->files->get('img');
        $img        = null;
        if ( is_null($writerName) ){
            return new JsonResponse( ['status' => false, 'message' => 'Yazar ismi eksik gönderildi', 'response' => null], 400);
        }

        foreach([$biyo, $writerName] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #WC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( $this->entityManager->getRepository( Writer::class )->findOneBy( [ 'name' => $writerName ] )){
            return new JsonResponse( ['status' => false, 'message' => "$writerName isimli yazar zaten var !", 'response' => null], 400);
        }

        if ( $imgFile ){
            $img = $this->imageManager->saveImage($imgFile);
            if ( is_array($img) ){
                return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
            }
        }

        $newWriter = new Writer();
        $newWriter->setName($writerName);
        $newWriter->setBiyo($biyo);
        $newWriter->setImg($img);
        $newWriter->setDate($date);
        $newWriter->setSlug($this->slugger->slug($writerName));
        $newWriter->setViewCount(0);
        $newWriter->setScore(0);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newWriter );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $date = $newWriter->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }
            $img = $newWriter->getImg();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }
            $data = [
                'id' => $newWriter->getId(),
                'name' => $newWriter->getName(),
                'date' => $date,
                'biyo' => $newWriter->getBiyo(),
                'img' => $img,
            ];
            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Eklendi', 'response' => $data ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-add-2', 'response' => null ], 400);
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
        if ( empty( $pagePerSize ) || $pagePerSize < 0 || $pagePerSize > 100 )
            $pagePerSize = 40;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'name'; // TODO değişiklik3

        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(writer.name)', ':searchTermLower') ];
        $qb ->select('writer') ->from('App\Entity\Writer', 'writer')
            ->where( ...$filterQuery )
            ->orderBy('writer.'.$sortBy, $orderBy)
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');

        $filteredCount = count( $qb->getQuery()->getResult() );
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( !$getAll && $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }

        $writerObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $writerObjects as $writerObject ){
            $date = $writerObject->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }
            $img = $writerObject->getImg();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $data[] = [
                'id' => $writerObject->getId(),
                'name' => $writerObject->getName(),
                'date' => $date,
                'biyo' => $writerObject->getBiyo(),
                'img' => $img,
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

        return new JsonResponse( ['status' => true, 'message' => 'Yazar bilgileri getirildi', 'response' => $response], 200);
    }

    public function delete( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedWriter = $this->entityManager->getRepository(Writer::class)->find($id);

        if ( ! $deletedWriter ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı yazar bulunamadı", 'response' => null ], 404);
        }

        foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Writer, 'targetID' => $id ]) as $comment ) {
            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId() ]) as $subComment ) {
                foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId() ]) as $nestedComment ) {
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
            }
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedWriter, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $img = $deletedWriter->getImg();
            if ( $img ){
                $this->imageManager->deleteImage($img);
            }
            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Silindi', 'response' => [ 'deletedWriter' => $deletedWriter->getName(), 'id' => $id] ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-remove-1', 'response' => null ], 400);
        }
    }

    public function deleteMultiple( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload  = json_decode( $request->getContent() );
        $writers  = isset( $payload->writers ) ? $payload->writers : [];

        if ( empty($writers) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek Yazarın bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($writers);

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet yazar başarıyle silindi, silinemeyen yazar sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-update-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload = json_decode( $request->getContent() );
        $mode    = isset( $payload->mode ) ? $payload->mode : null;

        if ( !$mode ){
            return new JsonResponse( ['status' => false, 'message' => 'Mod Gönderilmedi' , 'response' => null], 400);
        }

        $writer = $this->entityManager->getRepository(Writer::class)->find($id);

        if ( ! $writer ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen yazar bulunamadı' , 'response' => null], 404);
        }

        $newValue = isset( $payload->newValue ) ? $payload->newValue : null;
        if ( !$newValue ){ return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için bilgi gönderilmedi' , 'response' => null], 400); }

        switch ( $mode ){
            case 'date';
                $writer->setDate($newValue === 'remove' ? null : \DateTime::createFromFormat('Y-m-d', $newValue) );
                break;
            case 'biyo';
                $writer->setBiyo($newValue === 'remove' ? null : $newValue);
                break;
            case 'name';
                $writer->setSlug($this->slugger->slug($newValue));
                $writer->setName($newValue);
                break;
            case 'removeImage':
                $oldImage = $writer->getImg();
                if ( $oldImage ){
                    $deleteImg = $this->imageManager->deleteImage($oldImage);
                    if ( $deleteImg['status'] === true ){
                        $writer->setImg(null);
                    }
                }
                break;
            default;
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için yanlış mod gönderildi' , 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $writer );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Güncellendi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
        }
    }

    public function updateImage( int $id, Request $request ){

        $imgFile = $request->files->get('img');

        if ( !$imgFile ){
            return new JsonResponse( ['status' => false, 'message' => 'Resim yüklenirken hata oluştu, muhtemelen resim doğru gönderilemedi!', 'response' => null], 400);
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #WC-update-img-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $writer = $this->entityManager->getRepository( Writer::class )->find( $id );

        if ( ! $writer ){
            return new JsonResponse( ['status' => false, 'message' => 'Resmini güncellemeye çalıştığınız yazar kayıtlı değil', 'response' => null], 400);
        }


        $oldImage = $writer->getImg();

        if ( $oldImage ){
            $this->imageManager->deleteImage($oldImage);
        }

        $img = $this->imageManager->saveImage($imgFile);
        if ( is_array($img) ){
            return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
        }

        $writer->setImg($img);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $writer );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
           
            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Resmi Güncellendi', 'response' => $this->imageManager->generateImageURL($img) ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
        }
    }

    private function multipleAction( Array $writers ){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $writers as $writer ){
            $item = $this->entityManager->getRepository(Writer::class)->find($writer);
            if ( ! $item ) {
                $result['fail'] = $result['fail'] + 1;
                continue;
            }
            $id    = $item->getId();
            $value = $item->getName();
            $img   = $item->getImg();

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, 'remove');

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $result['successItems'][] = [ 'id' => $id, 'writer' => $value ];
                if ( $img ){
                    $this->imageManager->deleteImage($img);
                }
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    public function like(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $writer = $this->entityManager->getRepository(Writer::class)->find($id);

        if( !$user || !$writer ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya yazar', 'response' => null], 401);
        }

        $temp = false;

        foreach( $user->getLikedWriters() as $otherWriter ){
            if($otherWriter->getId() === $writer->getId()){
                $temp = true;
            }
        }

        if(!$temp){
            $user->addLikedWriter($writer);
        }
        else{
            $user->removeLikedWriter($writer);
        }
        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'beğenme işleminde hata oluştu', 'response' => null], 400);
    }

    public function getAllWritersForClient(Request $request){
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
        if (empty($readQuery))
            $readQuery = false;
        if (empty($optionID) || empty($optionType)) {
            $optionID = false;
            $optionType = false;
        }

        $qb = $this->entityManager->createQueryBuilder();

        $filterQuery = [
            $qb->expr()->like('LOWER(writer.name)', ':searchTermLower'),
        ];


        $qb->select('writer')
            ->from('App\Entity\Writer', 'writer')
            ->where(...$filterQuery)
            ->orderBy('writer.' . $sortBy, $orderBy)
            ->setParameter('searchTermLower', '%' . strtolower($search) . '%');
     
        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT writer.id)')->getQuery()->getSingleScalarResult();

        $lastPage = ceil($filteredCount / $pagePerSize);
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ( $filteredCount > 0 ) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)->setMaxResults($pagePerSize);
        }

        $writerObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ($writerObjects as $writerObject) {

            $img = $writerObject->getImg();
            if ($img) {
                $img = $this->imageManager->generateImageURL($img);
            }
          
            $data[] = [
                'id' => $writerObject->getId(),
                'name' => $writerObject->getName(),
                'image' => $img,
                'score' => $writerObject->getScore(),
                'view' => $writerObject->getViewCount(),
                'slug' => $writerObject->getSlug(),
            ];
        }

        $meta = [
            'page' => $page,
            'firstPage' => $lastPage > 1 ? 1 : 0,
            'lastPage' => $lastPage,
            'pagePerSize' => $pagePerSize,
            'filteredCount' => $filteredCount,
            'viewCount' => count($data),
            'sortBy' => $sortBy,
            'orderBy' => $orderBy,
        ];

        $response = ['meta' => $meta, 'data' => $data];

        return new JsonResponse(['status' => true, 'message' => 'Yazar bilgileri getirildi', 'response' => $response], 200);
    }

    public function getWriter( Request $request, string $slug ){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $currentUserIsLiked = false;
        $currentUserScore = null;
        $scoreCount = null;
        $score = 0;
        $comments = [];
        $writer = $this->entityManager->getRepository(Writer::class)->findOneBy(['slug' => $slug]);
        $books = [];

        if (!$writer){
            return new JsonResponse( [ 'status' => false, 'message' => 'Böyle bir çevirmen yok', 'response' => null ], 404);
        }

        $id = $writer->getId();

        $writerImg = $writer->getImg();
        if ( $writerImg ){
            $writerImg = $this->imageManager->generateImageURL($writerImg);
        }

        $birthDate = $writer->getDate();
        if ( $birthDate ){
            $birthDate = $birthDate->format('Y-m-d');
        }

        if ($user) {
            foreach ( $user->getLikedWriters() as $likedWriter ){
                if ($likedWriter->getId() === $id){
                    $currentUserIsLiked = true;
                    break;
                }
            }
        }

        $scores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Writer, 'targetID' => $id ]);
        $scoreCount = count($scores);
        foreach ( $scores as $scoreItem ){
            $score = $score + $scoreItem->getScore();
            if ( $user && $scoreItem->getOwner()->getId() === $user->getId() ){
                $currentUserScore = $scoreItem->getScore();
            }
        }
        if ( $scoreCount > 0 ){
            $score = $score / $scoreCount;
        }

        foreach( $this->entityManager->getRepository(Comment::class)->findBy([ 'type' => CommentTypeEnum::Writer, 'targetID' => $id ]) as $comment ){

            if ($comment->getUser()->isDisable()) {
                continue;
            }
            
            $subComments = [];

            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId()]) as $subComment ){

                if ($subComment->getUser()->isDisable()) {
                    continue;
                }

                $img = $subComment->getUser()->getImage();

                if ( $img ){
                    $img = $this->imageManager->generateImageURL($img);
                }

                $nestedComments = [];

                foreach ($this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId()]) as $nestedComment){

                    if ($nestedComment->getUser()->isDisable()) {
                        continue;
                    }

                    $nestedImg = $nestedComment->getUser()->getImage();

                    if ( $nestedImg ){
                        $nestedImg = $this->imageManager->generateImageURL($nestedImg);
                    }

                    $nestedComments[] = [
                        'id' => $nestedComment->getId(),
                        'comment' => $nestedComment->getComment(),
                        'parent' => $subComment->getId(),
                        'user' => [
                            'id' => $nestedComment->getUser()->getId(),
                            'username' => $nestedComment->getUser()->getUsername(),
                            'image' => $nestedImg,
                        ],
                    ];
                }

                $subComments[] = [
                    'id' => $subComment->getId(),
                    'comment' => $subComment->getComment(),
                    'user' => [
                        'id' => $subComment->getUser()->getId(),
                        'username' => $subComment->getUser()->getUsername(),
                        'image' => $img,
                    ],
                    'subComments' => $nestedComments
                ];
            }
            
            $date = $comment->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }

            $currentUserIsLikedThisComment = false;

            if ( $this->entityManager->getRepository(CommentLike::class)->findOneBy(['user' => $user, 'comment' => $comment]) ){
                $currentUserIsLikedThisComment = true;
            }

            $writerItemScores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Writer, 'targetID' => $writer->getId() ]);
            $writerItemScoreCount = count($writerItemScores);
            $writerItemScore = 0;

            foreach ( $writerItemScores as $scoreItem ){
                $writerItemScore = $writerItemScore + $scoreItem->getScore();
            }
            if ( $writerItemScoreCount > 0 ){
                $writerItemScore = $writerItemScore / $writerItemScoreCount;
            }

            $img = $comment->getUser()->getImage();
    
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $comments[] = [
                'id' => $comment->getId(),
                'comment' => $comment->getComment(),
                'commentType' => $comment->getCommentType(),
                'type' => $comment->getType(),
                'date' => $date,
                'likeCount' => count($this->entityManager->getRepository(CommentLike::class)->findBy(['comment' => $comment])),
                'currentUserIsLiked' => $currentUserIsLikedThisComment,
                'lang' => $comment->getLang(),
                'user' => [
                    'id' => $comment->getUser()->getId(),
                    'username' => $comment->getUser()->getUsername(),
                    'image' => $img
                ],
                'name' => $writer->getName(),
                'score' => $writerItemScore,
                'slug' => $writer->getSlug(),
                'image' => $writerImg,
                'subComments' => $subComments
            ];
            
        }

        foreach( $writer->getBooks() as $book ){

            $bookImage = $book->getImage();
            if ( $bookImage ){
                $bookImage = $this->imageManager->generateImageURL($bookImage);
            }
    
            $books[] = [
                'id' => $book->getId(),
                'img' => $bookImage,
                'slug' => $book->getSlug(),
                'score' => $book->getScore()
            ];
        }

        $response = [
            'id' => $writer->getId(),
            'image' => $writerImg,
            'slug' => $writer->getSlug(),
            'currenstUserLiked' => $currentUserIsLiked,
            'currentUserScore' => $currentUserScore,
            'score' => $score,
            'scoreCount' => !empty($scoreCount) ? $scoreCount : 0,
            'books' => $books,
            'name' => $writer->getName(),
            'birthDate' => $birthDate,
            'biyo' => $writer->getBiyo(),
            'comments' => array_reverse($comments)
        ];

        return new JsonResponse( [ 'status' => true, 'message' => null, 'response' => $response ], 200);
    }

}
