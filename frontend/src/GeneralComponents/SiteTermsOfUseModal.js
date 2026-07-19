import { Modal } from 'antd';
import React from 'react';
import { useScreenSize } from '../Context/ResponsiveContext';
import { useTranslation } from 'react-i18next';


function SiteTermsOfUseModal({show, setShow}) {

    const { screenSize } = useScreenSize();
    const { t } = useTranslation();
    
    return ( 
        <Modal 
            open={show}
            onCancel={() => { setShow(false);}} 
            footer = {null}
            width={screenSize > 700 ? screenSize-300 : 300}
        >
            <h2>{t('site_kullanim1')}</h2>
            <br/>
            <hr/>
            <br/>
            <h3>{t('site_kullanim2')}</h3>
            <p>{t('site_kullanim3')}</p>
            <ol>
                <li>{t("site_kullanim4")}</li>
                <li>{t('site_kullanim5')}</li>
                <li>{t('site_kullanim6')}</li>
            </ol>
            <br/>
            <h3>{t('site_kullanim7')}</h3>
            <p>{t("site_kullanim8")}</p>
            <br/>
            <h3>{t('site_kullanim9')}</h3>
            <p>{t('site_kullanim10')}</p>
            <p>{t("site_kullanim11")}</p>
            <p>{t("site_kullanim12")}</p>
            <p>{t("site_kullanim13")}</p>
            <p>{t("site_kullanim14")}</p>
            <p>{t("site_kullanim15")}</p>
            <p>{t("site_kullanim16")}</p>
            <br/>
            <h3>{t('site_kullanim17')}</h3>
            <p>{t("site_kullanim18")}</p>
            <br/>
            <h3>{t('site_kullanim19')}</h3>
            <p>{t("site_kullanim20")}</p>
            <br/>
            <h3>{t('site_kullanim21')}</h3>
            <p>{t('site_kullanim22')}</p>
            <p>{t('site_kullanim23')}</p>
            <p>{t('site_kullanim24')}</p>
            <p>{t('site_kullanim25')}</p>
            
            <br/>
            <h3>{t('site_kullanim26')}</h3>
            <p>{t('site_kullanim27')}</p>
            <br/>
            <h3>{t('site_kullanim28')}</h3>
            <p>{t('site_kullanim29')}</p>
            <p>{t('site_kullanim30')}</p>
            <p>{t("site_kullanim31")}</p>
            <p>{t('site_kullanim32')}</p>
            <p>{t('site_kullanim33')}</p>
            <br/>
            <h3>{t('site_kullanim34')}</h3>
            <p>{t("site_kullanim35")}</p>
            <p>{t("site_kullanim36")}</p>
            <ol>
                <li>{t("site_kullanim37")}</li>
                <li>{t(" site_kullanim38")}</li>
                <li>{t("site_kullanim39")}</li>
                <li>{t("site_kullanim40")}</li>
                <li>{t("site_kullanim41")}</li>
                <li>{t("site_kullanim42")}</li>
                <li>{t("site_kullanim43")}</li>
                <li>{t("site_kullanim44")}</li>
                <li>{t("site_kullanim45")}</li>
                <li>{t("site_kullanim46")}</li>
                <li>{t("site_kullanim47")}</li>
                <li>{t("site_kullanim48")}</li>
                <li>{t("site_kullanim49")}</li>
                <li>{t("site_kullanim50")}</li>
                <li>{t("site_kullanim51")}</li>
                <li>{t("site_kullanim52")}</li>
                <li>{t("site_kullanim53")}</li>
            </ol>

        </Modal>
    );
}

export default SiteTermsOfUseModal;