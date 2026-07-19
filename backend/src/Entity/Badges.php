<?php

namespace App\Entity;

use App\Repository\BadgesRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BadgesRepository::class)]
class Badges
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $comment = null;

    #[ORM\Column(length: 255)]
    private ?string $img = null;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'badges')]
    private Collection $owners;

    #[ORM\Column(length: 50)]
    private ?string $name = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $name_US = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $comment_US = null;

    public function __construct()
    {
        $this->owners = new ArrayCollection();
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

    public function getImg(): ?string
    {
        return $this->img;
    }

    public function setImg(string $img): static
    {
        $this->img = $img;

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getOwners(): Collection
    {
        return $this->owners;
    }

    public function addOwner(User $owner): static
    {
        if (!$this->owners->contains($owner)) {
            $this->owners->add($owner);
            $owner->addBadge($this);
        }

        return $this;
    }

    public function removeOwner(User $owner): static
    {
        if ($this->owners->removeElement($owner)) {
            $owner->removeBadge($this);
        }

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

    public function getNameUS(): ?string
    {
        return $this->name_US;
    }

    public function setNameUS(?string $name_US): static
    {
        $this->name_US = $name_US;

        return $this;
    }

    public function getCommentUS(): ?string
    {
        return $this->comment_US;
    }

    public function setCommentUS(?string $comment_US): static
    {
        $this->comment_US = $comment_US;

        return $this;
    }
}
