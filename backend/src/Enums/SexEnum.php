<?php

namespace App\Enums;

enum SexEnum: string
{
    case Male = 'Erkek';
    case Female = 'Kadın';
    case Other = 'Belirtmek İstemiyorum';
}