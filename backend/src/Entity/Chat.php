<?php

namespace App\Entity;

use App\Repository\ChatRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChatRepository::class)]
class Chat
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'getFirstChats')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $firstUser = null;

    #[ORM\ManyToOne(inversedBy: 'getSecondChats')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $secondUser = null;


    #[ORM\OneToMany(mappedBy: 'chat', targetEntity: Message::class, orphanRemoval: true)]
    private Collection $chatMessages;

    public function __construct()
    {
        $this->chatMessages = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFirstUser(): ?User
    {
        return $this->firstUser;
    }

    public function setFirstUser(?User $firstUser): static
    {
        $this->firstUser = $firstUser;

        return $this;
    }

    public function getSecondUser(): ?User
    {
        return $this->secondUser;
    }

    public function setSecondUser(?User $secondUser): static
    {
        $this->secondUser = $secondUser;

        return $this;
    }


    
    /**
     * @return Collection<int, Message>
     */
    public function getChatMessages(): Collection
    {
        return $this->chatMessages;
    }

    public function addChatMessage(Message $chatMessage): static
    {
        if (!$this->chatMessages->contains($chatMessage)) {
            $this->chatMessages->add($chatMessage);
            $chatMessage->setChat($this);
        }

        return $this;
    }

    public function removeChatMessage(Message $chatMessage): static
    {
        if ($this->chatMessages->removeElement($chatMessage)) {
            // set the owning side to null (unless already changed)
            if ($chatMessage->getChat() === $this) {
                $chatMessage->setChat(null);
            }
        }

        return $this;
    }
}
