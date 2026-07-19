<?php

namespace App\Entity;

use App\Repository\CommentRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CommentRepository::class)]
class Comment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $comment = null;

    #[ORM\Column(length: 20)]
    private ?string $commentType = null;

    #[ORM\Column(length: 20)]
    private ?string $type = null;

    #[ORM\Column(type: Types::BIGINT)]
    private ?string $targetID = null;

    #[ORM\ManyToOne(inversedBy: 'comments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\OneToMany(mappedBy: 'comment', targetEntity: CommentLike::class, orphanRemoval: true)]
    private Collection $commentLikeComments;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $lang = null;

    public function __construct()
    {
        $this->commentLikeComments = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getComment(): ?string
    {
        return $this->comment;
    }

    public function setComment(string $comment): static
    {
        $this->comment = $comment;

        return $this;
    }

    public function getCommentType(): ?string
    {
        return $this->commentType;
    }

    public function setCommentType(string $commentType): static
    {
        $this->commentType = $commentType;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getTargetID(): ?string
    {
        return $this->targetID;
    }

    public function setTargetID(string $targetID): static
    {
        $this->targetID = $targetID;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    /**
     * @return Collection<int, CommentLike>
     */
    public function getCommentLikeComments(): Collection
    {
        return $this->commentLikeComments;
    }

    public function addCommentLikeComment(CommentLike $commentLikeComment): static
    {
        if (!$this->commentLikeComments->contains($commentLikeComment)) {
            $this->commentLikeComments->add($commentLikeComment);
            $commentLikeComment->setComment($this);
        }

        return $this;
    }

    public function removeCommentLikeComment(CommentLike $commentLikeComment): static
    {
        if ($this->commentLikeComments->removeElement($commentLikeComment)) {
            // set the owning side to null (unless already changed)
            if ($commentLikeComment->getComment() === $this) {
                $commentLikeComment->setComment(null);
            }
        }

        return $this;
    }

    public function getDate(): ?\DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(\DateTimeInterface $date): static
    {
        $this->date = $date;

        return $this;
    }

    public function getLang(): ?string
    {
        return $this->lang;
    }

    public function setLang(?string $lang): static
    {
        $this->lang = $lang;

        return $this;
    }

}
