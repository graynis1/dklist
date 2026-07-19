<?php

namespace App\Enums;

enum CommentParentEnum: string
{
    case Comment = 'comment';
    case SubComment = 'subComment';
}