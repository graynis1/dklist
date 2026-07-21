<?php

namespace App\Controller;

use App\Entity\Book;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\CommentLike;
use App\Entity\Notice;
use App\Entity\Publisher;
use App\Entity\Read;
use App\Entity\Score;
use App\Entity\Store;
use App\Entity\SubComment;
use App\Entity\Translator;
use App\Entity\User;
use App\Entity\Writer;
use App\Enums\CommentParentEnum;
use App\Enums\CommentTypeEnum;
use App\Enums\ReadStatusEnum;
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

class BookController extends AbstractController
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

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Mod, UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $requestBody = $request->request->all();

        $name           = isset( $requestBody['name'] ) ? $requestBody['name'] : null;
        $orgName        = isset( $requestBody['orgName'] ) ? $requestBody['orgName'] : null;
        $publisherID    = isset( $requestBody['publisherID'] ) ? $requestBody['publisherID'] : null;
        $lang           = isset( $requestBody['lang'] ) ? $requestBody['lang'] : null;
        $pageNumber     = isset( $requestBody['pageNumber'] ) ? $requestBody['pageNumber'] : null;
        $format         = isset( $requestBody['format'] ) ? $requestBody['format'] : null;
        $isbn           = isset( $requestBody['isbn'] ) ? $requestBody['isbn'] : null;
        $content        = isset( $requestBody['content'] ) ? $requestBody['content'] : null;
        $date           = isset( $requestBody['date'] ) ? \DateTime::createFromFormat('Y-m-d', $requestBody['date']) : null;
        $writerIDs      = isset( $requestBody['writerIDs'] ) ? json_decode($requestBody['writerIDs']) : null;
        $translatorIDs  = isset( $requestBody['translatorIDs'] ) ? json_decode($requestBody['translatorIDs']) : null;
        $categorieIDs   = isset( $requestBody['categorieIDs'] ) ? json_decode($requestBody['categorieIDs']) : null;
        $parentID       = isset( $requestBody['parentID'] ) ? json_decode($requestBody['parentID']) : null;
        $imgFile        = $request->files->get('img');

        $approve = false;

        if( in_array((new SelfRequest($this->entityManager))->control($bearer)->getUserType(), [UserTypeEnum::Admin->value, UserTypeEnum::SuperAdmin->value]) ){
            $approve = true;
        }

        foreach([$name, $orgName, $content] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        if ( empty($name) || empty($orgName) || empty($publisherID) || empty($lang) || empty($pageNumber) || (empty($parentID) && $parentID !== 0)){
            return new JsonResponse( ['status' => false, 'message' => 'Kitap eklemek için mutlaka kitap adı, orjinal kitap numarası, yayın evi, sayfa sayısı ve dil bilgisi göndermelisiniz!', 'response' => null], 400);
        }

        $publisher = $this->entityManager->getRepository(Publisher::class)->find($publisherID);

        if ( !$publisher ) {
            return new JsonResponse( ['status' => false, 'message' => 'Kitabın yayın evi tanımlı değil', 'response' => null], 404);
        }

        $categories  = [];
        $writers     = [];
        $translators = [];
 
        $parent = $this->entityManager->getRepository(Book::class)->find( $parentID );

        if ( $writerIDs ) {

            if( !is_array($writerIDs) )
                $writerIDs = [$writerIDs];

            foreach ($writerIDs as $id ) {
                $writer = $this->entityManager->getRepository(Writer::class)->find($id);
                if( $writer ){
                    $writers[] = $writer;
                }
            }
        }
        if ( $translatorIDs ) {
            foreach ($translatorIDs as $id ) {
                $translator = $this->entityManager->getRepository(Translator::class)->find($id);
                if( $translator ){
                    $translators[] = $translator;
                }
            }
        }
        if ($parent) {

            $olderBook = $this->entityManager->getRepository(Book::class)->findOneBy(['originalBook' => $parent, 'publisher' => $publisher ]);

            if( $olderBook ){
                $olderTranslators = $olderBook->getTranslators();
                if( $olderTranslators ){
                    $olderTranslatorIDs = [];
                    foreach( $olderTranslators as $olderTranslator){
                        $olderTranslatorIDs[] = $olderTranslator->getId();
                    }
                    $temp = true;

                    sort($olderTranslatorIDs);
                    sort($translatorIDs);

                    if( count($olderTranslatorIDs) === count($translatorIDs) ){

                        for ($i=0; $i < count($olderTranslatorIDs); $i++) { 

                            if( $olderTranslatorIDs[$i] !== $translatorIDs[$i] ){
                                $temp = false;
                            }
                        }
                        
                        if($temp){
                            return new JsonResponse( ['status' => false, 'message' => 'Bu kitap çevirisi zaten ekli', 'response' => null], 400);
                        }

                    }
                }
            }

            foreach ( $parent->getCategories() as $category) {
                $categories[] = $category;
            }

        }
        else if ( $categorieIDs ) {
            foreach ($categorieIDs as $id ) {
                $category = $this->entityManager->getRepository(Category::class)->find($id);
                if( $category ){
                    $categories[] = $category;
                }
            }
        }

        $img = null;

        if ( $imgFile ){
            $img = $this->imageManager->saveImage($imgFile);
            if ( is_array($img) ){
                return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
            }
        }

        $newBook = new Book();
        $newBook->setOrgName($orgName);
        $newBook->setName($name);
        $newBook->setPublisher($publisher);
        $newBook->setDate($date);
        $newBook->setFormat($format);
        $newBook->setLang($lang);
        $newBook->setIsbn($isbn);
        $newBook->setContent($content);
        $newBook->setImage($img);
        $newBook->setOriginalBook($parent);
        $newBook->setPageNumber($pageNumber);
        $newBook->setSlug($this->slugger->slug($publisher->getName().'/'.$newBook->getName())->lower());
        $newBook->setScore(0);
        $newBook->setViewCount(0);
        $newBook->setApprove($approve);

        foreach( $writers as $writer){ $newBook->addWriter($writer); }
        foreach( $translators as $translator){ $newBook->addTranslator($translator); }
        foreach( $categories as $category){ $newBook->addCategory($category); }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newBook );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            $date = $newBook->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }
            $img = $newBook->getImage();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }
            $categories  = [];
            $writers     = [];
            $translators = [];

            foreach ( $newBook->getWriters() as $writer ) { $writers[] = [ 'writer' => $writer->getName(), 'id' => $writer->getId() ]; }
            foreach ( $newBook->getTranslators() as $translator ) { $translators[] = [ 'translator' => $translator->getName(), 'id' => $translator->getId() ]; }
            foreach ( $newBook->getCategories() as $category ) { $categories[] = [ 'category' => $category->getCategory(), 'id' => $category->getId() ]; }

            $publisher = $newBook->getPublisher();

            $response = [
                'id'          =>  $newBook->getId(),
                'name'        =>  $newBook->getName(),
                'lang'        =>  $newBook->getLang(),
                'content'     =>  $newBook->getContent(),
                'format'      =>  $newBook->getFormat(),
                'isbn'        =>  $newBook->getIsbn(),
                'approved'    =>  $approve,
                'pageNumber'  =>  $newBook->getPageNumber(),
                'img'         =>  $img,
                'isOriginal'  =>  empty($newBook->getOriginalBook()) ? true : false,
                'date'        =>  $date,
                'publisher'   =>  [
                    'publisherId'    =>  $publisher->getId(),
                    'publisherName'  =>  $publisher->getName()
                ],
                'writers'     =>  $writers,
                'categories'  =>  $categories,
                'translators' =>  $translators
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Yazar Eklendi', 'response' => $response ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
        }
    }

    public function checkOriginalBooks(Request $request){
        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::All ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-check-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $payload   = json_decode( $request->getContent() );
        $name      = isset( $payload->name )      ? $payload->name      : null;
        $writerIDs = isset( $payload->writerIDs ) ? $payload->writerIDs : null;

        if ( empty($name) || empty($writerIDs) ) {
            return new JsonResponse( ['status' => false, 'message' =>'İsim veya yazar bilgisi gönderilmedi', 'response' => null ], 401);
        }
        
        $parent = $this->entityManager->getRepository(Book::class)->findOneBy([ 'orgName'   => $name, 'originalBook'   => null ]);
        $parentWriterIDs = [];

        if ( $parent ) {
            foreach ( $parent->getWriters() as $writer ) {
                $parentWriterIDs[] = $writer->getId();
            }
        }


        if ( count($parentWriterIDs) === count($writerIDs) ) {
            sort($parentWriterIDs);sort($writerIDs);
            if ($parentWriterIDs === $writerIDs ) {
                return new JsonResponse( ['status' => true, 'message' =>'Orjinal Kitap bulundu', 'response' => ['parentID' => $parent->getId()] ], 200);

            }            
        }
        return new JsonResponse( ['status' => false, 'message' =>'Orjinal Kitap bulunamadı', 'response' => null ], 400);
    }

    public function getAll(Request $request){

        $page = json_decode($request->query->get('page'));
        $pagePerSize = json_decode($request->query->get('pagePerSize'));
        $search = $request->query->get('search');
        $orderBy = $request->query->get('orderBy');
        $sortBy = $request->query->get('sortBy');

        if (empty($orderBy))
            $orderBy = 'ASC';
        if (empty($page) || $page < 0)
            $page = 1;
        if (empty($pagePerSize) || $pagePerSize < 0 || $pagePerSize > 100)
            $pagePerSize = 40;
        if (empty($search))
            $search = '';
        if (empty($sortBy))
            $sortBy = 'approve';

        $qb = $this->entityManager->createQueryBuilder();

        $qb->select('book')
            ->from('App\Entity\Book', 'book')
            ->orderBy('book.' . $sortBy, $orderBy);

        if ($search !== '') {
            $qb->where(
                $qb->expr()->orX(
                    $qb->expr()->like('LOWER(book.name)', ':searchTermLower'),
                    $qb->expr()->like('LOWER(book.orgName)', ':searchTermLower')
                )
            )->setParameter('searchTermLower', '%' . strtolower($search) . '%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT book.id)')->getQuery()->getSingleScalarResult();

        $lastPage = ceil($filteredCount / $pagePerSize);
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ($filteredCount > 0) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)
                ->setMaxResults($pagePerSize);
        }

        $bookObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $bookObjects as $bookObject ){

            $date = $bookObject->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }

            $img = $bookObject->getImage();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $publisher = $bookObject->getPublisher();

            $writers = [];
            $categories = [];
            $translators = [];

            foreach ( $bookObject->getWriters() as $writer ) { $writers[] = [ 'writer' => $writer->getName(), 'id' => $writer->getId() ]; }
            foreach ( $bookObject->getTranslators() as $translator ) { $translators[] = [ 'translator' => $translator->getName(), 'id' => $translator->getId() ]; }
            foreach ( $bookObject->getCategories() as $category ) { $categories[] = [ 'category' => $category->getCategory(), 'id' => $category->getId() ]; }

            $parent = $bookObject->getOriginalBook();
            
            $data[] = [
                'id'          =>  $bookObject->getId(),
                'name'        =>  $bookObject->getName(),
                'lang'        =>  $bookObject->getLang(),
                'content'     =>  $bookObject->getContent(),
                'format'      =>  $bookObject->getFormat(),
                'isbn'        =>  $bookObject->getIsbn(),
                'pageNumber'  =>  $bookObject->getPageNumber(),
                'img'         =>  $img,
                'approved'    =>  $bookObject->isApprove(),
                'isOriginal'  =>  empty($parent) ? true : false,
                'parentID'    =>  empty($parent) ? null : $parent->getId(),  
                'date'        =>  $date,
                'publisher'   =>  [
                    'publisherId'    =>  $publisher->getId(),
                    'publisherName'  =>  $publisher->getName()
                ],
                'writers'     =>  $writers,
                'categories'  =>  $categories,
                'translators' =>  $translators
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

        return new JsonResponse( ['status' => true, 'message' => 'Kitap bilgileri getirildi', 'response' => $response], 200);
    }

    public function getBookOptions(){
        
        $writers     = [];
        $categories  = [];
        $translators = [];

        foreach ( $this->entityManager->getRepository(Writer::class)->findAll()     as $writer )     { $writers[] = [ 'id' => $writer->getId(), 'name' => $writer->getName() ]; }
        foreach ( $this->entityManager->getRepository(Category::class)->findAll()   as $category )   { $categories[] = [ 'id' => $category->getId(), 'name' => $category->getCategory() ]; }
        foreach ( $this->entityManager->getRepository(Translator::class)->findAll() as $translator ) { $translators[] = [ 'id' => $translator->getId(), 'name' => $translator->getName() ]; }

        $response = [
            'categories'    => $categories,
            'writers'       => $writers,
            'translators'   => $translators
        ];

        return new JsonResponse( ['status' => true, 'message' => 'Kitap bilgileri getirildi', 'response' => $response ], 200);
    }

    public function delete(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $deletedBook = $this->entityManager->getRepository(Book::class)->find($id);

        if ( ! $deletedBook ) {
            return new JsonResponse( ['status' => false, 'message' => "$id numaralı kitap bulunamadı", 'response' => null ], 404);
        }

        foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Book, 'targetID' => $id ]) as $comment ) {
            foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::Comment, 'parentID' => $comment->getId() ]) as $subComment ) {
                foreach ( $this->entityManager->getRepository(SubComment::class)->findBy(['parentType' => CommentParentEnum::SubComment, 'parentID' => $subComment->getId() ]) as $nestedComment ) {
                    $ormActionHandler = new OrmActionHandler( $this->entityManager, $nestedComment, 'remove');
                }
                $ormActionHandler = new OrmActionHandler( $this->entityManager, $subComment, 'remove');
            }
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $comment, 'remove');
        }
       
        foreach ($this->entityManager->getRepository(Store::class)->findBy(['book' => $deletedBook]) as $store) {
            $store->setBook(null);
            new OrmActionHandler( $this->entityManager, $store );
        }

        $parent = $deletedBook->getOriginalBook();

        if ( ! $parent ) {
            $children = $this->entityManager->getRepository(Book::class)->findBy( ['originalBook' => $deletedBook] );
            for ($i=0; $i < count($children) ; $i++) { 
                $child = $children[$i];
                if ( $i === 0 ) 
                    $child->setOriginalBook(null);
                else
                    $child->setOriginalBook($children[0]);

                $ormActionHandler = new OrmActionHandler( $this->entityManager, $child );

                if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                    return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-delete-1', 'response' => null ], 400);
                }
            }
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deletedBook, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Kitap Silindi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-delete-2', 'response' => null ], 400);
        }
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-update-1';
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

        $book = $this->entityManager->getRepository(Book::class)->find($id);

        if ( ! $book ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen kitap bulunamadı' , 'response' => null], 404);
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
            case 'translator':
                $alreadyTranslators = $book->getTranslators();
                $newValue = json_decode($newValue);
                foreach ($alreadyTranslators as $translator) {
                    $book->removeTranslator($translator);
                    new OrmActionHandler( $this->entityManager, $book );
                }
                foreach ($newValue as $trnaslatorID) {
                    $newTranslator = $this->entityManager->getRepository(Translator::class)->find($trnaslatorID);
                    if ( $newTranslator ) {
                        $book->addTranslator($newTranslator);
                    }
                }
                break;
            case 'writer':
                if ( $book->getOriginalBook() ) {
                    $book = $book->getOriginalBook();
                }
                $books = [ $book ];

                foreach ($this->entityManager->getRepository(Book::class)->findBy(['originalBook' => $book]) as $item) { $books[] = $item; }

                $newValue = json_decode($newValue);

                foreach ($books as $item) {
                    foreach ($item->getWriters() as $writer) {
                        $item->removeWriter($writer);
                    }
                    foreach ($newValue as $writerID) {
                        $newWriter = $this->entityManager->getRepository(Writer::class)->find($writerID);
                        if ( $newWriter ) {
                            $item->addWriter($newWriter);
                        }
                    }
                    new OrmActionHandler( $this->entityManager, $item);
                }
                
                break;
            case 'category':
                if ( $book->getOriginalBook() ) {
                    $book = $book->getOriginalBook();
                }
                $books = [ $book ];

                foreach ($this->entityManager->getRepository(Book::class)->findBy(['originalBook' => $book]) as $item) { $books[] = $item; }

                $newValue = json_decode($newValue);
                foreach ($books as $item) {
                    foreach ($item->getCategories() as $category) {
                        $item->removeCategory($category);
                    }
                    foreach ($newValue as $categoryID) {
                        $newCategory = $this->entityManager->getRepository(Category::class)->find($categoryID);
                        if ( $newCategory ) {
                            $item->addCategory($newCategory);
                        }
                    }
                    new OrmActionHandler( $this->entityManager, $item);
                }
                break;
            case 'name';
                $book->setSlug($this->slugger->slug($book->getPublisher()->getName().'/'.$newValue)->lower());
                $book->setName($newValue);
                break;
            case 'content';
                $book->setContent($newValue);
                break;
            case 'lang';
                $book->setLang($newValue);
                break;
            case 'pageNumber';
                $book->setPageNumber($newValue);
                break;
            case 'format';
                $book->setFormat($newValue === 'remove' ? null : $newValue);
                break;
            case 'isbn';
                $book->setIsbn($newValue === 'remove' ? null : $newValue);
                break;
            case 'date';
                $book->setDate(\DateTime::createFromFormat('Y-m-d', $newValue) );
                break;
            case 'approve';
                $book->setApprove(json_decode($newValue));
                break;
            case 'img':
                $oldImage = $book->getImage();
                if ( $oldImage ){
                    $deleteImg = $this->imageManager->deleteImage($oldImage);
                    if ( $deleteImg['status'] === true ){
                        $book->setImage(null);
                    }
                }
                if ( $newValue !== 'remove' ) {
                    $saveImageResult = $this->imageManager->saveImage($newValue);
                    if ( is_array($saveImageResult) ) {
                        return new JsonResponse(['status' => false, 'message' => $saveImageResult['errorMessage'], 'response' => null], 400);
                    }
                    $book->setImage($saveImageResult);
                }
                break;
            default;
                return new JsonResponse( ['status' => false, 'message' => 'Güncelleme için yanlış mod gönderildi' , 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $book );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            

            $date = $book->getDate();
            if ( $date ){
                $date = $date->format('Y-m-d');
            }

            $img = $book->getImage();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $publisher = $book->getPublisher();

            $writers = [];
            $categories = [];
            $translators = [];

            foreach ( $book->getWriters() as $writer ) { $writers[] = [ 'writer' => $writer->getName(), 'id' => $writer->getId() ]; }
            foreach ( $book->getTranslators() as $translator ) { $translators[] = [ 'translator' => $translator->getName(), 'id' => $translator->getId() ]; }
            foreach ( $book->getCategories() as $category ) { $categories[] = [ 'category' => $category->getCategory(), 'id' => $category->getId() ]; }
            
            $parent = $book->getOriginalBook();
            
            $response = [
                'id'          =>  $book->getId(),
                'name'        =>  $book->getName(),
                'lang'        =>  $book->getLang(),
                'content'     =>  $book->getContent(),
                'format'      =>  $book->getFormat(),
                'isbn'        =>  $book->getIsbn(),
                'pageNumber'  =>  $book->getPageNumber(),
                'img'         =>  $img,
                'isOriginal'  =>  empty($parent) ? true : false,
                'parentID'    =>  empty($parent) ? null : $parent->getId(),  
                'date'        =>  $date,
                'publisher'   =>  [
                    'publisherId'    =>  $publisher->getId(),
                    'publisherName'  =>  $publisher->getName()
                ],
                'writers'     =>  $writers,
                'categories'  =>  $categories,
                'translators' =>  $translators
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Kitap Güncellendi', 'response' => $response  ], 200);
        }
        
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
    }

    public function getBook( Request $request, string $slug ){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);

        $currentUserIsLiked     = false;
        $currentUserScore       = null;
        $scoreCount             = null;
        $score                  = 0;
        $currentUserReadStatus  = null;
        $otherUsers             = [];
        $otherBooks             = [];
        $categories             = [];
        $writers                = [];
        $publisher              = [];
        $translators            = [];

        $book = $this->entityManager->getRepository(Book::class)->findOneBy(['slug' => $slug]);

        if (!$book){
            return new JsonResponse( [ 'status' => false, 'message' => 'Böyle bir kitap yok', 'response' => null ], 404);
        }

        $id = $book->getId();

        $bookImage = $book->getImage();
        if ( $bookImage ){
            $bookImage = $this->imageManager->generateImageURL($bookImage);
        }

        $date = $book->getDate();
        if ( $date ){
            $date = $date->format('Y-m-d');
        }

        if ($user) {

            foreach ( $user->getLikedBooks() as $likedBook ){
                if ($likedBook->getId() === $id){
                    $currentUserIsLiked = true;
                    break;
                }
            }
        }

        $scores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Book, 'targetID' => $id ]);
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

        foreach ( $this->entityManager->getRepository(Read::class)->findBy(['Book' => $book]) as $statusItem ){

            $userItem = $statusItem->getUser();

            if ( $user && $userItem->getId() === $user->getId() ){
                $currentUserReadStatus = $statusItem->getStatus();
            }

            $img = $userItem->getImage();

            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $otherUsers[] = [
                'id'        => $userItem->getId(),
                'img'       => $img,
                'username'  => $userItem->getUsername()
            ];
        }

        foreach ( $book->getCategories() as $category ){
            $categories[] = [
                'id' => $category->getId(),
                'name' => $category->getCategory(),
                'nameUS' => $category->getCategoryUS(),
                'slug' => $category->getSlug(),
                'slugEN' => $category->getSlugEN()
            ];
        }

        foreach ( $book->getWriters() as $writer ){
            $writers[] = [
                'id' => $writer->getId(),
                'name' => $writer->getName(),
                'slug' => $writer->getSlug()
            ];
        }

        foreach ( $book->getTranslators() as $translator ){
            $translators[] = [
                'id' => $translator->getId(),
                'name' => $translator->getName(),
                'slug' => $translator->getSlug()
            ];
        }

        $publisher = [
            'id' => $book->getPublisher()->getId(),
            'name' => $book->getPublisher()->getName()
        ];

        $orgBook = !is_null($book->getOriginalBook()) ? $book->getOriginalBook() : $book;
        $bookItems = [$orgBook, ...$this->entityManager->getRepository(Book::class)->findBy(['originalBook' => $orgBook])];

        foreach ( $bookItems as $bookItem ){

            if($bookItem->getId() === $book->getId()){
                continue;
            }

            $img = $bookItem->getImage();

            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $bookScoreObject = $this->entityManager->getRepository(Score::class)->findOneBy(['TargetType' => ScoreEnum::Book, 'targetID' => $bookItem->getId()]);
            $bookScore = 0;

            if ($bookScoreObject) {
                $bookScore = $bookScoreObject->getScore();
            }

            $otherBooks[] = [
                'id' => $bookItem->getId(),
                'img' => $img,
                'slug' => $bookItem->getSlug(),
                'score' => $bookScore
            ];
        }

        $comments = [];

        foreach( $bookItems as $bookItem){

            foreach ( $this->entityManager->getRepository(Comment::class)->findBy(['type' => CommentTypeEnum::Book->value, 'targetID' => $bookItem->getId() ]) as $comment ){

                $subcomments = [];

                if ($comment->getUser()->isDisable()) {
                    continue;
                }
    
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
    
                $date = $comment->getDate();
                if ( $date ){
                    $date = $date->format('Y-m-d');
                }
    
                $currentUserIsLikedThisComment = false;
    
                $currentUser = $this->entityManager->getRepository(User::class)->findOneBy(['token' => str_replace('Bearer ', '', $bearer)]);
    
                if ( $this->entityManager->getRepository(CommentLike::class)->findOneBy(['user' => $currentUser, 'comment' => $comment]) ){
                    $currentUserIsLikedThisComment = true;
                }
    
                $img = $comment->getUser()->getImage();
    
                if ( $img ){
                    $img = $this->imageManager->generateImageURL($img);
                }
                
                $currentBookImage = $bookItem->getImage();
                if ( $currentBookImage ){
                    $currentBookImage = $this->imageManager->generateImageURL($currentBookImage);
                }
                
                $bookItemScores = $this->entityManager->getRepository(Score::class)->findBy(['TargetType' => ScoreEnum::Book, 'targetID' => $bookItem->getId() ]);
                $bookItemScoreCount = count($bookItemScores);
                $bookItemScore = 0;

                foreach ( $bookItemScores as $scoreItem ){
                    $bookItemScore = $bookItemScore + $scoreItem->getScore();
                }
                if ( $bookItemScoreCount > 0 ){
                    $bookItemScore = $bookItemScore / $bookItemScoreCount;
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
                    'name' => $book->getName(),
                    'score' => $bookItemScore,
                    'slug' => $book->getSlug(),
                    'image' => $currentBookImage,
                    'subComments' => $subcomments
                ];
            }
        }

        usort($comments, function($a, $b) {
            return $b['id'] - $a['id']; 
        });

        $response = [
            'id' => $book->getId(),
            'image' => $bookImage,
            'slug' => $book->getSlug(),
            'name' => $book->getName(),
            'page' => $book->getPageNumber(),
            'format' => $book->getFormat(),
            'lang' => $book->getLang(),
            'isbn' => $book->getIsbn(),
            'date' => $date,
            'content' => $book->getContent(),
            'currenstUserLiked' => $currentUserIsLiked,
            'currentUserScore' => $currentUserScore,
            'scoreCount' => !empty($scoreCount) ? $scoreCount : 0,
            'score' => $score,
            'userReadStatus' => $currentUserReadStatus,
            'readersOfThisBook' => $otherUsers,
            'otherBooks' => $otherBooks,
            'categories' => $categories,
            'writers' => $writers,
            'publisher' => $publisher,
            'translators' => $translators,
            'comments' => $comments
        ];

        return new JsonResponse( [ 'status' => true, 'message' => null, 'response' => $response ], 200);
    }

    public function getAllBooksForClient(Request $request){

        $page           = json_decode($request->query->get('page'));
        $pagePerSize    = json_decode($request->query->get('pagePerSize'));
        $search         = $request->query->get('search');
        $orderBy        = $request->query->get('orderBy');
        $sortBy         = $request->query->get('sortBy');
        $optionID       = $request->query->get('optionID');
        $optionType     = $request->query->get('optionType');
        $readQuery      = $request->query->get('readQuery');

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

        $filterQuery = [];

        if ($search !== '') {
            $filterQuery[] = $qb->expr()->orX(
                $qb->expr()->like('LOWER(book.name)', ':searchTermLower'),
                $qb->expr()->like('LOWER(book.orgName)', ':searchTermLower')
            );
        }

        if ($optionID) {
            if ($optionType === 'category') {
                $filterQuery = [...$filterQuery, $qb->expr()->in('category.id', ':categories')];
            } else if ($optionType === 'publisher') {
                $filterQuery = [...$filterQuery, $qb->expr()->in('publisher.id', ':publishers')];
            }
        }

        if ( $readQuery ) {
            $filterQuery = [...$filterQuery, $qb->expr()->eq('read.status', ':readStatuses')];
        }

        $qb->select('book')
            ->from('App\Entity\Book', 'book')
            ->orderBy('book.' . $sortBy, $orderBy);

        if (!empty($filterQuery)) {
            $qb->where(...$filterQuery);
        }

        if ($search !== '') {
            $qb->setParameter('searchTermLower', '%' . strtolower($search) . '%');
        }


        if ($optionID) {
            if ($optionType === 'category') {
                $qb->leftJoin('book.categories', 'category')->setParameter('categories', [$optionID]);
            } else if ($optionType === 'publisher') {
                $qb->leftJoin('book.publisher', 'publisher')->setParameter('publishers', [$optionID]);
            }
        }

        if ( $readQuery ) {
            $qb->leftJoin('book.ReadStatuses', 'read')->andWhere($qb->expr()->eq('read.status', ':readStatuses'))
            ->setParameter('readStatuses', ReadStatusEnum::FinishRead);
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT book.id)')->getQuery()->getSingleScalarResult();

        $lastPage = ceil($filteredCount / $pagePerSize);
        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ( $filteredCount > 0 ) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)->setMaxResults($pagePerSize);
        }

        $bookObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ($bookObjects as $bookObject) {

            if(! $bookObject->isApprove()){
                continue; 
            }

            $img = $bookObject->getImage();
            if ($img) {
                $img = $this->imageManager->generateImageURL($img);
            }
            
            if ( count($bookObject->getWriters()) === 0 ) {
                continue;
            }
            
            $writer = [
                'id'    => $bookObject->getWriters()[0]->getId(),
                'name'  =>  $bookObject->getWriters()[0]->getName(),
                'slug'  => $bookObject->getWriters()[0]->getSlug()
            ];
            $publisher = [
                'id'    => $bookObject->getPublisher()->getId(),
                'name'  =>  $bookObject->getPublisher()->getName(),
                'slug'  => $bookObject->getPublisher()->getSlug()
            ];

            $data[] = [
                'id'        => $bookObject->getId(),
                'name'      => $bookObject->getName(),
                'image'     => $img,
                'score'     => $bookObject->getScore(),
                'viewCount' => $bookObject->getViewCount(),
                'slug'      => $bookObject->getSlug(),
                'writer'    => $writer,
                'publisher' => $publisher
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

        return new JsonResponse(['status' => true, 'message' => 'Kitap bilgileri getirildi', 'response' => $response], 200);
    }

    public function like(Request $request, int $id){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        $book = $this->entityManager->getRepository(Book::class)->find($id);

        if( !$user || !$book ){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı veya kitap', 'response' => null], 401);
        }

        $temp = false;

        foreach( $user->getLikedBooks() as $otherBook ){
            if($otherBook->getId() === $book->getId()){
                $temp = true;
            }
        }

        if(!$temp){
            $user->addLikedBook($book);
        }
        else{
            $user->removeLikedBook($book);
        }
        
        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => null, 'response' => null], 200);
        }
            
        return new JsonResponse(['status' => false, 'message' => 'beğenme işleminde hata oluştu', 'response' => null], 400);
    }

    public function setReadStatus(Request $request, int $bookId){

        $bearer = $request->headers->get('Authorization');

        $user     = (new SelfRequest($this->entityManager))->control($bearer);
        $book     = $this->entityManager->getRepository(Book::class)->find($bookId);
        $payload  = json_decode( $request->getContent() );
        $status   = isset( $payload->status ) ? $payload->status : null;

        if( !$user || !$book || !in_array($status, [ReadStatusEnum::CurrentRead->value, ReadStatusEnum::TargetRead->value, ReadStatusEnum::FinishRead->value ])){
            return new JsonResponse(['status' => false, 'message' => 'Tanımsız Kullanıcı/kitap veya yanlış okuma statüsü', 'response' => null], 401);
        }

        $statusObject = $this->entityManager->getRepository(Read::class)->findOneBy(['User' => $user, 'Book' => $book]);
        
        if(!$statusObject){
            $statusObject = new Read();
            $statusObject->setYear(date('Y'));
        }
        $statusObject->setStatus($status);
        $statusObject->setBook($book);
        $statusObject->setUser($user);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $statusObject );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => '', 'response' => null], 200);
        }
        
        return new JsonResponse(['status' => false, 'message' => 'beğenme işleminde hata oluştu', 'response' => null], 400);
    }

    public function getBooksToAdvert(Request $request){

        $search = $request->query->get('search');

        if (empty($search))
            $search = '';


        $qb = $this->entityManager->createQueryBuilder();

        $qb->select('book')
            ->from('App\Entity\Book', 'book')
            ->setMaxResults(50);

        if ($search !== '') {
            $qb->where(
                $qb->expr()->orX(
                    $qb->expr()->like('LOWER(book.name)', ':searchTermLower'),
                    $qb->expr()->like('LOWER(book.orgName)', ':searchTermLower')
                )
            )->setParameter('searchTermLower', '%' . strtolower($search) . '%');
        }

        $bookObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $bookObjects as $bookObject ){

            $img = $bookObject->getImage();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $data[] = [
                'value' =>  $bookObject->getId(),
                'label' =>  $bookObject->getName(),
                'img'   =>  $img,
            ];
        }

        return new JsonResponse( ['status' => true, 'message' => 'Kitap bilgileri getirildi', 'response' => $data], 200);
    }

}