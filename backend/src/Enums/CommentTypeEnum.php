<?php

namespace App\Enums;

enum CommentTypeEnum: string
{
    case Book = 'book';
    case Translator = 'translator';
    case Writer = 'writer';
}