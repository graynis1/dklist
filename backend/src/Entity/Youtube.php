<?php

namespace App\Entity;

use App\Repository\YoutubeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: YoutubeRepository::class)]
class Youtube
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $embededCode = null;

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $view = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getEmbededCode(): ?string
    {
        return $this->embededCode;
    }

    public function setEmbededCode(string $embededCode): static
    {
        $this->embededCode = $embededCode;

        return $this;
    }

    public function getView(): ?int
    {
        return $this->view;
    }

    public function setView(?int $view): static
    {
        $this->view = $view;

        return $this;
    }
}
