<?php

namespace App\Controller;

use App\Entity\Blog;
use App\Entity\Book;
use App\Entity\Score;
use App\Entity\Translator;
use App\Entity\Writer;
use App\Entity\Youtube;
use App\Enums\ScoreEnum;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class GeneralController extends AbstractController
{

    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
    }

    public function increamentViewCount(Request $request, int $id, string $type){
        
        $bearer = $request->headers->get('Authorization');
        $user    = (new SelfRequest($this->entityManager))->control($bearer);

        switch($type){
            case 'book':
                $item = $this->entityManager->getRepository(Book::class)->find($id);
                break;
            case 'writer':
                $item = $this->entityManager->getRepository(Writer::class)->find($id);
                break;
            case 'translator':
                $item = $this->entityManager->getRepository(Translator::class)->find($id);
                break;
            case 'blog':
                $item = $this->entityManager->getRepository(Blog::class)->find($id);
                break;
            default:
                return new JsonResponse(['status' => false, 'message' => 'Tip Tanımlanamadı', 'response' => null], 400);
                break;
        }
        
        if( !$user || !$item ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya item', 'response' => null], 401);
        }

        $item->setViewCount(intval($item->getViewCount())+1);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $item );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => $ormActionHandler->errorMessage, 'response' => null], 400);
    }

    public function score(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user     = (new SelfRequest($this->entityManager))->control($bearer);
        $payload  = json_decode( $request->getContent() );
        $score    = isset( $payload->score ) ? $payload->score : null;
        $type     = isset( $payload->type ) ? $payload->type : null;

        switch ($type) {
            case ScoreEnum::Book->value:
                $item = $this->entityManager->getRepository(Book::class)->find($id);
                break;
            case ScoreEnum::Translator->value:
                $item = $this->entityManager->getRepository(Translator::class)->find($id);
                break;
            case ScoreEnum::Writer->value:
                $item = $this->entityManager->getRepository(Writer::class)->find($id);
                break;
            default:
                $item = null;
                break;
        }
        
        if( !$user || !$item || !$score ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı/Item veya eksik skor', 'response' => null], 401);
        }

        $oldScore = 0;
        $scoreObject = $this->entityManager->getRepository(Score::class)->findOneBy(['owner' => $user, 'targetID' => $item->getId(), 'TargetType' => $type ]);

        if ($scoreObject) {
            $scoresCount = count($this->entityManager->getRepository(Score::class)->findBy(['targetID' => $item->getId(), 'TargetType' => $type ]));
            $oldScore = $scoreObject->getScore();
            $scoreObject->setScore($score);
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $scoreObject );
            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $item->setScore($item->getScore() - ($oldScore/$scoresCount) + ($score/$scoresCount));
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $item );
                if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                    return new JsonResponse(['status' => true, 'message' => null, 'response' => $item->getScore() - ($oldScore/$scoresCount) + ($score/$scoresCount)], 200);
                }
                else{
                    return new JsonResponse(['status' => false, 'message' => 'İteme skor işlenemedi', 'response' => null], 400);
                }
            }
            else{
                return new JsonResponse(['status' => false, 'message' => 'yeni skor nesnesi eklenemedi', 'response' => null], 400);
            }
        }
        else{

            $scoreObject = new Score();
            $scoreObject->setOWner($user);
            $scoreObject->setTargetID($item->getId());
            $scoreObject->setTargetType($type);
            $scoreObject->setScore($score);

            $ormActionHandler = new OrmActionHandler( $this->entityManager, $scoreObject );

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                
                $scoreObjects = $this->entityManager->getRepository(Score::class)->findBy(['targetID' => $item->getId(), 'TargetType' => $type ]);
                $count = count($scoreObjects);
                $finalScore = 0;

                foreach($scoreObjects as $scoreObject){
                    $finalScore = $finalScore + $scoreObject->getScore();
                }

                $finalScore = $finalScore / $count;

                $item->setScore($finalScore);
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $scoreObject );

                if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                    return new JsonResponse(['status' => true, 'message' => null, 'response' => $finalScore], 200);
                }
                else{
                    return new JsonResponse(['status' => false, 'message' => 'iteme skor eklenemedi', 'response' => null], 400);
                }
            }
            else{
                return new JsonResponse(['status' => false, 'message' => 'yeni skor nesnesi eklenemedi', 'response' => null], 400);
            }
        }
        return new JsonResponse(['status' => false, 'message' => 'skorlama hata oluştu', 'response' => null], 400);
    }

    /**
     * @Route("/get-top-items", name: "api_get_top_items", methods: {"GET"})
     */
    public function getTopItems(){

        $initialVideo1 = '<iframe width="1280" height="949" src="https://www.youtube.com/embed/QU5n4dYxfzQ" title="Zenife Pınar ile Kitapları ve Edebiyat Üzerine konuştuk" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        $initialVideo2 = '<iframe width="1280" height="949" src="https://www.youtube.com/embed/846Bnh367W4" title="Layıkhan Özder ile  Edebiyat ve Kitapları Üzerine" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        
        $video1 = $initialVideo1;
        $video2 = $initialVideo2;

        $books   = $this->getTopBooks();
        $writers = $this->getTopWriters();
        $blogs   = $this->getTopBlogs();

        $youtubeVideoObject1 = $this->entityManager->getRepository(Youtube::class)->findOneBy(['view' => 1]);
        if ($youtubeVideoObject1) {
            $video1 = $youtubeVideoObject1->getEmbededCode();
        }

        $youtubeVideoObject2 = $this->entityManager->getRepository(Youtube::class)->findOneBy(['view' => 2]);
        if ($youtubeVideoObject2) {
            $video2 = $youtubeVideoObject2->getEmbededCode();
        }
        
        $response = [
            'youtube1' => $video1,
            'youtube2' => $video2,
            'writers'  => $writers,
            'books'    => $books,
            'blogs'    => $blogs
        ];

        return new JsonResponse(['status' => true, 'message' => 'Bilgiler Getirildi', 'response' => $response ], 200);
    }

    private function getTopBooks(){
        $qb = $this->entityManager->createQueryBuilder();

        $qb ->select('book')
            ->from(Book::class, 'book')
            ->orderBy('book.viewCount', 'DESC')
            ->setMaxResults(3);

        $topBookObjects = $qb->getQuery()->getResult();

        $books = [];

        foreach($topBookObjects as $bookObject){

            $books[] = [
                'id'    => $bookObject->getId(),
                'name'  => $bookObject->getName(),
                'image' => $this->imageManager->generateImageURL($bookObject->getImage()),
                'slug'  => $bookObject->getSlug(),
                'score' => $bookObject->getScore()
            ];
        }

        return $books;
    }

    private function getTopWriters(){
        $qb = $this->entityManager->createQueryBuilder();

        $qb ->select('writer')
            ->from(Writer::class, 'writer')
            ->orderBy('writer.viewCount', 'DESC')
            ->setMaxResults(3);

        $topWriterObjects = $qb->getQuery()->getResult();

        $writers = [];

        foreach($topWriterObjects as $writerObject){

            $writers[] = [
                'id'    => $writerObject->getId(),
                'name'  => $writerObject->getName(),
                'image' => $this->imageManager->generateImageURL($writerObject->getImg()),
                'slug'  => $writerObject->getSlug(),
                'score' => $writerObject->getScore()
            ];
        }

        return $writers;
    }

    private function getTopBlogs(){
        $qb = $this->entityManager->createQueryBuilder();

        $qb ->select('blog')
            ->from(Blog::class, 'blog')
            ->where('blog.approved = :approved')
            ->setParameter('approved', true)
            ->orderBy('blog.viewCount', 'DESC')
            ->setMaxResults(3);

        $topBlogObjects = $qb->getQuery()->getResult();

        $blogs = [];

        foreach($topBlogObjects as $blogObject){

            $blogs[] = [
                'id'        => $blogObject->getId(),
                'title'     => $blogObject->getTitle(),
                'image'     => $this->imageManager->generateImageURL($blogObject->getImage()),
                'slug'      => $blogObject->getSlug(),
                'preview'   => $blogObject->getPreview(),
            ];
        }

        return $blogs;
    }

    public function search(Request $request){

        $pagePerSize    = 5;
        $search         = $request->query->get( 'search' );

        if(!$search){
            $search = '';
        }

        $books = [];
        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(book.name)', ':searchTermLower') ];
        $qb ->select('book') ->from('App\Entity\Book', 'book')
            ->where( ...$filterQuery )
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%')
            ->setMaxResults( $pagePerSize );

        foreach($qb->getQuery()->getResult() as $book){
            $books[] = [
                'id'     => $book->getId(),
                'label'  => $book->getName(),
                'target' => $book->getSlug(),
            ];
        }


        $users = [];
        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(user.username)', ':searchTermLower') ];
        $qb ->select('user') ->from('App\Entity\User', 'user')
            ->where( ...$filterQuery )
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%')
            ->setMaxResults( $pagePerSize );

        foreach($qb->getQuery()->getResult() as $user){
            $users[] = [
                'id'     => $user->getId(),
                'label'  => $user->getUsername(),
                'target' => $user->getId()
            ];
        }


        $translators = [];
        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(translator.name)', ':searchTermLower') ];
        $qb ->select('translator') ->from('App\Entity\Translator', 'translator')
            ->where( ...$filterQuery )
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%')
            ->setMaxResults( $pagePerSize );

        foreach($qb->getQuery()->getResult() as $translator){
            $translators[] = [
                'id'     => $translator->getId(),
                'label'  => $translator->getName(),
                'target' => $translator->getSlug()
            ];
        }



        $writers = [];
        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(writer.name)', ':searchTermLower') ];
        $qb ->select('writer') ->from('App\Entity\Writer', 'writer')
            ->where( ...$filterQuery )
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%')
            ->setMaxResults( $pagePerSize );

        foreach($qb->getQuery()->getResult() as $writer){
            $writers[] = [
                'id'     => $writer->getId(),
                'label'  => $writer->getName(),
                'target' => $writer->getSlug()
            ];
        }


        
        $publishers = [];
        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [ $qb->expr()->like('LOWER(publisher.name)', ':searchTermLower') ];
        $qb ->select('publisher') ->from('App\Entity\Publisher', 'publisher')
            ->where( ...$filterQuery )
            ->setParameter('searchTermLower', '%'.strtolower( $search ).'%')
            ->setMaxResults( $pagePerSize );

        foreach($qb->getQuery()->getResult() as $publisher){
            $publishers[] = [
                'id'     => $publisher->getId(),
                'label'  => $publisher->getName(),
                'target' => $publisher->getSlug()
            ];
        }



        $response = [
            'writers' => $writers,
            'publishers' => $publishers,
            'books' => $books,
            'users' => $users,
            'translators' => $translators,
        ];

        return new JsonResponse( ['status' => true, 'message' => 'Arama Sonuçları Getirildi', 'response' => $response], 200);
    }
}
