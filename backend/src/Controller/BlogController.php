<?php

namespace App\Controller;

use App\Entity\Blog;
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

class BlogController extends AbstractController
{
   
    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;
    private AsciiSlugger $slugger;
    private \App\Utilities\MyMailer $myMailer;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager, \App\Utilities\MyMailer $myMailer ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
        $this->slugger = new AsciiSlugger();
        $this->myMailer = $myMailer;
    }
    
    public function add(Request $request){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Blogger ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $requestBody = $request->request->all();

        $title          = isset( $requestBody['title'] )   ? $requestBody['title'] : null;
        $preview        = isset( $requestBody['preview'] )   ? $requestBody['preview'] : null;
        $content        = isset( $requestBody['content'] ) ? $requestBody['content'] : null;
        $imgFile        = $request->files->get('img');
        
        if ( empty($title) || empty($content) || empty($imgFile) || empty($preview) ){
            return new JsonResponse( ['status' => false, 'message' => 'Blog önizleme, başlık, içerik ve resim zorunludur!', 'response' => null], 400);
        }

        foreach([$title, $content, $preview] as $text){
            if( (new DirtyController())->control($text)){
                return new JsonResponse( ['status' => false, 'message' => 'Hakaret İçeren İçerik Ekleyemezsiniz', 'response' => null], 400);
            }
        }

        $img = $this->imageManager->saveImage($imgFile);

        if ( is_array($img) ){
            return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
        }

        $newBlog = new Blog();
        $newBlog->setTitle($title);
        $newBlog->setPreview($preview);
        $newBlog->setOwner($permission->user);
        $newBlog->setImage($img);
        $newBlog->setContent($content);
        $newBlog->setCreatedDate(new \DateTime());
        $newBlog->setSlug($this->slugger->slug(substr($title, 0, 30).'/'.$permission->user->getUsername())->lower());
        $newBlog->setApproved(false);
        $newBlog->setViewCount(0);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $newBlog );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $this->imageManager->generateImageURL($img);
            $newBlog->getCreatedDate()->format('Y-m-d');

            $response = [
                'id'            => $newBlog->getId(),
                'title'         => $newBlog->getTitle(),
                'content'       => $newBlog->getContent(),
                'preview'       => $newBlog->getPreview(),
                'createdData'   => $newBlog->getCreatedDate()->format('Y-m-d'),
                'slug'          => $newBlog->getSlug(),
                'user'          => [
                    'id'        => $newBlog->getOwner()->getId(),
                    'username'  => $newBlog->getOwner()->getUsername(),
                    'image'     => $this->imageManager->generateImageURL($newBlog->getOwner()->getImage())
                ],
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Blog Eklendi', 'response' => $response ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #Blog-add-2', 'response' => null ], 400);
    }

    public function delete(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Blogger, UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #BookC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $blog = $this->entityManager->getRepository(Blog::class)->find($id);

        if( !$blog ){
            return new JsonResponse( ['status' => false, 'message' =>'Blog Bulunamadı', 'response' => null], 404);
        }

        $blogOwner = $blog->getOwner();
        if( $blogOwner->getId() !== $permission->user->getId() && $blogOwner->getUserType() !== UserTypeEnum::Blogger->value ){
            return new JsonResponse( ['status' => false, 'message' =>'Yetkisiz silme isteği', 'response' => null], 401);
        }

        $deleteImg = $this->imageManager->deleteImage($blog->getImage());
        if ( ! $deleteImg['status'] ){
            return new JsonResponse( ['status' => false, 'message' =>'Blog resmi silinirken hata oluştu, ilgili blog : '.$blog->getId(), 'response' => null], 401);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $blog, 'remove');

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Blog Silindi', 'response' => null ], 200);
        }
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BlogC-delete-2', 'response' => null ], 400);
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
            $pagePerSize = 10;
        if ( empty( $search ) )
            $search = '';
        if ( empty( $sortBy ) )
            $sortBy = 'id';

        $qb = $this->entityManager->createQueryBuilder();
        $filterQuery = [];
        if ($search !== '') {
            $filterQuery[] = $qb->expr()->orX(
                $qb->expr()->like('LOWER(blog.title)', ':searchTermLower'),
                $qb->expr()->like('LOWER(blog.preview)', ':searchTermLower'),
                $qb->expr()->like('LOWER(blog.content)', ':searchTermLower')
            );
        }
        if ($sortBy !== 'approved') {
            $filterQuery[] = $qb->expr()->eq('blog.approved', ':approvedStatus');
        }
        $qb ->select('blog') ->from('App\Entity\Blog', 'blog')
            ->orderBy('blog.'.$sortBy, $orderBy);

        if (!empty($filterQuery)) {
            $qb->where( ...$filterQuery );
        }
        if ($search !== '') {
            $qb->setParameter('searchTermLower', '%'.strtolower( $search ).'%');
        }
        if ($sortBy !== 'approved') {
            $qb->setParameter('approvedStatus', true);
        }

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT blog.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
        $lastPage = ceil($filteredCount / $pagePerSize);
        if ( $page > $lastPage ){
            $page = $lastPage;
        }

        if ( $filteredCount>0 ){
            $qb ->setFirstResult(( $page - 1 ) *  $pagePerSize ) ->setMaxResults( $pagePerSize );
        }

        $blogObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach( $blogObjects as $blogObject ){

            $ownerUser = $blogObject->getOwner();

            $user = null;

            if( $ownerUser ){ 
                if(!$ownerUser->isMailAuth() || $ownerUser->isDisable()){ continue; }
                $user = [
                    'id'        => $ownerUser->getId(),
                    'username'  => $ownerUser->getUsername(),
                    'image'     => $this->imageManager->generateImageURL($ownerUser->getImage())
                ];
            }

            if( $sortBy !== 'approved' && ! $blogObject->isApproved() ){ continue; }

            $data[] = [
                'id'            => $blogObject->getId(),
                'title'         => $blogObject->getTitle(),
                'preview'       => $blogObject->getPreview(),
                'createdData'   => $blogObject->getCreatedDate()->format('Y-m-d'),
                'slug'          => $blogObject->getSlug(),
                'approved'      => $blogObject->isApproved(),
                'img'           => $this->imageManager->generateImageURL($blogObject->getImage()),
                'user'          => $user,
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

        return new JsonResponse( ['status' => true, 'message' => 'Blog bilgileri getirildi', 'response' => $response], 200);
    }

    public function get(string $slug){

        $blogObject = $this->entityManager->getRepository(Blog::class)->findOneBy(['slug' => $slug]);

        if( !$blogObject ){
            return new JsonResponse( ['status' => false, 'message' =>'Böyle Bir Blog Yok', 'response' => null], 404);
        }

        $ownerUser = $blogObject->getOwner();
        
        $user = null;

        if($ownerUser){
            $user = [
                'id'        => $ownerUser->getId(),
                'username'  => $ownerUser->getUsername(),
                'image'     => $this->imageManager->generateImageURL($ownerUser->getImage())
            ];
        }
        
        $data = [
            'id'            => $blogObject->getId(),
            'title'         => $blogObject->getTitle(),
            'content'       => $blogObject->getContent(),
            'preview'       => $blogObject->getPreview(),
            'createdData'   => $blogObject->getCreatedDate()->format('Y-m-d'),
            'slug'          => $blogObject->getSlug(),
            'img'           => $this->imageManager->generateImageURL($blogObject->getImage()),
            'user'          => $user,
        ];

        return new JsonResponse( ['status' => true, 'message' => 'Blog bilgileri getirildi', 'response' => $data], 200);
    }

    public function getById(Request $request, int $id){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #Blog-getById-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $blogObject = $this->entityManager->getRepository(Blog::class)->find($id);

        if( !$blogObject ){
            return new JsonResponse( ['status' => false, 'message' =>'Böyle Bir Blog Yok', 'response' => null], 404);
        }

        $ownerUser = $blogObject->getOwner();
        
        $user = null;

        if($ownerUser){
            $user = [
                'id'        => $ownerUser->getId(),
                'username'  => $ownerUser->getUsername(),
                'image'     => $this->imageManager->generateImageURL($ownerUser->getImage())
            ];
        }
        
        $data = [
            'id'            => $blogObject->getId(),
            'title'         => $blogObject->getTitle(),
            'content'       => $blogObject->getContent(),
            'preview'       => $blogObject->getPreview(),
            'createdData'   => $blogObject->getCreatedDate()->format('Y-m-d'),
            'slug'          => $blogObject->getSlug(),
            'approved'      => $blogObject->isApproved(),
            'img'           => $this->imageManager->generateImageURL($blogObject->getImage()),
            'user'          => $user,
        ];

        return new JsonResponse( ['status' => true, 'message' => 'Blog bilgileri getirildi', 'response' => $data], 200);
    }

    public function update( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Blogger ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #Blog-update-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $blog = $this->entityManager->getRepository(Blog::class)->find($id);

        if ( ! $blog ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen kitap bulunamadı' , 'response' => null], 404);
        }

        $requestBody = $request->request->all();
        $preview = isset( $requestBody['preview'] ) ? $requestBody['preview'] : null;
        $title = isset( $requestBody['title'] ) ? $requestBody['title'] : null;
        $content = isset( $requestBody['content'] ) ? $requestBody['content'] : null;
        $image = $request->files->get('image');

        if( !$preview || !$title || !$content ){
            return new JsonResponse( ['status' => false, 'message' => 'Başlık, içerik veya önizleme gönderilmedi' , 'response' => null], 400);
        }

        $blog->setSlug($this->slugger->slug(substr($title, 0, 30).'/'.$blog->getOwner()->getUsername())->lower());
        $blog->setTitle($title);
        $blog->setContent($content);
        $blog->setPreview($preview);
        // Onay durumunu koru - sadece içerik değişikliği varsa tekrar onaya gönder
        // Şimdilik onay durumunu koruyoruz

        if($image){
            $oldImage = $blog->getImage();
            if ( $oldImage ){
                $deleteImg = $this->imageManager->deleteImage($oldImage);
                if ( $deleteImg['status'] === true ){
                    $newImage = $this->imageManager->saveImage($image);
                    if ( is_array($newImage) ){
                        return new JsonResponse( ['status' => false, 'message' => $newImage['errorMessage'], 'response' => null], 400);
                    }
                    $blog->setImage($newImage);
                }
            }
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $blog );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            $img = $blog->getImage();
            if ( $img ){
                $img = $this->imageManager->generateImageURL($img);
            }

            $ownerUser = $blog->getOwner();
        
            $user = null;
    
            if($ownerUser){
                $user = [
                    'id'        => $ownerUser->getId(),
                    'username'  => $ownerUser->getUsername(),
                    'image'     => $this->imageManager->generateImageURL($ownerUser->getImage())
                ];
            }

            $response = [
                'id'            => $blog->getId(),
                'title'         => $blog->getTitle(),
                'preview'       => $blog->getPreview(),
                'content'       => $blog->getContent(),
                'createdData'   => $blog->getCreatedDate()->format('Y-m-d'),
                'slug'          => $blog->getSlug(),
                'img'           => $this->imageManager->generateImageURL($blog->getImage()),
                'user'          => $user,
            ];

            return new JsonResponse( [ 'status' => true, 'message' => 'Blog Güncellendi', 'response' => $response  ], 200);
        }
        
        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #WC-update-2', 'response' => null ], 400);
    }

    public function setApproveBlog( Request $request, int $id ){

        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #Blog-update-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $blog = $this->entityManager->getRepository(Blog::class)->find($id);

        if ( ! $blog ){
            return new JsonResponse( ['status' => false, 'message' => 'İşlem yapılmak istenen kitap bulunamadı' , 'response' => null], 404);
        }

        $payload   = json_decode( $request->getContent() );
        $selected  = isset( $payload->selected ) ? $payload->selected : null;

        if( !$selected || ($selected !== 'approve' && $selected !== 'reject') ) {
            return new JsonResponse( ['status' => false, 'message' => 'Eksik veya yanlış veri gönderildi' , 'response' => null], 403);
        }

        $isApproved = $selected === 'approve';
        $blog->setApproved($isApproved);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $blog );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            
            // Mail gönder
            try {
                $ownerUser = $blog->getOwner();
                if ($ownerUser && $ownerUser->getMail()) {
                    $subject = $isApproved ? 'Blog Onaylandı - DK List' : 'Blog Reddedildi - DK List';
                    $mailContent = [
                        'status' => $isApproved ? 'approved' : 'rejected',
                        'username' => $ownerUser->getUsername(),
                        'blogTitle' => $blog->getTitle(),
                        'blogSlug' => $blog->getSlug()
                    ];
                    
                    $this->myMailer->sendMail(
                        $ownerUser->getMail(),
                        $subject,
                        $mailContent,
                        3 // Yeni template
                    );
                }
            } catch (\Exception $e) {
                // Mail gönderme hatası olursa log'la ama işlemi durdurma
                error_log('Blog onay maili gönderilemedi: ' . $e->getMessage());
            }
            
            return new JsonResponse( [ 'status' => true, 'message' => 'Blog güncellendi', 'response' => null ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #Blog-add-2', 'response' => null ], 400);

    }
}