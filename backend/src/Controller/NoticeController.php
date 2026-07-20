<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Entity\Notice;
use App\Entity\SubComment;
use App\Entity\User;
use App\Enums\UserTypeEnum;
use App\Utilities\OrmActionHandler;
use App\Utilities\Permission;
use App\Utilities\SelfRequest;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class NoticeController extends AbstractController
{
    private EntityManagerInterface $entityManager;

    public function __construct( EntityManagerInterface $entityManager ){
        $this->entityManager = $entityManager;
    }

    public function add(Request $request){

        $bearer = $request->headers->get('Authorization');

        $user = (new SelfRequest($this->entityManager))->control($bearer);
        
        $payload     = json_decode( $request->getContent() );
        $commentID   = isset( $payload->commentID ) ? $payload->commentID : null;
        $type = isset( $payload->type ) ? $payload->type : null;
        
        if(!$user || !$commentID || !$type){
            return new JsonResponse( ['status' => false, 'message' => 'Token, commentID veya type eksik', 'response' => null], 400);
        }

        $comment = $this->entityManager->getRepository($type === 'comment' ? Comment::class : SubComment::class)->find($commentID);

        if ( !$comment ) {
            return new JsonResponse( ['status' => false, 'message' => "$commentID id'li yorum bulunamadı", 'response' => null], 404);
        }

        $targetUser = $comment->getUser();
        $message = '';

        if(!($targetUser->getUserType() === UserTypeEnum::Admin->value || $targetUser->getUserType() === UserTypeEnum::SuperAdmin->value)){
            
            $noticeObject = new Notice();
            $noticeObject->setCommentID($commentID);
            $noticeObject->setType($type);
            $noticeObject->setReporterUser($user);
            $noticeObject->setReportedUser($targetUser);
            $noticeObject->setCreatedAt(new \DateTime());
            $noticeObject->setIsResolved(false);
            
            $ormActionHandler = new OrmActionHandler( $this->entityManager, $noticeObject );
    
            if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
                return new JsonResponse(['status' => true, 'message' => 'Şikayet Eklendi', 'response' => null], 200);
            }

            $message = $ormActionHandler->errorMessage;
        }



        return new JsonResponse( ['status' => false, 'message' => 'Bir hata oluştu : '.$message, 'response' => null], 400);
    }

    /**
     * Report a user from their profile page
     * @Route("/api/report/profile", name="api_report_profile", methods={"POST"})
     */
    public function reportUser(Request $request): JsonResponse
    {
        $bearer = $request->headers->get('Authorization');
        $user = (new SelfRequest($this->entityManager))->control($bearer);
        
        $payload = json_decode($request->getContent(), true);
        $reportedUserId = $payload['reportedUserId'] ?? null;
        $reportContent = $payload['reportContent'] ?? null;
        $reportType = $payload['reportType'] ?? null;
        
        if(!$user || !$reportedUserId || empty($reportContent) || empty($reportType)){
            return new JsonResponse(['status' => false, 'message' => 'Eksik veri: Token, kullanıcı ID, içerik veya tip eksik.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $reportedUser = $this->entityManager->getRepository(User::class)->find($reportedUserId);
        
        if(!$reportedUser){
            return new JsonResponse(['status' => false, 'message' => 'Şikayet edilecek kullanıcı bulunamadı.'], JsonResponse::HTTP_NOT_FOUND);
        }

        if($user->getId() === $reportedUser->getId()){
            return new JsonResponse(['status' => false, 'message' => 'Kendinizi şikayet edemezsiniz.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Check if admin/superadmin
        if($reportedUser->getUserType() === UserTypeEnum::Admin->value || $reportedUser->getUserType() === UserTypeEnum::SuperAdmin->value){
            return new JsonResponse(['status' => false, 'message' => 'Admin kullanıcıları şikayet edilemez.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Check if already reported recently (within 24 hours)
        $yesterday = new \DateTime('-24 hours');
        $existingReport = $this->entityManager->getRepository(Notice::class)->findOneBy([
            'reporterUser' => $user,
            'reportedUser' => $reportedUser,
            'type' => $reportType
        ]);

        if($existingReport && $existingReport->getCreatedAt() > $yesterday){
            return new JsonResponse(['status' => false, 'message' => 'Bu kullanıcıyı bu tipte bir şikayetle son 24 saat içinde zaten şikayet ettiniz.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $noticeObject = new Notice();
        $noticeObject->setType($reportType);
        $noticeObject->setReporterUser($user);
        $noticeObject->setReportedUser($reportedUser);
        $noticeObject->setReason($reportContent);
        $noticeObject->setCreatedAt(new \DateTime());
        $noticeObject->setIsResolved(false);
        
        $ormActionHandler = new OrmActionHandler($this->entityManager, $noticeObject);

        if($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)){
            // Send notification to moderators
            $this->notifyModerators($reportedUser, $user, $reportContent);
            
            return new JsonResponse(['status' => true, 'message' => 'Şikayet başarıyla gönderildi.', 'response' => null], 200);
        }

        return new JsonResponse(['status' => false, 'message' => 'Şikayet gönderilirken bir hata oluştu: ' . ($ormActionHandler->errorMessage ?? $ormActionHandler->error ?? 'Bilinmeyen Hata')], 400);
    }

    /**
     * Notify moderators about user report
     */
    private function notifyModerators(User $reportedUser, User $reporterUser, string $reason){
        // Get all moderators and admins
        $moderators = $this->entityManager->getRepository(User::class)->createQueryBuilder('u')
            ->where('u.userType IN (:types)')
            ->setParameter('types', [UserTypeEnum::Mod->value, UserTypeEnum::Admin->value, UserTypeEnum::SuperAdmin->value])
            ->getQuery()
            ->getResult();

        foreach($moderators as $moderator){
            $notification = new \App\Entity\DKNotifiaction();
            $notification->setOwnerUser($moderator);
            $notification->setSenderUser($reporterUser);
            $notification->setCommentTR("Kullanıcı şikayeti: {$reporterUser->getUsername()}, {$reportedUser->getUsername()} kullanıcısını şikayet etti. Sebep: {$reason}");
            $notification->setCommentUS("User report: {$reporterUser->getUsername()} reported {$reportedUser->getUsername()}. Reason: {$reason}");
            $notification->setView(false);
            
            new OrmActionHandler($this->entityManager, $notification);
        }
    }

    public function getAll(Request $request){

        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Mod, UserTypeEnum::Admin]);

        if ($permission->error === true) {
            $message = 'Bir hata oluştu, hata kodu #NoticeC-getAll-1';
            if (in_array($permission->errorCode, [1, 2, 3, 4])) {
                $message = $permission->errorMessage;
            }
            return new JsonResponse(['status' => false, 'message' => $message, 'response' => null], 401);
        }

        $page = json_decode($request->query->get('page'));
        $pagePerSize = json_decode($request->query->get('pagePerSize'));
        $type = $request->query->get('type'); // 'comment', 'user_report', or 'all'
        
        if (empty($page) || $page < 0)
            $page = 1;
        if (empty($pagePerSize) || $pagePerSize < 0 || $pagePerSize > 100)
            $pagePerSize = 40;
        if (empty($type))
            $type = 'all';

        $qb = $this->entityManager->createQueryBuilder();
        $qb->select('notice')->from('App\Entity\Notice', 'notice');

        if ($type !== 'all') {
            if ($type === 'comment') {
                $qb->where('notice.type IN (:types)')
                   ->setParameter('types', ['comment', 'subComment']);
            } else {
                $qb->where('notice.type = :type')
                   ->setParameter('type', $type);
            }
        }

        $qb->orderBy('notice.createdAt', 'DESC');

        $filteredCount = (int) (clone $qb)->select('COUNT(DISTINCT notice.id)')->getQuery()->getSingleScalarResult();

        $lastPage = ceil($filteredCount / $pagePerSize);

        if ($page > $lastPage) {
            $page = $lastPage;
        }

        if ($filteredCount > 0) {
            $qb->setFirstResult(($page - 1) * $pagePerSize)
                ->setMaxResults($pagePerSize);
        }

        $noticeObjects = $qb->getQuery()->getResult();

        $data = [];

        foreach ($noticeObjects as $noticeObject) {
            $noticeType = $noticeObject->getType();
            
            if ($noticeType === 'user_report') {
                // User report
                $reportedUser = $noticeObject->getReportedUser();
                $reporterUser = $noticeObject->getReporterUser();
                
                if (!$reportedUser || !$reporterUser) {
                    continue;
                }

                $data[] = [
                    'id' => $noticeObject->getId(),
                    'type' => 'user_report',
                    'reason' => $noticeObject->getReason(),
                    'createdAt' => $noticeObject->getCreatedAt()->format('Y-m-d H:i:s'),
                    'isResolved' => $noticeObject->isResolved(),
                    'reportedUser' => [
                        'id' => $reportedUser->getId(),
                        'username' => $reportedUser->getUsername(),
                        'disable' => $reportedUser->isDisable(),
                        'userType' => $reportedUser->getUserType()
                    ],
                    'reporterUser' => [
                        'id' => $reporterUser->getId(),
                        'username' => $reporterUser->getUsername()
                    ]
                ];
            } else {
                // Comment report
                $comment = $this->entityManager->getRepository($noticeType === 'comment' ? Comment::class : SubComment::class)->find($noticeObject->getCommentID());

                if (!$comment) {
                continue;
            }

            $commentOwner = $comment->getUser();

                if (!$commentOwner) {
                continue;
            }

            $data[] = [
                'id' => $noticeObject->getId(),
                    'type' => $noticeType,
                    'createdAt' => $noticeObject->getCreatedAt() ? $noticeObject->getCreatedAt()->format('Y-m-d H:i:s') : null,
                    'isResolved' => $noticeObject->isResolved(),
                'commentDatas' => [
                    'comment' => $comment->getComment(),
                        'id' => $comment->getId()
                ],
                'user' => [
                    'id' => $commentOwner->getId(),
                    'disable' => $commentOwner->isDisable(),
                    'username' => $commentOwner->getUsername()
                ]
            ];
            }
        }

        $meta = [
            'page' => $page,
            'firstPage' => $lastPage > 1 ? 1 : 0,
            'lastPage' => $lastPage,
            'pagePerSize' => $pagePerSize,
            'filteredCount' => $filteredCount,
            'viewCount' => count($data),
        ];

        $response = ['meta' => $meta, 'data' => $data];

        return new JsonResponse(['status' => true, 'message' => 'Şikayet bilgileri getirildi', 'response' => $response], 200);
    }

    public function delete(Request $request, int $id){
        
        $bearer     = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [ UserTypeEnum::Admin, UserTypeEnum::Mod ]);

        if ( $permission->error === true ){
            $message = 'Bir hata oluştu, hata kodu #NoticeC-add-1';
            if ( in_array($permission->errorCode, [1, 2, 3, 4]) ){
                $message = $permission->errorMessage;
            }
            return new JsonResponse( ['status' => false, 'message' =>$message, 'response' => null], 401);
        }

        $notice = $this->entityManager->getRepository(Notice::class)->find($id);

        if ( !$notice ) {
            return new JsonResponse( ['status' => false, 'message' => "$id id'li şikayet bulunamadı", 'response' => null], 404);
        }

        $ormActionHandler = new OrmActionHandler( $this->entityManager, $notice, 'remove' );
        
        if ( $ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage) ){
            return new JsonResponse(['status' => true, 'message' => 'Şikayet Silindi', 'response' => null], 200);
        }

        return new JsonResponse( ['status' => false, 'message' => 'Şikayet Silinmeye Çalışılırken Bir hata oluştu', 'response' => null], 400);
    }

    /**
     * Mark a notice as resolved
     */
    public function resolve(Request $request, int $id){
        $bearer = $request->headers->get('Authorization');
        $permission = new Permission($bearer, $this->entityManager, [UserTypeEnum::Admin, UserTypeEnum::Mod]);

        if ($permission->error === true) {
            $message = 'Bir hata oluştu, hata kodu #NoticeC-resolve-1';
            if (in_array($permission->errorCode, [1, 2, 3, 4])) {
                $message = $permission->errorMessage;
            }
            return new JsonResponse(['status' => false, 'message' => $message, 'response' => null], 401);
        }

        $notice = $this->entityManager->getRepository(Notice::class)->find($id);

        if (!$notice) {
            return new JsonResponse(['status' => false, 'message' => "$id id'li şikayet bulunamadı", 'response' => null], 404);
        }

        $notice->setIsResolved(true);
        $ormActionHandler = new OrmActionHandler($this->entityManager, $notice);
        
        if ($ormActionHandler->status && is_null($ormActionHandler->error) && is_null($ormActionHandler->errorMessage)) {
            return new JsonResponse(['status' => true, 'message' => 'Şikayet çözüldü olarak işaretlendi', 'response' => null], 200);
        }

        return new JsonResponse(['status' => false, 'message' => 'Şikayet güncellenirken bir hata oluştu', 'response' => null], 400);
    }
}