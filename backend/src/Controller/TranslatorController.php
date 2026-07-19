<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Entity\CommentLike;
use App\Entity\Score;
use App\Entity\SubComment;
use App\Entity\Translator;
use App\Entity\User;
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

class TranslatorController extends AbstractController
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

        $name = isset( $requestBody['name'] ) ? $requestBody['name'] : null;
        if ( is_null($name) ){
            return new JsonResponse( ['status' => false, 'message' => 'Yazar ismi eksik gönderildi', 'response' => null], 400);
        }

        $birthDate  = isset( $requestBody['birthDate'] )  ? \DateTime::createFromFormat('Y-m-d', $requestBody['birthDate']) : null;
        $deathDate  = isset( $requestBody['deathDate'] )  ? \DateTime::createFromFormat('Y-m-d', $requestBody['deathDate']) : null;
        $biyo       = isset( $requestBody['biyo'] )       ? $requestBody['biyo'] : null;
        $imgFile    = $request->files->get('img');
        $img        = null;

        foreach([$name, $biyo] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #TC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( $this->entityManager->getRepository( Translator::class )->findOneBy( [ 'name' => $name ] )){
            return new JsonResponse( ['status' => false, 'message' => "$name isimli çevirmen zaten var !", 'response' => null], 400);
        }

        if ( $imgFile ){
            $img = $this->imageManager->saveImage($imgFile);
        }

        $newTranslator = new Translator();
        $newTranslator->setName($name);
        $newTranslator->setBiyo($biyo) ;
        $newTranslator->setImg($img) ;
        $newTranslator->setBirthDate($birthDate) ;
        $newTranslator->setDeathDate($deathDate) ;
        $newTranslator->setSlug($this->slugger->slug($name));
        $newTranslator->setViewCount(0);
        $newTranslator->setScore(0);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newTranslator );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){

            $birthDate = $newTranslator->getBirthDate();
            if ( $birthDate ){
                $birthDate = $birthDate->format('Y-m-d');
            }
           
            $deathDate = $newTranslator->getDeathDate();
            if ( $deathDate ){
                $deathDate = $deathDate->format('Y-m-d');
            }

            $img = $newTranslator->getImg();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $response = [
                'id' => $newTranslator->getId(),
                'name' => $newTranslator->getName(),
                'biyo' => $newTranslator->getBiyo(),
                'birthDate' => $birthDate,
                'deathDate' => $deathDate,
                'img' => $img
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Çevirmen Eklendi', 'response' => $response ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #TC-add-2', 'response' => null ], 400);
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
            $pagePerSize = 10;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'name'; // TODO değişiklik3

        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(translator.name)', ':searchTermLower') ];
        $qb ->select('translator') ->from('App\Entity\Translator', 'translator')
            ->where( ...$filterQuery )
            ->orderBy('translator.'.$sortBy, $orderBy)
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
        

        $translatorObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $translatorObjects as $translatorObject ){
            $birthDate = $translatorObject->getBirthDate();
            if ( $birthDate ){
                $birthDate = $birthDate->format('Y-m-d');
            }
            $deathDate = $translatorObject->getDeathDate();
            if ( $deathDate ){
                $deathDate = $deathDate->format('Y-m-d');
            }
            $img = $translatorObject->getImg();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $data[] = [
                'id' => $translatorObject->getId(),
                'name' => $translatorObject->getName(),
                'biyo' => $translatorObject->getBiyo(),
                'img' => $img,
                'birthDate' => $birthDate,
                'deathDate' => $deathDate
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

        return new JsonResponse( ['status' => true, 'message' => 'Çevirmen bilgileri getirildi', 'response' => $response], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #TC-update-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $requestBody = $request->request->all();
        $mode = isset( $requestBody['mode'] ) ? $requestBody['mode'] : null;

        if ( !$mode ){
            return new JsonResponse( ['status' => false, 'message' => 'Mod Gönderilmedi' , 'response' => null], 400);
        }

        $translator = $this->entityManager->getRepository(Translator::class)->find($id);

        if ( ! $translator ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen çevirmen bulunamadı' , 'response' => null], 404);
        }

        $newValue = isset( $requestBody['newValue'] ) ? $requestBody['newValue'] : null;

        if ( ! $newValue ){ 
            if ( $mode === 'img' ) {
                $newValue = $request->files->get('newValue');
                if ( !$newValue ){
                    return new JsonResponse( ['status' => false, 'message' => 'Resim yüklenirken hata oluştu, muhtemelen resim doğru gönderilemedi!', 'response' => null], 400);
                }
            }
            else{
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için bilgi gönderilmedi' , 'response' => null], 400); 
            }
        }


        switch ( $mode ){
            case 'name';
                $translator->setName($newValue);
                $translator->setSlug($this->slugger->slug($newValue));
                break;
            case 'biyo';
                $translator->setBiyo($newValue === 'remove' ? null : $newValue);
                break;
            case 'birthDate';
                $translator->setBirthDate($newValue === 'remove' ? null : \DateTime::createFromFormat('Y-m-d', $newValue) );
                break;
            case 'deathDate';
                $translator->setDeathDate($newValue === 'remove' ? null : \DateTime::createFromFormat('Y-m-d', $newValue) );
                break;
            case 'img':
                $oldImage = $translator->getImg();
                if ( $oldImage ){
                    $deleteImg = $this->imageManager->deleteImage($oldImage);
                    if ( $deleteImg['status'] === true ){
                        $translator->setImg(null);
                    }
                }
                if ( $newValue !== 'remove' ) {
                    $saveImageResult = $this->imageManager->saveImage($newValue);
                    if ( is_array($saveImageResult) ) {
                        return new JsonResponse(['status' => false, 'message' => $saveImageResult['errorMessage'], 'response' => null], 400);
                    }
                    $translator->setImg($saveImageResult);
                }
                break;
            default;
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için yanlış mod gönderildi' , 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $translator );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $birthDate = $translator->getBirthDate();
            if ( $birthDate ){
                $birthDate = $birthDate->format('Y-m-d');
            }

            $deathDate = $translator->getDeathDate();
            if ( $deathDate ){
                $deathDate = $deathDate->format('Y-m-d');
            }

            $img = $translator->getImg();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $response = [
                'id' => $translator->getId(),
                'name' => $translator->getName(),
                'biyo' => $translator->getBiyo(),
                'deathDate' => $deathDate,
                'birthDate' => $birthDate,
                'img' => $img,
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Çevirmen Güncellendi', 'response' => $response ], 200);
        }
        
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
    }

    public function delete( Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #TranslatorC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedTranslator = $this->entityManager->getRepository(Translator::class)->find($id);

        if ( ! $deletedTranslator ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı çevirmen bulunamadı", 'response' => null ], 404);
        }

        foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Translator, 'targetID' => $id ]) as $comment ) {
            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId() ]) as $subComment ) {
                foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId() ]) as $nestedComment ) {
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
            }
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedTranslator, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $img = $deletedTranslator->getImg();
            if ( $img ){
                $this->imageManager->deleteImage($img);
            }
            return new JsonResponse( [ 'status' => true, 'message' => 'Çevirmen silindi', 'response' => [ 'deletedWriter' => $deletedTranslator->getName(), 'id' => $id] ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #TranslatorC-remove-2', 'response' => null ], 400);
        }
    }
    
    public function deleteMultiple( Request $request ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #TranslatorC-multiple-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload  = json_decode( $request->getContent() );
        $translators  = isset( $payload->translators ) ? $payload->translators : [];

        if ( empty($translators) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek Çevirmenlerin bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($translators);

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet çevirmen başarıyle silindi, silinemeyen çevirmen sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    private function multipleAction( Array $translators ){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $translators as $translator ){
            $item = $this->entityManager->getRepository(Translator::class)->find($translator);
            if ( ! $item ) {
                $result['fail'] = $result['fail'] + 1;
                continue;
            }
            $id    = $item->getId();
            $value = $item->getName();
            $img   = $item->getImg();

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, 'remove');

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $result['successItems'][] = [ 'id' => $id, 'translator' => $value ];
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

    public function getAllTranslatorsForClient(Request $request){
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
            $qb->expr()->like('LOWER(translator.name)', ':searchTermLower'),
        ];


        $qb->select('translator')
            ->from('App\Entity\Translator', 'translator')
            ->where(...$filterQuery)
            ->orderBy('translator.' . $sortBy, $orderBy)
            ->setParameter('searchTermLower', '%' . strtolower($search) . '%');
     
        $filteredCount = count($qb->getQuery()->getResult());

        $lastPage = ceil($filteredCount / $pagePerSize);
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ( $filteredCount > 0 ) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)->setMaxResults($pagePerSize);
        }

        $translatorObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ($translatorObjects as $translatorObject) {

            $img = $translatorObject->getImg();
            if ($img) {
                $img = $this->imageManager->generateImageURL($img);
            }
          
            $data[] = [
                'id' => $translatorObject->getId(),
                'name' => $translatorObject->getName(),
                'image' => $img,
                'score' => $translatorObject->getScore(),
                'view' => $translatorObject->getViewCount(),
                'slug' => $translatorObject->getSlug(),
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

        return new JsonResponse(['status' => true, 'message' => 'Çevirmen bilgileri getirildi', 'response' => $response], 200);
    }

    public function getTranslator( Request $request, string $slug ){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $currentUserIsLiked = false;
        $currentUserScore = null;
        $scoreCount = null;
        $score = 0;
        $comments = [];
        $translator = $this->entityManager->getRepository(Translator::class)->findOneBy(['slug' => $slug]);
        $books = [];

        if (!$translator){
            return new JsonResponse( [ 'status' => false, 'message' => 'Böyle bir çevirmen yok', 'response' => null ], 404);
        }

        $id = $translator->getId();

        $translatorImage = $translator->getImg();
        if ( $translatorImage ){
            $translatorImage = $this->imageManager->generateImageURL($translatorImage);
        }

        $birthDate = $translator->getBirthDate();
        if ( $birthDate ){
            $birthDate = $birthDate->format('Y-m-d');
        }

        $deathDate = $translator->getDeathDate();
        if ( $deathDate ){
            $deathDate = $deathDate->format('Y-m-d');
        }


        if ($user) {
            foreach ( $user->getLikedTranslators() as $likedTranslator ){
                if ($likedTranslator->getId() === $id){
                    $currentUserIsLiked = true;
                    break;
                }
            }
        }

        $scores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Translator, 'targetID' => $id ]);
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

        foreach( $this->entityManager->getRepository(Comment::class)->findBy([ 'type' => CommentTypeEnum::Translator, 'targetID' => $id ]) as $comment ){
            
            if ($comment->getUser()->isDisable()) {
                continue;
            }

            $subComments = [];

            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId()]) as $subComment ){

                if ($comment->getUser()->isDisable()) {
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

            $translatorItemScores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Translator, 'targetID' => $translator->getId() ]);
            $translatorItemScoreCount = count($translatorItemScores);
            $translatorItemScore = 0;

            foreach ( $translatorItemScores as $scoreItem ){
                $translatorItemScore = $translatorItemScore + $scoreItem->getScore();
            }
            if ( $translatorItemScoreCount > 0 ){
                $translatorItemScore = $translatorItemScore / $translatorItemScoreCount;
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
                'name' => $translator->getName(),
                'score' => $translatorItemScore,
                'slug' => $translator->getSlug(),
                'image' => $translatorImage,
                'subComments' => $subComments
            ];
            
        }

        foreach( $translator->getBooks() as $book ){

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
            'id' => $translator->getId(),
            'image' => $translatorImage,
            'slug' => $translator->getSlug(),
            'currenstUserLiked' => $currentUserIsLiked,
            'currentUserScore' => $currentUserScore,
            'score' => $score,
            'scoreCount' => !empty($scoreCount) ? $scoreCount : 0,
            'books' => $books,
            'name' => $translator->getName(),
            'birthDate' => $birthDate,
            'deathDate' => $deathDate,
            'biyo' => $translator->getBiyo(),
            'comments' => array_reverse($comments)
        ];

        return new JsonResponse( [ 'status' => true, 'message' => null, 'response' => $response ], 200);
    }

    public function like(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $translator = $this->entityManager->getRepository(Translator::class)->find($id);

        if( !$user || !$translator ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya çevirmen', 'response' => null], 401);
        }

        $temp = false;

        foreach( $user->getLikedTranslators() as $otherTranslator ){
            if($otherTranslator->getId() === $translator->getId()){
                $temp = true;
            }
        }

        if(!$temp){
            $user->addLikedTranslator($translator);
        }
        else{
            $user->removeLikedTranslator($translator);
        }
        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'beğenme işleminde hata oluştu', 'response' => null], 400);
    }

}
