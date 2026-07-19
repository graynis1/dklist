<?php

namespace App\Entity;

use App\Repository\LibraryBookRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LibraryBookRepository::class)]
class LibraryBook
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'libraryBooks')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Book $book = null;

    #[ORM\ManyToOne(inversedBy: 'userLibraryBook')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $owner = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBook(): ?Book
    {
        return $this->book;
    }

    public function setBook(?Book $book): static
    {
        $this->book = $book;

        return $this;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
    }
}
