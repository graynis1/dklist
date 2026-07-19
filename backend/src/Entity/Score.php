<?php

namespace App\Entity;

use App\Repository\ScoreRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ScoreRepository::class)]
class Score
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'getTheyRated')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $owner = null;
    
    #[ORM\Column]
    private ?int $targetID = null;

    #[ORM\Column(length: 50)]
    private ?string $TargetType = null;

    #[ORM\Column(type: Types::SMALLINT)]
    private ?int $score = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getTargetID(): ?int
    {
        return $this->targetID;
    }

    public function setTargetID(int $targetID): static
    {
        $this->targetID = $targetID;

        return $this;
    }

    public function getScore(): ?int
    {
        return $this->score;
    }

    public function setScore(int $score): static
    {
        $this->score = $score;

        return $this;
    }

    public function getTargetType(): ?string
    {
        return $this->TargetType;
    }

    public function setTargetType(string $TargetType): static
    {
        $this->TargetType = $TargetType;

        return $this;
    }
}
