<?php

namespace App\Entity;

use App\Repository\TranslatorRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TranslatorRepository::class)]
class Translator
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\ManyToMany(targetEntity: Book::class, inversedBy: 'translators')]
    private Collection $books_translator;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $birthDate = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $deathDate = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $biyo = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $img = null;

    #[ORM\Column(length: 255)]
    private ?string $slug = null;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'likedTranslators')]
    private Collection $getLikedUsers;

    #[ORM\Column(length: 255)]
    private ?string $viewCount = null;

    #[ORM\Column]
    private ?float $score = null;

    public function __construct()
    {
        $this->books_translator = new ArrayCollection();
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

    /**
     * @return Collection<int, Book>
     */
    public function getBooks(): Collection
    {
        return $this->books_translator;
    }

    public function addBook(Book $book): static
    {
        if (!$this->books_translator->contains($book)) {
            $this->books_translator->add($book);
        }

        return $this;
    }

    public function removeBook(Book $book): static
    {
        $this->books_translator->removeElement($book);

        return $this;
    }

    public function getBirthDate(): ?\DateTimeInterface
    {
        return $this->birthDate;
    }

    public function setBirthDate(?\DateTimeInterface $birthDate): static
    {
        $this->birthDate = $birthDate;

        return $this;
    }

    public function getDeathDate(): ?\DateTimeInterface
    {
        return $this->deathDate;
    }

    public function setDeathDate(?\DateTimeInterface $deathDate): static
    {
        $this->deathDate = $deathDate;

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
            $getLikedUser->addLikedTranslator($this);
        }

        return $this;
    }

    public function removeGetLikedUser(User $getLikedUser): static
    {
        if ($this->getLikedUsers->removeElement($getLikedUser)) {
            $getLikedUser->removeLikedTranslator($this);
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
