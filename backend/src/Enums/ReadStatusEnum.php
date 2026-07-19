<?php

namespace App\Enums;

enum ReadStatusEnum: string
{
    case CurrentRead = 'currentRead';
    case FinishRead  = 'finishRead';
    case TargetRead  = 'targetRead';
}