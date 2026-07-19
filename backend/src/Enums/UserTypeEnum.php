<?php

namespace App\Enums;

enum UserTypeEnum : string
{
    case SuperAdmin = "SuperAdmin";
    case Admin = 'Admin';
    case Mod = 'Mod';
    case Blogger = 'Blog_Yazari';
    case Member = 'Üye';
    case All = '*';
}