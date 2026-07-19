<?php

namespace App\Controller;

use App\Utilities\ImageManager;
use App\Utilities\Permission;
use App\Enums\UserTypeEnum;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;


class ImageController extends AbstractController
{

    private ImageManager $imageManager;
    private EntityManagerInterface $entityManager;

    public function __construct( ImageManager $imageManager, EntityManagerInterface $entityManager ) {
        $this->imageManager = $imageManager;
        $this->entityManager = $entityManager;
    }

    public function getImage( String $imageName ){
        try {
            return new BinaryFileResponse($this->imageManager->getImagePath($imageName));
        }
        catch(\Exception $error){
            return new JsonResponse(['error' => true, 'errorMessage' => $error->getMessage()]);
        }
    }

    public function uploadImage(Request $request){
        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Blogger, UserTypeEnum::Admin]);

        if ($permission->error === true) {
            return new JsonResponse(['status' => false, 'message' => 'Yetkisiz erişim'], 401);
        }

        $imageFile = $request->files->get('image');
        
        if (!$imageFile) {
            return new JsonResponse(['status' => false, 'message' => 'Resim dosyası bulunamadı'], 400);
        }

        $savedImage = $this->imageManager->saveImage($imageFile);

        if (is_array($savedImage)) {
            return new JsonResponse(['status' => false, 'message' => $savedImage['errorMessage']], 400);
        }

        $imageUrl = $this->imageManager->generateImageURL($savedImage);

        return new JsonResponse([
            'status' => true, 
            'message' => 'Resim başarıyla yüklendi',
            'imageUrl' => $imageUrl
        ], 200);
    }
}
