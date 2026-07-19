<?php

namespace App\Controller;

use App\Entity\Blog;
use App\Entity\Book;
use App\Entity\Follow;
use App\Entity\LibraryBook;
use App\Entity\Read;
use App\Entity\ReadPurpose;
use App\Entity\Store;
use App\Entity\StorePicture;
use App\Entity\Translator;
use App\Entity\User;
use App\Entity\Writer;
use App\Enums\ReadStatusEnum;
use App\Utilities\ImageManager;
use App\Utilities\NotifyManager;
use App\Utilities\OrmActionHandler;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ProfileController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private ImageManager $imageManager;

    public function __construct( EntityManagerInterface $entityManager, ImageManager $imageManager ){
        $this->entityManager = $entityManager;
        $this->imageManager  = $imageManager;
    }

    public function getProfile(Request $request, int $id){
        try {
        $bearer     = $request->headers->get('Authorization');
        $currentUser = (new SelfRequest($this->entityManager))->control($bearer);

        $user = $this->entityManager->getRepository(User::class)->find($id);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

            // Test with badges
        $badges = [];
            try {
        foreach( $user->getBadges() as $badge ){
            $badges[] = [
                'id'        => $badge->getId(),
                'name'      => $badge->getName(),
                'nameUS'    => $badge->getNameUS(),
                'comment'   => $badge->getComment(),
                'commentUS' => $badge->getCommentUS(),
                'image'     => $this->imageManager->generateImageURL($badge->getImg()),
            ];
        }
            } catch (\Exception $e) {
                $badges = [];
            }

            // Test followers & liked arrays
            $followers = [];
            $follow = [];
            $liked = ['writers' => [], 'translators' => []];
            
            try {
                foreach ($this->entityManager->getRepository(Follow::class)->findBy(['followed' => $user]) as $follower) {
                    $followers[] = [
                        'id'        => $follower->getFollower()->getId(),
                        'username'  => $follower->getFollower()->getUsername(),
                        'image'     => $this->imageManager->generateImageURL($follower->getFollower()->getImage()),
                    ];
                }
            } catch (\Exception $e) {
                $followers = [];
            }

            try {
                foreach ($this->entityManager->getRepository(Follow::class)->findBy(['follower' => $user]) as $followedUser) {
                    $follow[] = [
                        'id'        => $followedUser->getFollowed()->getId(),
                        'username'  => $followedUser->getFollowed()->getUsername(),
                        'image'     => $this->imageManager->generateImageURL($followedUser->getFollowed()->getImage()),
        ];
                }
            } catch (\Exception $e) {
                $follow = [];
            }

            try {
        foreach( $user->getLikedWriters() as $writer ){
            $liked['writers'][] = [
                'id'    => $writer->getId(),
                'name'  => $writer->getName(),
                'image' => $this->imageManager->generateImageURL($writer->getImg()),
                'slug'  => $writer->getSlug()
            ];
                }
            } catch (\Exception $e) {
                $liked['writers'] = [];
        }

            try {
        foreach( $user->getLikedTranslators() as $translator ){
            $liked['translators'][] = [
                'id'    => $translator->getId(),
                'name'  => $translator->getName(),
                'image' => $this->imageManager->generateImageURL($translator->getImg()),
                'slug'  => $translator->getSlug()
            ];
        }
            } catch (\Exception $e) {
                $liked['translators'] = [];
        }

            // Test library array
        $library = [];
            try {
        foreach ($user->getUserLibraryBook() as $libraryObject) {
            $library[] = [
                'id'    => $libraryObject->getBook()->getId(),
                'name'  => $libraryObject->getBook()->getName(),
                'slug'  => $libraryObject->getBook()->getSlug(),
                'image' => $this->imageManager->generateImageURL($libraryObject->getBook()->getImage()),
            ];
                }
            } catch (\Exception $e) {
                $library = [];
        }
        
            // Test read arrays  
        $read = [
            'readdedList'           => [],
            'currentlyReadingList'  => [],
            'futureReadingList'     => [],
            'readTarget'            => 0,
            'oldReadedList'         => [],
        ];
     
            try {
                $purpose = $this->entityManager->getRepository(ReadPurpose::class)->findOneBy(['owner' => $user, 'year' => date('Y')]);
        if($purpose){
            $read['readTarget'] = $purpose->getPurposeCount();
        }
            } catch (\Exception $e) {
                $read['readTarget'] = 0;
            }

            // Test store arrays (RISKY!)
            $store = [];
            try {
                foreach( $this->entityManager->getRepository(Store::class)->findBy(['owner' => $user]) as $storeObject ){
                    $storePictures = $this->entityManager->getRepository(StorePicture::class)->findBy(['advert' => $storeObject]);
                    $storeImage = null;
                    if (!empty($storePictures)) {
                        $storeImage = $this->imageManager->generateImageURL($storePictures[0]->getImageName());
            }
                    
            $store[] = [
                'id'    => $storeObject->getId(),
                'title' => $storeObject->getTitle(),
                'slug'  => $storeObject->getSlug(),
                        'image' => $storeImage,
            ];
        }
            } catch (\Exception $e) {
                $store = [];
        }

            // Test blogs array
        $blogs = [];
            try {
        foreach( $this->entityManager->getRepository(Blog::class)->findBy(['owner' => $user]) as $blogObject ){
            if( !$blogObject->isApproved() ){ continue; }
            $blogs[] = [
                'id' => $blogObject->getId(),
                'title' => $blogObject->getTitle(),
                'slug' => $blogObject->getSlug(),
                'image' => $this->imageManager->generateImageURL($blogObject->getImage())
            ];
                }
            } catch (\Exception $e) {
                $blogs = [];
        }

            // Minimal response - check if basic user info works
        $response = [
                'username' => $user->getUsername(),
                'name'     => $user->getName(),
                'surname'  => $user->getSurname(),
                'biyo'     => $user->getBiyo(),
                'image'    => $this->imageManager->generateImageURL($user->getImage()),
                'livingCity' => $user->getLivingCity(),
                'sex'      => $user->getSex(),
                'edu'      => $user->getEdu(),
                'job'      => $user->getJob(),
                'birthPlace' => $user->getBirthPlace(),
                'birthDate' => $user->getBirthDate() ? $user->getBirthDate()->format('Y-m-d') : null,
                'password'  => $user->getPassword(),
                'createdDate' => $user->getCreatedDate()->format('Y-m-d H:i:s'),
                'badges'   => $badges,
                'followers' => $followers,
                'follow'   => $follow,
                'liked'    => $liked,
                'library'  => $library,
                'read'     => $read,
                'store'    => $store,
                'blogs'    => $blogs
        ];

            return new JsonResponse(['status' => true, 'message' => 'Minimal Profil Bilgileri', 'response' => $response], 200);
            
        } catch (\Exception $e) {
            return new JsonResponse(['status' => false, 'message' => 'Profil yükleme hatası: ' . $e->getMessage(), 'response' => null], 500);
        }
    }

    public function updatePicture(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        $imgFile = $request->files->get('img');
        $img = null;
        if ( $imgFile ){
            $img = $this->imageManager->saveImage($imgFile);
            if ( is_array($img) ){
                return new JsonResponse( ['status' => false, 'message' => $img['errorMessage'], 'response' => null], 400);
            }
        }

        $user->setImage($img);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Resim Güncellendi', 'response' => $this->imageManager->generateImageURL($img) ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
    }

    public function followSwitcher(Request $request, int $targetID){

        $bearer        = $request->headers->get('Authorization');
        $currentUser   = (new SelfRequest($this->entityManager))->control($bearer);
        $targetUser    = $this->entityManager->getRepository(User::class)->find($targetID);

        $message = '';

        if( !$currentUser || !$targetUser || ($currentUser->getId() === $targetUser->getId()) ){
            return new JsonResponse( ['status' => false, 'message' => 'Kullanıcılardan biri - ikisi bulunamadı veya aynı kullanıcılar', 'response' => null], 404);
        }

        $followObject = $this->entityManager->getRepository(Follow::class)->findOneBy(['follower' => $currentUser, 'followed' => $targetUser]);

        if(!$followObject){

            $followObject = new Follow();
            $followObject->setFollowed($targetUser);
            $followObject->setFollower($currentUser);
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $followObject );
            if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => [ 'id' => $targetUser->getId(), 'username' => $targetUser->getUsername(), 'image' => $this->imageManager->generateImageURL($targetUser->getImage()) ] ], 400);
            }

            $username = $currentUser->getUsername();
            $messageTR = '" '.$username.' " sizi takip etmeye başladı';
            $messageUS = '"' . $username . '" started following you';

            $notify = (new NotifyManager($this->entityManager))->addNotification( $targetUser, $currentUser, $messageTR, $messageUS );

            if( !$notify['status'] ){
                $message = $message.'Takip etme işleminde bildiri eklenirken hata oluştu : '.$notify['message'];
            }

        }
        else{
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $followObject, 'remove');
            if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
            }
        }

        return new JsonResponse( [ 'status' => true, 'message' => $message, 'response' => true ], 200);
    }

    public function setReadPurpose(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

        $payload = json_decode( $request->getContent() );
        $count   = isset( $payload->count )  ? $payload->count  : null;
        $currentYear = date('Y');
        
        $purposeObject = $this->entityManager->getRepository(ReadPurpose::class)->findOneBy([ 'owner' => $user, 'year' => $currentYear ]);

        if( $purposeObject ){
            $purposeObject->setPurposeCount($count);
        }
        else{
            $purposeObject = new ReadPurpose();
            $purposeObject->setYear($currentYear);
            $purposeObject->setPurposeCount($count);
            $purposeObject->setOwner($user);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $purposeObject );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Okuma hedefi Güncellendi', 'response' => null ], 200);
        }

        return new JsonResponse( ['status' => false, 'message' => $ormActionHandler->errorMessage, 'response' => null], 404);
    }

    public function deleteOtherUserFollow(Request $request, int $id){

        $bearer        = $request->headers->get('Authorization');
        $currentUser   = (new SelfRequest($this->entityManager))->control($bearer);
        
        $otherUser     = $this->entityManager->getRepository(User::class)->find($id);


        if( !$currentUser || !$otherUser ){
            return new JsonResponse( ['status' => false, 'message' => 'Kullanıcılardan biri veya ikisi bulunamadı', 'response' => null], 404);
        }


        $followObject = $this->entityManager->getRepository(Follow::class)->findOneBy(['follower' => $otherUser, 'followed' => $currentUser]);

        if(!$followObject){
            return new JsonResponse( [ 'status' => false, 'message' => 'Böyle bir ilişki yok', 'response' => null ], 404);
        }
        else{
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $followObject, 'remove');
            if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
            }
        }

        return new JsonResponse( [ 'status' => true, 'message' => null, 'response' => true ], 200);
    }

    public function getAllBooksForLibrary(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if ( !$user ) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

        $addedBookIDS = [];

        foreach( $this->entityManager->getRepository(LibraryBook::class)->findBy(['owner' => $user]) as $libraryObject ){
            $addedBookIDS[] = $libraryObject->getBook()->getId();
        }

        $books = [];

        foreach( $this->entityManager->getRepository(Book::class)->findAll() as $book ){

            if(in_array($book->getId(), $addedBookIDS)){
                continue;
            }

            $books[] = [
                'value' => $book->getId(),
                'label' => $book->getName()
            ];
        }


        return new JsonResponse( ['status' => true, 'message' => 'Kitaplar Getirildi', 'response' => $books ], 200);
    }

    public function bookSwitchLibrary(Request $request, int $id){

        
        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);
        $book   = $this->entityManager->getRepository(Book::class)->find($id);

        if (!$user || !$book) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı veya kitap yok', 'response' => null], 404);
        }

        $libraryObject = $this->entityManager->getRepository(LibraryBook::class)->findOneBy(['book' => $book, 'owner' => $user]);
        $response = null;

        if(!$libraryObject){
            $libraryObject = new LibraryBook();
            $libraryObject->setOwner($user);
            $libraryObject->setBook($book);
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $libraryObject );
            if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
            }

            $response = [
                'id'    => $book->getId(),
                'name'  => $book->getName(),
                'slug'  => $book->getSlug(),
                'image' => $this->imageManager->generateImageURL($book->getImage()),
            ];
        }
        else{
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $libraryObject, 'remove');
            if ( !($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) ){
                return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #BookC-add-2', 'response' => null ], 400);
            }
        }

        return new JsonResponse( [ 'status' => true, 'message' => '', 'response' => $response ], 200);

    }

    public function unlike(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if ( !$user ) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

        $payload = json_decode( $request->getContent() );
        $id      = isset( $payload->id )    ? $payload->id  : null;
        $type    = isset( $payload->type )  ? $payload->type  : null;
        
        switch($type){
            case 'translator':
                $item = $this->entityManager->getRepository(Translator::class)->find( $id );
                if($item){
                    $user->removeLikedTranslator($item);
                }
                break;
            case 'writer':
                $item = $this->entityManager->getRepository(Writer::class)->find( $id );
                if($item){
                    $user->removeLikedWriter($item);
                }
                break;
            default:
                return new JsonResponse( ['status' => false, 'message' => 'Yanlış tip gönderildi', 'response' => null], 400);
                break;
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $item );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( ['status' => true, 'message' => 'Beğeni kaldırıldı', 'response' => $item->getId() ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #ProfileController-unlike', 'response' => null ], 400);
    }

    public function editProfile(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Yetkisiz erişim isteği', 'response' => null], 404);
        }

        $payload = json_decode( $request->getContent() );

        $password     = isset( $payload->password )   ? $payload->password    : null;
        $name         = isset( $payload->name )       ? $payload->name        : null;
        $surname      = isset( $payload->surname )    ? $payload->surname     : null;
        $sex          = isset( $payload->sex )        ? $payload->sex         : null;
        $birthdate    = isset( $payload->birthdate )  ? $payload->birthdate   : null;


        if ( !$sex || !$birthdate || !$surname || !$name || !$password ) {
            $ifade = !$sex ? 'sex' : ( !$birthdate ? 'birthdate' : ( !$surname ? 'surname' : ( !$name ? 'name' : 'password')));
            return new JsonResponse( ['status' => false, 'message' => 'Cinsiyet, doğum tarihi, şifre, isim veya soy isim eksik olamaz! '.$ifade, 'response' => null], 400);
        }

        $birthPlace   = isset( $payload->birthPlace ) ? $payload->birthPlace  : null;
        $livingCity   = isset( $payload->livingCity ) ? $payload->livingCity  : null;
        $biyo         = isset( $payload->biyo )       ? $payload->biyo        : null;
        $edu          = isset( $payload->edu )        ? $payload->edu         : null;
        $job          = isset( $payload->job )        ? $payload->job         : null;

        if($birthPlace){
            $user->setBirthPlace($birthPlace) ;
        }
        if($livingCity){
            $user->setLivingCity($livingCity) ;
        }
        if($biyo){
            $user->setBiyo($biyo) ;
        }
        if($edu){
            $user->setEdu($edu) ;
        }
        if($job){
            $user->setJob($job) ;
        }
        
        $birthDateObj = \DateTime::createFromFormat('Y-m-d', $birthdate);

        $user->setPassword($password);
        $user->setBirthDate($birthDateObj);
        $user->setName($name);
        $user->setSurname($surname);
        $user->setSex($sex);

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $user );

        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse( [ 'status' => true, 'message' => 'Profil Güncellendi', 'response' => null ], 200);
        }

        return new JsonResponse( [ 'status' => false, 'message' => $ormActionHandler->errorMessage.' #ProfileSet', 'response' => null ], 400);
    }

    public function shareReadingGoal(Request $request){

        $bearer = $request->headers->get('Authorization');
        $user   = (new SelfRequest($this->entityManager))->control($bearer);

        if (!$user) {
            return new JsonResponse( ['status' => false, 'message' => 'Böyle bir kullanıcı yok', 'response' => null], 404);
        }

        $payload = json_decode( $request->getContent() );
        $year    = isset( $payload->year )  ? $payload->year  : date('Y');
        
        // İstatistikleri al
        $purposeObject = $this->entityManager->getRepository(ReadPurpose::class)->findOneBy([ 'owner' => $user, 'year' => $year ]);
        
        if (!$purposeObject) {
            return new JsonResponse( ['status' => false, 'message' => 'Bu yıl için okuma hedefi bulunamadı', 'response' => null], 404);
        }

        $readCount = 0;
        foreach ($this->entityManager->getRepository(Read::class)->findBy(['User' => $user, 'year' => $year ]) as $readObject ) {
            if( $readObject->getStatus() === ReadStatusEnum::FinishRead->value ){
                $readCount += 1;
            }
        }

        $percentage = $purposeObject->getPurposeCount() > 0 ? ($readCount / $purposeObject->getPurposeCount()) * 100 : 0;

        $shareData = [
            'year' => $year,
            'target' => $purposeObject->getPurposeCount(),
            'read' => $readCount,
            'percentage' => round($percentage, 1),
            'username' => $user->getUsername(),
            'shareText' => "{$year} yılında {$purposeObject->getPurposeCount()} kitap okuma hedefim var! Şu ana kadar {$readCount} kitap okudum (%".round($percentage, 1)."). Sen de okuma hedefini belirle! 📚 #OkumaHedefi #DKList"
        ];

        return new JsonResponse( [ 'status' => true, 'message' => 'Paylaşım verisi hazırlandı', 'response' => $shareData ], 200);
    }
}