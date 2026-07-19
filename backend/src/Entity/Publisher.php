<?php

namespace App\Entity;

use App\Repository\PublisherRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PublisherRepository::class)]
class Publisher
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\OneToMany(mappedBy: 'publisher', targetEntity: Book::class, orphanRemoval: true)]
    private Collection $books;

    #[ORM\Column(length: 255)]
    private ?string $slug = null;

    #[ORM\OneToOne(mappedBy: 'publisher', cascade: ['persist', 'remove'])]
    private ?User $user_publisher = null;

    public function __construct()
    {
        $this->books = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
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

    /**
     * @return Collection<int, Book>
     */
    public function getBooks(): Collection
    {
        return $this->books;
    }

    public function addBook(Book $book): static
    {
        if (!$this->books->contains($book)) {
            $this->books->add($book);
            $book->setPublisher($this);
        }

        return $this;
    }

    public function removeBook(Book $book): static
    {
        if ($this->books->removeElement($book)) {
            // set the owning side to null (unless already changed)
            if ($book->getPublisher() === $this) {
                $book->setPublisher(null);
            }
        }

        return $this;
    }

    public function getSlug(): ?string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): static
    {
        $this->slug = $slug;

        return $this;
    }

    public function getUserPublisher(): ?User
    {
        return $this->user_publisher;
    }

    public function setUserPublisher(?User $user_publisher): static
    {
        // unset the owning side of the relation if necessary
        if ($user_publisher === null && $this->user_publisher !== null) {
            $this->user_publisher->setPublisher(null);
        }

        // set the owning side of the relation if necessary
        if ($user_publisher !== null && $user_publisher->getPublisher() !== $this) {
            $user_publisher->setPublisher($this);
        }

        $this->user_publisher = $user_publisher;

        return $this;
    }
}
