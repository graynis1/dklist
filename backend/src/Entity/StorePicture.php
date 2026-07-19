<?php

namespace App\Entity;

use App\Repository\StorePictureRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StorePictureRepository::class)]
class StorePicture
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $imageName = null;

    #[ORM\ManyToOne(inversedBy: 'pictures')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Store $advert = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getImageName(): ?string
    {
        return $this->imageName;
    }

    public function setImageName(string $imageName): static
    {
        $this->imageName = $imageName;

        return $this;
    }

    public function getAdvert(): ?Store
    {
        return $this->advert;
    }

    public function setAdvert(?Store $advert): static
    {
        $this->advert = $advert;

        return $this;
    }
}
