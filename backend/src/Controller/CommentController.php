<?php

namespace App\Controller;

use App\Entity\Book;
use App\Entity\Comment;
use App\Entity\CommentLike;
use App\Entity\DKNotifiaction;
use App\Entity\Notice;
use App\Entity\Score;
use App\Entity\SubComment;
use App\Entity\Translator;
use App\Entity\User;
use App\Entity\Writer;
use App\Enums\CommentParentEnum;
use App\Enums\CommentTypeEnum;
use App\Enums\ScoreEnum;
use App\Utilities\ImageManager;
use App\Utilities\NotifyManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\String\Slugger\AsciiSlugger;

class CommentController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;
    private AsciiSlugger $slugger;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
        $this->slugger       = new AsciiSlugger();
    }

    public function like(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $message = '';
        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $comment = $this->entityManager->getRepository(Comment::class)->find($id);
        if( !$user || !$comment ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya comment', 'response' => null], 401);
        }

        $commentLikeObject = $this->entityManager->getRepository(CommentLike::class)->findOneBy(['user' => $user, 'comment' => $comment]);

        if(!$commentLikeObject){

            $commentLikeObject = new CommentLike();
            $commentLikeObject->setUser($user);
            $commentLikeObject->setComment($comment);
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $commentLikeObject);

            $username = $user->getUsername();
            $messageTR = '" '.$username.' " sizin "'. $comment->getComment().'" şeklindeki gönderinizi beğendi.';
            $messageUS = '" '.$username.' " liked your post: "'. $comment->getComment().'".';

            $notify = (new NotifyManager($this->entityManager))->addNotification( $comment->getUser(), $user, $messageTR, $messageUS );

            if( !$notify['status'] ){

                $message = $message.'Beğenme işleminde bildiri eklenirken hata oluştu : '.$notify['message'];
            }

        }
        else{
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $commentLikeObject, 'remove');
        }

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => $message, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'beğenme işleminde hata oluştu', 'response' => null], 400);
    }

    public function update(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $comment = $this->entityManager->getRepository(Comment::class)->find($id);
        $isSelfRequest = $user->getId() === $comment->getUser()->getId();
        $payload    = json_decode( $request->getContent() );
        $newComment = isset( $payload->newComment ) ? $payload->newComment : null;

        if( !$user || !$comment || !$isSelfRequest || !$newComment){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya comment', 'response' => null], 401);
        }

        $comment->setComment($newComment);        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'Güncelleme işlemi sırasında bir hata oluştu', 'response' => null], 400);
    }

    public function delete(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $comment = $this->entityManager->getRepository(Comment::class)->find($id);
        
        if( !$user || !$comment ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız comment veya user', 'response' => null], 400);
        }

        $isSelfRequest = $user->getId() === $comment->getUser()->getId();
        if( !$isSelfRequest ){
            return new JsonResponse(['status' => false, 'message' => 'yetkisiz', 'response' => null], 401);
        }

        foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $id, 'type' => 'comment']) as $notice ){
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
        }

        $subComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'comment', 'parentID' => $comment->getId()]);
        foreach($subComments as $subComment){
            foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $subComment->getId(), 'type' => 'subComment']) as $notice ){
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
            }
            $nestedComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'subComment', 'parentID' => $subComment->getId()]);
            foreach($nestedComments as $nestedComment){
                foreach( $this->entityManager->getRepository(Notice::class)->findBy(['commentID' => $nestedComment->getId(), 'type' => 'subComment']) as $notice ){
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
            }
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
        
        if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
            return new JsonResponse(['status' => false, 'message' => 'Güncelleme işlemi sırasında bir hata oluştu', 'response' => null], 400);
        }

        return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
    }

    public function add(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $payload     = json_decode( $request->getContent() );
        $newComment  = isset( $payload->newComment )  ? $payload->newComment  : null;
        $lang        = isset( $payload->lang )        ? $payload->lang        : null;
        $targetType  = isset( $payload->targetType )  ? $payload->targetType  : null;
        $commentType = isset( $payload->commentType ) ? $payload->commentType : null;

        switch ($targetType) {
            case CommentTypeEnum::Book->value:
                $item = $this->entityManager->getRepository(Book::class)->find($id);
                $itemImage = $item->getImage();
                break;
            case CommentTypeEnum::Writer->value:
                $item = $this->entityManager->getRepository(Writer::class)->find($id);
                $itemImage = $item->getImg();
                break;
            case CommentTypeEnum::Translator->value:
                $item = $this->entityManager->getRepository(Translator::class)->find($id);
                $itemImage = $item->getImg();
                break;
            default:
                $item = null;
                $itemImage = null;
                break;
        }

        if( !$user || !$newComment || !$targetType || !$commentType || !$item || ($targetType === CommentTypeEnum::Book->value && is_null($lang))){
            return new JsonResponse(['status' => false, 'message' => 'Yorum eklemede hatalı istek gönderildi', 'response' => null], 401);
        }

        

        $comment = new Comment();
        $comment->setComment($newComment);
        $comment->setType($targetType);
        $comment->setCommentType($commentType);
        $comment->setTargetID($id);
        $comment->setUser($user);
        $comment->setLang($lang);
        $comment->setDate(new \DateTime());

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){


            $userImg = $comment->getUser()->getImage();

            if ( $userImg ){
                $userImg = $this->imageManager->generateImageURL($userImg);
            }

            if ( $itemImage ){
                $itemImage = $this->imageManager->generateImageURL($itemImage);
            }

            $date = $comment->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }
                
            $score = 0;
            $scores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Book, 'targetID' => $id ]);
            $scoreCount = count($scores);
            foreach ( $scores as $scoreItem ){
                $score = $score + $scoreItem->getScore();
            }
            if ( $scoreCount > 0 ){
                $score = $score / $scoreCount;
            }

            $response = [
                'id' => $comment->getId(),
                'comment' => $comment->getComment(),
                'commentType' => $comment->getCommentType(),
                'date' => $date,
                'name' => $item->getName(),
                'slug' => $item->getSlug(),
                'currentUserIsLiked' => false,
                'likeCount' => 0,
                'type' => $comment->getType(),
                'image' => $itemImage,
                'score' => $score,
                'user' => [
                    'id' => $comment->getUser()->getId(),
                    'username' => $comment->getUser()->getUsername(),
                    'image' => $userImg,
                ],
                'subComments' => []
            ];
            return new JsonResponse(['status' => true, 'message' => null, 'response' => $response], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => $ormActionHandler->errorMessage, 'response' => null], 400);
    }

    public function addSubcomment(Request $request){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $payload     = json_decode( $request->getContent() );
        $newComment  = isset( $payload->newComment )  ? $payload->newComment  : null;
        $parentType  = isset( $payload->parentType )  ? $payload->parentType  : null;
        $parentID    = isset( $payload->parentID )    ? $payload->parentID : null;

        switch ($parentType) {
            case 'comment':
                $parent = $this->entityManager->getRepository(Comment::class)->find($parentID);
                break;
            case 'subComment':
                $parent = $this->entityManager->getRepository(SubComment::class)->find($parentID);
                break;
            default:
                $parent = null;
                break;
        }

        if( !$user || !$newComment || !$parent ){
            return new JsonResponse(['status' => false, 'message' => 'Alt Yorum eklemede hatalı istek gönderildi', 'response' => null], 401);
        }

        $subComment = new SubComment();        
        $subComment->setComment($newComment);
        $subComment->setUser($user);
        $subComment->setParentType($parentType);
        $subComment->setParentID($parentID);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
           
            $userImg = $user->getImage();

            if ( $userImg ){
                $userImg = $this->imageManager->generateImageURL($userImg);
            }

            $response = [
                'id' => $subComment->getId(),
                'comment' => $subComment->getComment(),
                'parent' => $parentID,
                'user' => [
                    'id' => $user->getId(),
                    'username' => $user->getUsername(),
                    'image' => $userImg,
                ],
            ];
            
            if ($parentType === 'comment') {
                $response['subComments'] = [];
            }

            return new JsonResponse(['status' => true, 'message' => null, 'response' => $response], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => $ormActionHandler->errorMessage, 'response' => null], 400);
    }

    public function deleteSubComment(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $subComment = $this->entityManager->getRepository(SubComment::class)->find($id);
        
        if( !$user || !$subComment ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız subcomment veya user', 'response' => null], 400);
        }

        $isSelfRequest = $user->getId() === $subComment->getUser()->getId();
        if( !$isSelfRequest ){
            return new JsonResponse(['status' => false, 'message' => 'yetkisiz', 'response' => null], 401);
        }

        if ($subComment->getParentType() === 'comment') {
            $nestedComments = $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => 'subComment', 'parentID' => $subComment->getId()]);
            foreach($nestedComments as $nestedComment){
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
            }
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
        
        if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
            return new JsonResponse(['status' => false, 'message' => 'Güncelleme işlemi sırasında bir hata oluştu', 'response' => null], 400);
        }

        return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
    }

    public function updateSubComment(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $subComment = $this->entityManager->getRepository(SubComment::class)->find($id);
        $isSelfRequest = $user->getId() === $subComment->getUser()->getId();
        $payload    = json_decode( $request->getContent() );
        $newComment = isset( $payload->newComment ) ? $payload->newComment : null;

        if( !$user || !$subComment || !$isSelfRequest || !$newComment){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya comment', 'response' => null], 401);
        }

        $subComment->setComment($newComment);        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment);

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'Güncelleme işlemi sırasında bir hata oluştu', 'response' => null], 400);
    }

    public function getComments(Request $request, int $page = 1){
        
        $bearer = $request->headers->get('Authorization');

        $commentID = $request->query->get('commentID');
        
        $perPage = 20;
        $startIndex = ($page - 1) * $perPage;

        if($commentID && $commentID !== 'undefined'){
            $commentObjects = [$this->entityManager->getRepository(Comment::class)->find($commentID)];
        }
        else{
            $commentObjects = $this->entityManager->getRepository(Comment::class)->findBy([], ['id' => 'DESC'], $perPage, $startIndex);
        }

        $comments = [];

        if(!$commentObjects){
            return new JsonResponse(['status' => false, 'message' => 'Gönderi Bulunamadı', 'response' => null], 404);
        }


        foreach ($commentObjects as $commentObject) {

            $subcomments = [];

            if ($commentObject->getUser()->isDisable()) {
                continue;
            }

            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $commentObject->getId()]) as $subComment ){

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

                $subcomments[] = [
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

            $date = $commentObject->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }

            $currentUserIsLikedThisComment = false;

            $currentUser = $this->entityManager->getRepository(User::class)->findOneBy(['token' => str_replace('Bearer ', '', $bearer)]);

            if ( $this->entityManager->getRepository(CommentLike::class)->findOneBy(['user' => $currentUser, 'comment' => $commentObject]) ){
                $currentUserIsLikedThisComment = true;
            }

            $img = $commentObject->getUser()->getImage();

            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            switch ($commentObject->getType()) {
                case CommentTypeEnum::Book->value:
                    $item = $this->entityManager->getRepository(Book::class)->find($commentObject->getTargetID());
                    break;
                case CommentTypeEnum::Translator->value:
                    $item = $this->entityManager->getRepository(Translator::class)->find($commentObject->getTargetID());
                    break;
                case CommentTypeEnum::Writer->value:
                    $item = $this->entityManager->getRepository(Writer::class)->find($commentObject->getTargetID());
                    break;
                default:// Burada ve aşağıdaki continue if'inde hata var, yorumlar bağlı olduğu kitap/yazar/çevirmen nesnesi silindiğinde bulamadığım bir senaryoda silinmiyor, böyle olunca burası patlıyordu
                    $item = null;
                    break;
            }

            if ( !$item ) {
                // continue;
            }

            $comments[] = [
                'id' => $commentObject->getId(),
                'comment' => $commentObject->getComment(),
                'commentType' => $commentObject->getCommentType(),
                'type' => $commentObject->getType(),
                'date' => $date,
                'likeCount' => count($this->entityManager->getRepository(CommentLike::class)->findBy(['comment' => $commentObject])),
                'currentUserIsLiked' => $currentUserIsLikedThisComment,
                'lang' => $commentObject->getLang(),
                'user' => [
                    'id' => $commentObject->getUser()->getId(),
                    'username' => $commentObject->getUser()->getUsername(),
                    'image' => $img
                ],
                'subComments' => $subcomments,
                'name' => $item->getName(),
                'score' => $item->getScore(),
                'slug' => $item->getSlug(),
                'image' => $this->imageManager->generateImageURL( $commentObject->getType() === CommentTypeEnum::Book->value ? $item->getImage() : $item->getImg()),
            ];
        }

        $response = [
            'comments' => $comments,
            'more' => count($comments) < $perPage ? false : true
        ];

        return new JsonResponse(['status' => true, 'message' => 'Bilgiler Geldi', 'response' => $response], 200);
    }
}