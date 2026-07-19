<?php

namespace App\Entity;

use App\Repository\ReadRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReadRepository::class)]
#[ORM\Table(name: '`read`')]
class Read
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private ?string $status = null;

    #[ORM\Column(length: 4)]
    private ?string $year = null;

    #[ORM\ManyToOne(inversedBy: 'ReadStatuses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Book $Book = null;

    #[ORM\ManyToOne(inversedBy: 'readStatuses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $User = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getYear(): ?string
    {
        return $this->year;
    }

    public function setYear(string $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getBook(): ?Book
    {
        return $this->Book;
    }

    public function setBook(?Book $Book): static
    {
        $this->Book = $Book;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->User;
    }

    public function setUser(?User $User): static
    {
        $this->User = $User;

        return $this;
    }
}
