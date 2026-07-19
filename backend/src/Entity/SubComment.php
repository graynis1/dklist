<?php

namespace App\Entity;

use App\Repository\SubCommentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SubCommentRepository::class)]
class SubComment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $comment = null;

    #[ORM\ManyToOne(inversedBy: 'userSubComments')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 30)]
    private ?string $parentType = null;

    #[ORM\Column(type: Types::BIGINT)]
    private ?string $parentID = null;

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getParentType(): ?string
    {
        return $this->parentType;
    }

    public function setParentType(string $parentType): static
    {
        $this->parentType = $parentType;

        return $this;
    }

    public function getParentID(): ?string
    {
        return $this->parentID;
    }

    public function setParentID(string $parentID): static
    {
        $this->parentID = $parentID;

        return $this;
    }
}
