import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { NavLink } from "react-router-dom";
import {faBook, faPencil, faCompass, faHome, faVideo, faGlobe, faBookmark, faBlog} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

const PagesContainer = () => {

    const { t } = useTranslation();

    return(
            <div className='pagesContainer dkBox'>
                <NavLink className={'pageItem'} to={t('/akis')}><FontAwesomeIcon icon={faCompass} /><span className='pageItemText'>{t('akis')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/kitaplar')}><FontAwesomeIcon icon={faBook} /><span className='pageItemText'>{t('kitaplar')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/yazarlar')}><FontAwesomeIcon icon={faPencil} /><span className='pageItemText'>{t('yazarlar')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/cevirmenler')}><FontAwesomeIcon icon={faGlobe} /><span className='pageItemText'>{t('cevirmenler')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/yayin-evleri')}><FontAwesomeIcon icon={faHome} /><span className='pageItemText'>{t('yayinevleri')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/askida-kitap')}><FontAwesomeIcon icon={faBookmark} /><span className='pageItemText'>{t('askidaKitap')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/videolar')}><FontAwesomeIcon icon={faVideo} /><span className='pageItemText'>{t('videolar')}</span></NavLink>
                <NavLink className={'pageItem'} to={t('/bloglar')}><FontAwesomeIcon icon={faBlog} /><span className='pageItemText'>{t('Bloglar')}</span></NavLink>
            </div>
    )
}
export default PagesContainer;