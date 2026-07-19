<?php

namespace App\Utilities;


class DirtyController
{

    private $dirtyList = [ 'sik', 'am', 'orospu', 'ibne', 'şerefsiz', 'serefsiz', 'gavat', 'yavşak', 'yavsak', 'ananı', 'sikeyim', 'sikerler', 'ibnenin', 'amk', 'amına', 'amına koyayım', 'sikiyim', 'sikerim', 'amı', 'salak', 'oçocugu', 'sikinden', 'göt', 'götün', 'götüne', 'götüm', 'it' ];

    public function control( $text ){
        if(!$text){ return false; }
        foreach( $this->dirtyList as $dirty ){
            if( $text === strtolower($dirty) ){
                return true;
            }
        }
        return false; // eşleşme yoksa 
    }
}
