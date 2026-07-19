<?php

namespace App\Entity;

use App\Repository\DKNotifiactionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DKNotifiactionRepository::class)]
class DKNotifiaction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'user_notifys')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $ownerUser = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $senderUser = null;

    #[ORM\Column]
    private ?bool $view = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $commentTR = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $commentUS = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $meta = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwnerUser(): ?User
    {
        return $this->ownerUser;
    }

    public function setOwnerUser(?User $ownerUser): static
    {
        $this->ownerUser = $ownerUser;

        return $this;
    }

    public function getSenderUser(): ?User
    {
        return $this->senderUser;
    }

    public function setSenderUser(?User $senderUser): static
    {
        $this->senderUser = $senderUser;

        return $this;
    }

    public function isView(): ?bool
    {
        return $this->view;
    }

    public function setView(bool $view): static
    {
        $this->view = $view;

        return $this;
    }

    public function getCommentTR(): ?string
    {
        return $this->commentTR;
    }

    public function setCommentTR(string $commentTR): static
    {
        $this->commentTR = $commentTR;

        return $this;
    }

    public function getCommentUS(): ?string
    {
        return $this->commentUS;
    }

    public function setCommentUS(string $commentUS): static
    {
        $this->commentUS = $commentUS;

        return $this;
    }

    public function getMeta(): ?string
    {
        return $this->meta;
    }

    public function setMeta(?string $meta): static
    {
        $this->meta = $meta;

        return $this;
    }
}
