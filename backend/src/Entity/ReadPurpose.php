<?php

namespace App\Entity;

use App\Repository\ReadPurposeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReadPurposeRepository::class)]
class ReadPurpose
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private ?string $year = null;

    #[ORM\Column(type: Types::BIGINT)]
    private ?string $purposeCount = null;

    #[ORM\ManyToOne(inversedBy: 'readPurposes')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $owner = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getPurposeCount(): ?string
    {
        return $this->purposeCount;
    }

    public function setPurposeCount(string $purposeCount): static
    {
        $this->purposeCount = $purposeCount;

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
