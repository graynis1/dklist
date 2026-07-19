<?php

namespace App\Entity;

use App\Repository\WriterRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: WriterRepository::class)]
class Writer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 50)]
    private ?string $name = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $biyo = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $img = null;

    #[ORM\ManyToMany(targetEntity: Book::class, inversedBy: 'writers')]
    private Collection $books_writers;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'likedWriters')]
    private Collection $likedUsers;

    #[ORM\Column(length: 255)]
    private ?string $slug = null;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'likedWriters')]
    private Collection $getLikedUsers;

    #[ORM\Column(length: 255)]
    private ?string $viewCount = null;

    #[ORM\Column]
    private ?float $score = null;

    public function __construct()
    {
        $this->books_writers = new ArrayCollection();
        $this->likedUsers = new ArrayCollection();
        $this->getLikedUsers = new ArrayCollection();
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

    public function getDate(): ?\DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(?\DateTimeInterface $date): static
    {
        $this->date = $date;

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

    public function getImg(): ?string
    {
        return $this->img;
    }

    public function setImg(?string $img): static
    {
        $this->img = $img;

        return $this;
    }

    /**
     * @return Collection<int, Book>
     */
    public function getBooks(): Collection
    {
        return $this->books_writers;
    }

    public function addBook(Book $book): static
    {
        if (!$this->books_writers->contains($book)) {
            $this->books_writers->add($book);
        }

        return $this;
    }

    public function removeBook(Book $book): static
    {
        $this->books_writers->removeElement($book);

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getLikedUsers(): Collection
    {
        return $this->likedUsers;
    }

    public function addLikedUser(User $likedUser): static
    {
        if (!$this->likedUsers->contains($likedUser)) {
            $this->likedUsers->add($likedUser);
            $likedUser->addLikedWriter($this);
        }

        return $this;
    }

    public function removeLikedUser(User $likedUser): static
    {
        if ($this->likedUsers->removeElement($likedUser)) {
            $likedUser->removeLikedWriter($this);
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

    /**
     * @return Collection<int, User>
     */
    public function getGetLikedUsers(): Collection
    {
        return $this->getLikedUsers;
    }

    public function addGetLikedUser(User $getLikedUser): static
    {
        if (!$this->getLikedUsers->contains($getLikedUser)) {
            $this->getLikedUsers->add($getLikedUser);
            $getLikedUser->addLikedWriter($this);
        }

        return $this;
    }

    public function removeGetLikedUser(User $getLikedUser): static
    {
        if ($this->getLikedUsers->removeElement($getLikedUser)) {
            $getLikedUser->removeLikedWriter($this);
        }

        return $this;
    }

    public function getViewCount(): ?string
    {
        return $this->viewCount;
    }

    public function setViewCount(string $viewCount): static
    {
        $this->viewCount = $viewCount;

        return $this;
    }

    public function getScore(): ?float
    {
        return $this->score;
    }

    public function setScore(float $score): static
    {
        $this->score = $score;

        return $this;
    }
}
