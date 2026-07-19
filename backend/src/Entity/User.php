<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserRepository::class)]
class User
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $username = null;

    #[ORM\Column(length: 50)]
    private ?string $password = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $mail = null;

    #[ORM\Column(length: 30, unique: true)]
    private ?string $token = null;

    #[ORM\Column]
    private ?bool $privacy = null;

    #[ORM\Column(length: 25, nullable: false)]
    private ?string $userType = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $createdDate = null;

    #[ORM\Column( length: 40, nullable: false )]
    private ?string $sex = null;

    #[ORM\Column(length: 50)]
    private ?string $name = null;

    #[ORM\Column(length: 50)]
    private ?string $surname = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $livingCity = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $job = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $edu = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $biyo = null;

    #[ORM\Column(nullable: true)]
    private ?bool $mailAuth = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $birthPlace = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $birthDate = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image = null;

    #[ORM\ManyToMany(targetEntity: Badges::class, inversedBy: 'owners')]
    private Collection $badges;

    #[ORM\Column]
    private ?bool $disable = null;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: Score::class, orphanRemoval: true)]
    private Collection $getTheyRated;

    #[ORM\ManyToMany(targetEntity: Writer::class, inversedBy: 'getLikedUsers')]
    private Collection $likedWriters;

    #[ORM\ManyToMany(targetEntity: Book::class, inversedBy: 'users')]
    private Collection $likedBooks;

    #[ORM\ManyToMany(targetEntity: Translator::class, inversedBy: 'getLikedUsersTranslators')]
    private Collection $likedTranslators;

    #[ORM\ManyToOne(inversedBy: 'user')]
    private ?Read $readBooks = null;

    #[ORM\OneToMany(mappedBy: 'User', targetEntity: Read::class, orphanRemoval: true)]
    private Collection $readStatuses;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: Comment::class, orphanRemoval: true)]
    private Collection $comments;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: SubComment::class, orphanRemoval: true)]
    private Collection $userSubComments;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: CommentLike::class, orphanRemoval: true)]
    private Collection $userCommentLikes;

    #[ORM\OneToMany(mappedBy: 'follower', targetEntity: Follow::class, orphanRemoval: true)]
    private Collection $followers;

    #[ORM\OneToMany(mappedBy: 'followed', targetEntity: Follow::class, orphanRemoval: true)]
    private Collection $followed;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: LibraryBook::class, orphanRemoval: true)]
    private Collection $userLibraryBook;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: ReadPurpose::class, orphanRemoval: true)]
    private Collection $readPurposes;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: Store::class, orphanRemoval: true)]
    private Collection $storeBook;

    #[ORM\OneToOne(inversedBy: 'user_publisher', cascade: ['persist', 'remove'])]
    private ?Publisher $publisher = null;

    #[ORM\OneToMany(mappedBy: 'ownerUser', targetEntity: DKNotifiaction::class, orphanRemoval: true)]
    private Collection $user_notifys;

    #[ORM\OneToMany(mappedBy: 'firstUser', targetEntity: Chat::class, orphanRemoval: true)]
    private Collection $getFirstChats;

    #[ORM\OneToMany(mappedBy: 'secondUser', targetEntity: Chat::class, orphanRemoval: true)]
    private Collection $getSecondChats;

    #[ORM\OneToMany(mappedBy: 'owner', targetEntity: Blog::class, orphanRemoval: true)]
    private Collection $blogs;

    public function __construct()
    {
        $this->badges = new ArrayCollection();
        $this->getTheyRated = new ArrayCollection();
        $this->likedWriters = new ArrayCollection();
        $this->likedBooks = new ArrayCollection();
        $this->likedTranslators = new ArrayCollection();
        $this->readStatuses = new ArrayCollection();
        $this->comments = new ArrayCollection();
        $this->userSubComments = new ArrayCollection();
        $this->userCommentLikes = new ArrayCollection();
        $this->followers = new ArrayCollection();
        $this->followed = new ArrayCollection();
        $this->userLibraryBook = new ArrayCollection();
        $this->readPurposes = new ArrayCollection();
        $this->storeBook = new ArrayCollection();
        $this->user_notifys = new ArrayCollection();
        $this->getFirstChats = new ArrayCollection();
        $this->getSecondChats = new ArrayCollection();
        $this->blogs = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;

        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getMail(): ?string
    {
        return $this->mail;
    }

    public function setMail(string $mail): static
    {
        $this->mail = $mail;

        return $this;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function setToken(string $token): static
    {
        $this->token = $token;

        return $this;
    }

    public function isPrivacy(): ?bool
    {
        return $this->privacy;
    }

    public function setPrivacy(bool $privacy): static
    {
        $this->privacy = $privacy;

        return $this;
    }

    public function getUserType(): ?string
    {
        return $this->userType;
    }

    public function setUserType(string $userType): static
    {
        $this->userType = $userType;

        return $this;
    }

    public function getCreatedDate(): ?\DateTimeInterface
    {
        return $this->createdDate;
    }

    public function setCreatedDate(\DateTimeInterface $createdDate): static
    {
        $this->createdDate = $createdDate;

        return $this;
    }

    public function getSex(): ?string
    {
        return $this->sex;
    }

    public function setSex(?string $sex): static
    {
        $this->sex = $sex;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getSurname(): ?string
    {
        return $this->surname;
    }

    public function setSurname(string $surname): static
    {
        $this->surname = $surname;

        return $this;
    }

    public function getLivingCity(): ?string
    {
        return $this->livingCity;
    }

    public function setLivingCity(?string $livingCity): static
    {
        $this->livingCity = $livingCity;

        return $this;
    }

    public function getJob(): ?string
    {
        return $this->job;
    }

    public function setJob(?string $job): static
    {
        $this->job = $job;

        return $this;
    }

    public function getEdu(): ?string
    {
        return $this->edu;
    }

    public function setEdu(?string $edu): static
    {
        $this->edu = $edu;

        return $this;
    }

    public function getBiyo(): ?string
    {
        return $this->biyo;
    }

    public function setBiyo(?string $biyo): static
    {
        $this->biyo = $biyo;

        return $this;
    }

    public function isMailAuth(): ?bool
    {
        return $this->mailAuth;
    }

    public function setMailAuth(?bool $mailAuth): static
    {
        $this->mailAuth = $mailAuth;

        return $this;
    }

    public function getBirthPlace(): ?string
    {
        return $this->birthPlace;
    }

    public function setBirthPlace(?string $birthPlace): static
    {
        $this->birthPlace = $birthPlace;

        return $this;
    }

    public function getBirthDate(): ?\DateTimeInterface
    {
        return $this->birthDate;
    }

    public function setBirthDate(\DateTimeInterface $birthDate): static
    {
        $this->birthDate = $birthDate;

        return $this;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function setImage(?string $image): static
    {
        $this->image = $image;

        return $this;
    }

    /**
     * @return Collection<int, Badges>
     */
    public function getBadges(): Collection
    {
        return $this->badges;
    }

    public function addBadge(Badges $badge): static
    {
        if (!$this->badges->contains($badge)) {
            $this->badges->add($badge);
        }

        return $this;
    }

    public function removeBadge(Badges $badge): static
    {
        $this->badges->removeElement($badge);

        return $this;
    }

    public function isDisable(): ?bool
    {
        return $this->disable;
    }

    public function setDisable(bool $disable): static
    {
        $this->disable = $disable;

        return $this;
    }

    /**
     * @return Collection<int, Score>
     */
    public function getGetTheyRated(): Collection
    {
        return $this->getTheyRated;
    }

    public function addGetTheyRated(Score $getTheyRated): static
    {
        if (!$this->getTheyRated->contains($getTheyRated)) {
            $this->getTheyRated->add($getTheyRated);
            $getTheyRated->setOwner($this);
        }

        return $this;
    }

    public function removeGetTheyRated(Score $getTheyRated): static
    {
        if ($this->getTheyRated->removeElement($getTheyRated)) {
            // set the owning side to null (unless already changed)
            if ($getTheyRated->getOwner() === $this) {
                $getTheyRated->setOwner(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Writer>
     */
    public function getLikedWriters(): Collection
    {
        return $this->likedWriters;
    }

    public function addLikedWriter(Writer $likedWriter): static
    {
        if (!$this->likedWriters->contains($likedWriter)) {
            $this->likedWriters->add($likedWriter);
        }

        return $this;
    }

    public function removeLikedWriter(Writer $likedWriter): static
    {
        $this->likedWriters->removeElement($likedWriter);

        return $this;
    }

    /**
     * @return Collection<int, Book>
     */
    public function getLikedBooks(): Collection
    {
        return $this->likedBooks;
    }

    public function addLikedBook(Book $likedBook): static
    {
        if (!$this->likedBooks->contains($likedBook)) {
            $this->likedBooks->add($likedBook);
        }

        return $this;
    }

    public function removeLikedBook(Book $likedBook): static
    {
        $this->likedBooks->removeElement($likedBook);

        return $this;
    }

    /**
     * @return Collection<int, Translator>
     */
    public function getLikedTranslators(): Collection
    {
        return $this->likedTranslators;
    }

    public function addLikedTranslator(Translator $likedTranslator): static
    {
        if (!$this->likedTranslators->contains($likedTranslator)) {
            $this->likedTranslators->add($likedTranslator);
        }

        return $this;
    }

    public function removeLikedTranslator(Translator $likedTranslator): static
    {
        $this->likedTranslators->removeElement($likedTranslator);

        return $this;
    }

    public function getReadBooks(): ?Read
    {
        return $this->readBooks;
    }

    public function setReadBooks(?Read $readBooks): static
    {
        $this->readBooks = $readBooks;

        return $this;
    }

    /**
     * @return Collection<int, Read>
     */
    public function getReadStatuses(): Collection
    {
        return $this->readStatuses;
    }

    public function addReadStatus(Read $readStatus): static
    {
        if (!$this->readStatuses->contains($readStatus)) {
            $this->readStatuses->add($readStatus);
            $readStatus->setUser($this);
        }

        return $this;
    }

    public function removeReadStatus(Read $readStatus): static
    {
        if ($this->readStatuses->removeElement($readStatus)) {
            // set the owning side to null (unless already changed)
            if ($readStatus->getUser() === $this) {
                $readStatus->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Comment>
     */
    public function getComments(): Collection
    {
        return $this->comments;
    }

    public function addComment(Comment $comment): static
    {
        if (!$this->comments->contains($comment)) {
            $this->comments->add($comment);
            $comment->setUser($this);
        }

        return $this;
    }

    public function removeComment(Comment $comment): static
    {
        if ($this->comments->removeElement($comment)) {
            // set the owning side to null (unless already changed)
            if ($comment->getUser() === $this) {
                $comment->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, SubComment>
     */
    public function getUserSubComments(): Collection
    {
        return $this->userSubComments;
    }

    public function addUserSubComment(SubComment $userSubComment): static
    {
        if (!$this->userSubComments->contains($userSubComment)) {
            $this->userSubComments->add($userSubComment);
            $userSubComment->setUser($this);
        }

        return $this;
    }

    public function removeUserSubComment(SubComment $userSubComment): static
    {
        if ($this->userSubComments->removeElement($userSubComment)) {
            // set the owning side to null (unless already changed)
            if ($userSubComment->getUser() === $this) {
                $userSubComment->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, CommentLike>
     */
    public function getUserCommentLikes(): Collection
    {
        return $this->userCommentLikes;
    }

    public function addUserCommentLike(CommentLike $userCommentLike): static
    {
        if (!$this->userCommentLikes->contains($userCommentLike)) {
            $this->userCommentLikes->add($userCommentLike);
            $userCommentLike->setUser($this);
        }

        return $this;
    }

    public function removeUserCommentLike(CommentLike $userCommentLike): static
    {
        if ($this->userCommentLikes->removeElement($userCommentLike)) {
            // set the owning side to null (unless already changed)
            if ($userCommentLike->getUser() === $this) {
                $userCommentLike->setUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Follow>
     */
    public function getFollowers(): Collection
    {
        return $this->followers;
    }

    public function addFollower(Follow $follower): static
    {
        if (!$this->followers->contains($follower)) {
            $this->followers->add($follower);
            $follower->setFollower($this);
        }

        return $this;
    }

    public function removeFollower(Follow $follower): static
    {
        if ($this->followers->removeElement($follower)) {
            // set the owning side to null (unless already changed)
            if ($follower->getFollower() === $this) {
                $follower->setFollower(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Follow>
     */
    public function getFollowed(): Collection
    {
        return $this->followed;
    }

    public function addFollowed(Follow $followed): static
    {
        if (!$this->followed->contains($followed)) {
            $this->followed->add($followed);
            $followed->setFollowed($this);
        }

        return $this;
    }

    public function removeFollowed(Follow $followed): static
    {
        if ($this->followed->removeElement($followed)) {
            // set the owning side to null (unless already changed)
            if ($followed->getFollowed() === $this) {
                $followed->setFollowed(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, LibraryBook>
     */
    public function getUserLibraryBook(): Collection
    {
        return $this->userLibraryBook;
    }

    public function addUserLibraryBook(LibraryBook $userLibraryBook): static
    {
        if (!$this->userLibraryBook->contains($userLibraryBook)) {
            $this->userLibraryBook->add($userLibraryBook);
            $userLibraryBook->setOwner($this);
        }

        return $this;
    }

    public function removeUserLibraryBook(LibraryBook $userLibraryBook): static
    {
        if ($this->userLibraryBook->removeElement($userLibraryBook)) {
            // set the owning side to null (unless already changed)
            if ($userLibraryBook->getOwner() === $this) {
                $userLibraryBook->setOwner(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, ReadPurpose>
     */
    public function getReadPurposes(): Collection
    {
        return $this->readPurposes;
    }

    public function addReadPurpose(ReadPurpose $readPurpose): static
    {
        if (!$this->readPurposes->contains($readPurpose)) {
            $this->readPurposes->add($readPurpose);
            $readPurpose->setOwner($this);
        }

        return $this;
    }

    public function removeReadPurpose(ReadPurpose $readPurpose): static
    {
        if ($this->readPurposes->removeElement($readPurpose)) {
            // set the owning side to null (unless already changed)
            if ($readPurpose->getOwner() === $this) {
                $readPurpose->setOwner(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Store>
     */
    public function getStoreBook(): Collection
    {
        return $this->storeBook;
    }

    public function addStoreBook(Store $storeBook): static
    {
        if (!$this->storeBook->contains($storeBook)) {
            $this->storeBook->add($storeBook);
            $storeBook->setOwner($this);
        }

        return $this;
    }

    public function removeStoreBook(Store $storeBook): static
    {
        if ($this->storeBook->removeElement($storeBook)) {
            // set the owning side to null (unless already changed)
            if ($storeBook->getOwner() === $this) {
                $storeBook->setOwner(null);
            }
        }

        return $this;
    }

    public function getPublisher(): ?Publisher
    {
        return $this->publisher;
    }

    public function setPublisher(?Publisher $publisher): static
    {
        $this->publisher = $publisher;

        return $this;
    }

    /**
     * @return Collection<int, DKNotifiaction>
     */
    public function getUserNotifys(): Collection
    {
        return $this->user_notifys;
    }

    public function addUserNotify(DKNotifiaction $userNotify): static
    {
        if (!$this->user_notifys->contains($userNotify)) {
            $this->user_notifys->add($userNotify);
            $userNotify->setOwnerUser($this);
        }

        return $this;
    }

    public function removeUserNotify(DKNotifiaction $userNotify): static
    {
        if ($this->user_notifys->removeElement($userNotify)) {
            // set the owning side to null (unless already changed)
            if ($userNotify->getOwnerUser() === $this) {
                $userNotify->setOwnerUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getGetFirstChats(): Collection
    {
        return $this->getFirstChats;
    }

    public function addGetFirstChat(Chat $getFirstChat): static
    {
        if (!$this->getFirstChats->contains($getFirstChat)) {
            $this->getFirstChats->add($getFirstChat);
            $getFirstChat->setFirstUser($this);
        }

        return $this;
    }

    public function removeGetFirstChat(Chat $getFirstChat): static
    {
        if ($this->getFirstChats->removeElement($getFirstChat)) {
            // set the owning side to null (unless already changed)
            if ($getFirstChat->getFirstUser() === $this) {
                $getFirstChat->setFirstUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Chat>
     */
    public function getGetSecondChats(): Collection
    {
        return $this->getSecondChats;
    }

    public function addGetSecondChat(Chat $getSecondChat): static
    {
        if (!$this->getSecondChats->contains($getSecondChat)) {
            $this->getSecondChats->add($getSecondChat);
            $getSecondChat->setSecondUser($this);
        }

        return $this;
    }

    public function removeGetSecondChat(Chat $getSecondChat): static
    {
        if ($this->getSecondChats->removeElement($getSecondChat)) {
            // set the owning side to null (unless already changed)
            if ($getSecondChat->getSecondUser() === $this) {
                $getSecondChat->setSecondUser(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Blog>
     */
    public function getBlogs(): Collection
    {
        return $this->blogs;
    }

    public function addBlog(Blog $blog): static
    {
        if (!$this->blogs->contains($blog)) {
            $this->blogs->add($blog);
            $blog->setOwner($this);
        }

        return $this;
    }

    public function removeBlog(Blog $blog): static
    {
        if ($this->blogs->removeElement($blog)) {
            // set the owning side to null (unless already changed)
            if ($blog->getOwner() === $this) {
                $blog->setOwner(null);
            }
        }

        return $this;
    }

   
}