<?php

namespace App\Entity;

use App\Repository\BookRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookRepository::class)]
class Book
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 150)]
    private ?string $name = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $format = null;

    #[ORM\Column(length: 10, nullable: false)]
    private ?string $lang = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $isbn = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $image = null;

    #[ORM\ManyToMany(targetEntity: Writer::class, mappedBy: 'books_writers')]
    private Collection $writers;

    #[ORM\ManyToMany(targetEntity: Translator::class, mappedBy: 'books_translator')]
    private Collection $translators;

    #[ORM\ManyToOne(inversedBy: 'books')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Publisher $publisher = null;

    #[ORM\ManyToMany(targetEntity: Category::class, inversedBy: 'books_category')]
    private Collection $categories;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'Book')]
    private ?self $originalBook = null;

    #[ORM\OneToMany(mappedBy: 'originalBook', targetEntity: self::class)]
    private Collection $Book;

    #[ORM\Column(length: 150)]
    private ?string $orgName = null;

    #[ORM\Column(type: Types::SMALLINT)]
    private ?int $pageNumber = null;

    #[ORM\Column(length: 255)]
    private ?string $slug = null;

    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'likedBooks')]
    private Collection $users;

    #[ORM\OneToMany(mappedBy: 'Book', targetEntity: Read::class, orphanRemoval: true)]
    private Collection $ReadStatuses;

    #[ORM\Column]
    private ?float $score = null;

    #[ORM\Column(type: Types::BIGINT)]
    private ?string $viewCount = null;

    #[ORM\OneToMany(mappedBy: 'book', targetEntity: LibraryBook::class, orphanRemoval: true)]
    private Collection $libraryBooks;

    #[ORM\Column]
    private ?bool $approve = null;

    public function __construct()
    {
        $this->writers = new ArrayCollection();
        $this->translators = new ArrayCollection();
        $this->categories = new ArrayCollection();
        $this->Book = new ArrayCollection();
        $this->users = new ArrayCollection();
        $this->ReadStatuses = new ArrayCollection();
        $this->libraryBooks = new ArrayCollection();
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

    public function getFormat(): ?string
    {
        return $this->format;
    }

    public function setFormat(?string $format): static
    {
        $this->format = $format;

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

    public function getIsbn(): ?string
    {
        return $this->isbn;
    }

    public function setIsbn(?string $isbn): static
    {
        $this->isbn = $isbn;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
    {
        $this->content = $content;

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

    public function getOrgName(): ?string
    {
        return $this->orgName;
    }

    public function setOrgName(string $orgName): static
    {
        $this->orgName = $orgName;

        return $this;
    }

    /**
     * @return Collection<int, Writer>
     */
    public function getWriters(): Collection
    {
        return $this->writers;
    }

    public function addWriter(Writer $writer): static
    {
        if (!$this->writers->contains($writer)) {
            $this->writers->add($writer);
            $writer->addBook($this);
        }

        return $this;
    }

    public function removeWriter(Writer $writer): static
    {
        if ($this->writers->removeElement($writer)) {
            $writer->removeBook($this);
        }

        return $this;
    }


    /**
     * @return Collection<int, Translator>
     */
    public function getTranslators(): Collection
    {
        return $this->translators;
    }

    public function addTranslator(Translator $translator): static
    {
        if (!$this->translators->contains($translator)) {
            $this->translators->add($translator);
            $translator->addBook($this);
        }

        return $this;
    }

    public function removeTranslator(Translator $translator): static
    {
        if ($this->translators->removeElement($translator)) {
            $translator->removeBook($this);
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
     * @return Collection<int, Category>
     */
    public function getCategories(): Collection
    {
        return $this->categories;
    }

    public function addCategory(Category $category): static
    {
        if (!$this->categories->contains($category)) {
            $this->categories->add($category);
        }

        return $this;
    }

    public function removeCategory(Category $category): static
    {
        $this->categories->removeElement($category);

        return $this;
    }

    public function getOriginalBook(): ?self
    {
        return $this->originalBook;
    }

    public function setOriginalBook(?self $originalBook): static
    {
        $this->originalBook = $originalBook;

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getBook(): Collection
    {
        return $this->Book;
    }

    public function addBook(self $book): static
    {
        if (!$this->Book->contains($book)) {
            $this->Book->add($book);
            $book->setOriginalBook($this);
        }

        return $this;
    }

    public function removeBook(self $book): static
    {
        if ($this->Book->removeElement($book)) {
            // set the owning side to null (unless already changed)
            if ($book->getOriginalBook() === $this) {
                $book->setOriginalBook(null);
            }
        }

        return $this;
    }

    public function getPageNumber(): ?int
    {
        return $this->pageNumber;
    }

    public function setPageNumber(int $pageNumber): static
    {
        $this->pageNumber = $pageNumber;

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
    public function getUsers(): Collection
    {
        return $this->users;
    }

    public function addUser(User $user): static
    {
        if (!$this->users->contains($user)) {
            $this->users->add($user);
            $user->addLikedBook($this);
        }

        return $this;
    }

    public function removeUser(User $user): static
    {
        if ($this->users->removeElement($user)) {
            $user->removeLikedBook($this);
        }

        return $this;
    }

    /**
     * @return Collection<int, Read>
     */
    public function getReadStatuses(): Collection
    {
        return $this->ReadStatuses;
    }

    public function addReadStatus(Read $readStatus): static
    {
        if (!$this->ReadStatuses->contains($readStatus)) {
            $this->ReadStatuses->add($readStatus);
            $readStatus->setBook($this);
        }

        return $this;
    }

    public function removeReadStatus(Read $readStatus): static
    {
        if ($this->ReadStatuses->removeElement($readStatus)) {
            // set the owning side to null (unless already changed)
            if ($readStatus->getBook() === $this) {
                $readStatus->setBook(null);
            }
        }

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

    public function getViewCount(): ?string
    {
        return $this->viewCount;
    }

    public function setViewCount(string $viewCount): static
    {
        $this->viewCount = $viewCount;

        return $this;
    }

    /**
     * @return Collection<int, LibraryBook>
     */
    public function getLibraryBooks(): Collection
    {
        return $this->libraryBooks;
    }

    public function addLibraryBook(LibraryBook $libraryBook): static
    {
        if (!$this->libraryBooks->contains($libraryBook)) {
            $this->libraryBooks->add($libraryBook);
            $libraryBook->setBook($this);
        }

        return $this;
    }

    public function removeLibraryBook(LibraryBook $libraryBook): static
    {
        if ($this->libraryBooks->removeElement($libraryBook)) {
            // set the owning side to null (unless already changed)
            if ($libraryBook->getBook() === $this) {
                $libraryBook->setBook(null);
            }
        }

        return $this;
    }

    public function isApprove(): ?bool
    {
        return $this->approve;
    }

    public function setApprove(bool $approve): static
    {
        $this->approve = $approve;

        return $this;
    }

}