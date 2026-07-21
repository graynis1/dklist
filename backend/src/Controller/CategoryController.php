<?php

namespace App\Controller;

use App\Entity\Category;
use App\Enums\UserTypeEnum;
use App\Utilities\DirtyController;
use App\Utilities\ImageManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\String\Slugger\AsciiSlugger;

class CategoryController extends AbstractController
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
        $payload    = json_decode( $request->getContent() );
        $category   = isset( $payload->category ) ? $payload->category : null;
        $categoryUS = isset( $payload->categoryUS ) ? $payload->categoryUS : null;

        if( (new DirtyController())->control($category)){
            return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
        }

        if ( is_null($category) ){
            return new JsonResponse( ['status' => false, 'message' => 'Kategori Eksik Gönderildi', 'response' => null], 400);
        }

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( $this->entityManager->getRepository( Category::class )->findOneBy( [ 'category' => $category] )){
            return new JsonResponse( ['status' => false, 'message' => "$category zaten var !", 'response' => null], 400);
        }

        $newCategory = new Category();
        $newCategory->setCategory($category);
        $newCategory->setCategoryUS($categoryUS);
        $newCategory->setSlug($this->slugger->slug($category));
        $newCategory->setSlugEN($this->slugger->slug($categoryUS));

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newCategory );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Kategori Eklendi', 'response' => null ], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-add-2', 'response' => null ], 400);
        }
    }

    public function addMultiple(Request $request){
        $payload    = json_decode( $request->getContent() );
        $categories = isset( $payload->categories ) ? $payload->categories : [];

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( empty($categories) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Kategori bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($categories);

        $fail       = $doAction['fail'];
        $addedItems = $doAction['successItems'];
        $success = count($addedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet kategori başarıyle eklendi, eklenemeyen kategori sayısı : $fail", 'response' => $addedItems ], 200);
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
        $qb ->select('category') ->from('App\Entity\Category', 'category')
            ->orderBy('category.'.$sortBy, $orderBy);

        if ($search !== '') {
            $qb->where( $qb->expr()->like('LOWER(category.category)', ':searchTermLower') )
                ->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT category.id)')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( !$getAll && $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize )
                ->setMaxResults( $pagePerSize );
        }

        $categoryObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ( $categoryObjects as $categoryObject ){
            $data[] = [
                'id'         => $categoryObject->getId(),
                'category'   => $categoryObject->getCategory(),
                'categoryUS' => $categoryObject->getCategoryUS()
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

        return new JsonResponse( ['status' => true, 'message' => 'Kategori bilgileri getirildi', 'response' => $response], 200);
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

        $deleteCategory = $this->entityManager->getRepository(Category::class)->find($id);

        if ( ! $deleteCategory ){
            return new JsonResponse( [ 'status' => false, 'message' => "$id numaralı kategori bulunamadı", 'response' => null ], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $deleteCategory, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Kategori Silindi', 'response' => [ 'deletedCategory' => $deleteCategory->getCategory() ] ], 200);
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

        $payload    = json_decode( $request->getContent() );
        $categories = isset( $payload->categories ) ? $payload->categories : [];

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ] );

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-remove-2';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        if ( empty($categories) ){
            return new JsonResponse( [ 'status' => false, 'message' => 'Silinecek Kategorilerin bilgisi gönderilmedi', 'response' => null ], 400);
        }

        $doAction = $this->multipleAction($categories, 'remove');

        $fail         = $doAction['fail'];
        $deletedItems = $doAction['successItems'];
        $success      = count($deletedItems);

        return new JsonResponse( [ 'status' => true, 'message' => "$success adet kategori başarıyle silindi, silinemeyen kategori sayısı : $fail", 'response' => $deletedItems ], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #CC-delete-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $categoryObject = $this->entityManager->getRepository(Category::class)->find($id);

        if ( is_null($categoryObject) ){
            return new JsonResponse( ['status' => false, 'message' => 'Kategori güncelleştirme işleminde ilgili kategori bulunamadı', 'response' => null], 404);
        }

        $payload    = json_decode( $request->getContent() );
        $newValue   = isset( $payload->newValue ) ? $payload->newValue : null;
        $mode       = isset( $payload->mode )     ? $payload->mode : null;

        if ( empty($newValue) ) 
            return new JsonResponse( ['status' => false, 'message' => 'Kategori güncelleştirme işleminde veri gönderilmedi', 'response' => null], 404);

        if ( $mode === 'tr' )
            $categoryObject->setCategory($newValue);
        else
            $categoryObject->setCategoryUS($newValue);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $categoryObject, 'update');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Kategori güncellendi', 'response' => null], 200);
        }
        else{
            return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #CC-update-1', 'response' => null ], 400);
        }
    }

    private function multipleAction( Array $categories, String $operation = 'add'){

        $result = [
            'fail'         => 0,
            'successItems' => []
        ];

        foreach ( $categories as $category ){

            if ( $operation === 'add' ) {
                $addedCategories = array_map('trim', explode('@', str_replace(array('{', '}'), '', $category)));
                if ( $this->entityManager->getRepository( Category::class )->findOneBy( [ 'category' => $addedCategories[0]] )){
                    $result['fail'] = $result['fail'] + 1;
                    continue;
                }
                $item = new Category();
                $item->setCategory($addedCategories[0]);
                $item->setSlug($this->slugger->slug($addedCategories[0]));
                if (isset($addedCategories[1])) {
                    $item->setCategoryUS($addedCategories[1]);
                    $item->setSlugEN($this->slugger->slug($addedCategories[1]));
                }
            }
            else{
                $item = $this->entityManager->getRepository(Category::class)->findOneBy( [ 'category' => $category] );
                if ( ! $item ) {
                    $result['fail'] = $result['fail'] + 1;
                    continue;
                }
            }


            $ormActionHandler = new OrmActionHandler( $this->entityManager, $item, $operation );

            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                $id         = $item->getId();
                $category   = $item->getCategory();
                $categoryUS = $item->getCategoryUS();
                $result['successItems'][] = [ 'id' => $id, 'category' => $category, 'categoryUS' => $categoryUS ];
            }
            else{
                $result['fail'] = $result['fail'] + 1;
            }
        }
        return $result;
    }

    public function getAllCategoriesForClient( Request $request ){

        $categories = [];

        foreach ($this->entityManager->getRepository(Category::class)->findAll() as $category) {
            
            $bookCount = 0;

            foreach($category->getBooks() as $book){
                if( $book->isApprove() ){
                    $bookCount = $bookCount + 1;
                }
            }


            $categories[] = [
                'id' => $category->getId(),
                'categoryTR' => $category->getCategory(),
                'categoryEN' => $category->getCategoryUS(),
                'slugTR' => $category->getSlug(),
                'slugEN' => $category->getSlugEN(),
                'bookCount' => $bookCount
            ];
        }


        return new JsonResponse( [ 'status' => true, 'message' => '', 'response' => $categories ], 200);

    }
}
