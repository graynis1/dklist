<?php

namespace App\Entity;

use App\Repository\NoticeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NoticeRepository::class)]
class Notice
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $commentID = null;

    #[ORM\Column(length: 30)]
    private ?string $type = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $reportedUser = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $reporterUser = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column]
    private ?bool $isResolved = false;

    public function getId(): ?int
    {
        return $this->id;
    }


    public function getCommentID(): ?string
    {
        return $this->commentID;
    }

    public function setCommentID(string $commentID): static
    {
        $this->commentID = $commentID;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getReportedUser(): ?User
    {
        return $this->reportedUser;
    }

    public function setReportedUser(?User $reportedUser): static
    {
        $this->reportedUser = $reportedUser;

        return $this;
    }

    public function getReporterUser(): ?User
    {
        return $this->reporterUser;
    }

    public function setReporterUser(?User $reporterUser): static
    {
        $this->reporterUser = $reporterUser;

        return $this;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function setReason(?string $reason): static
    {
        $this->reason = $reason;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function isResolved(): ?bool
    {
        return $this->isResolved;
    }

    public function setIsResolved(bool $isResolved): static
    {
        $this->isResolved = $isResolved;

        return $this;
    }
}
