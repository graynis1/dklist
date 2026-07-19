import React from 'react';
import './style.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/* Bu komponent kütüphane, askıda kitap, okuyacakları, okudukları ve geçmişte okudukları yerine geçecek */

const BookListComponent = ({data, title, isStore = false, header = null}) => {

    const navigate = useNavigate();
    const { t } = useTranslation();

    return(
        <div className='bookListComponent'>
            <div className='bookListComponentTitle'>{
                header ? header() : title
            }</div>            
            {
                data && data.length > 0 && data.map( book => { 
                    return(
                        <div className='bookItem' key={book.id} onClick={() => {navigate( (isStore ? t('/askida-kitap') : t('/kitap')) +'/'+book.slug)}}>
                            <img alt='DK - List' src={book.image || '/images/nopic.png'}/>
                        </div>
                    );
                })
            }
        </div>
    )
}

export default BookListComponent;