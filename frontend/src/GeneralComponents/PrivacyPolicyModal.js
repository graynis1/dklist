import { Modal } from 'antd';
import React from 'react';
import { useScreenSize } from '../Context/ResponsiveContext';
import { useTranslation } from 'react-i18next';

function PrivacyPolicyModal({show, setShow}) {
    const { t } = useTranslation();

    const { screenSize } = useScreenSize();
    return ( 
        <Modal
            open={show}
            onCancel={() => { setShow(false);}} 
            footer = {null}
            width={screenSize > 700 ? screenSize-300 : 300}
        >
            <h2>{t('gizlilik_politikasi1')}</h2>
            <br/>
            <hr/>
            <br/>
            <h3>{t('gizlilik_politikasi1')}</h3>
            <p>{t("gizlilik_politikasi2")}</p>
            <br/>
            <h3>{t('gizlilik_politikasi3')}</h3>
            <p>{t("gizlilik_politikasi4")}</p>
            <br/>
            <h3>{t('gizlilik_politikasi5')}</h3>
            <p>{t("gizlilik_politikasi6")}</p>
            <br/>
            <h3>{t("gizlilik_politikasi7")}</h3>
            <p>{t("gizlilik_politikasi8")}</p>
            <br/>
            <h3>{t("gizlilik_politikasi9")}</h3>
            <p>{t("gizlilik_politikasi10")}</p>
            <p>{t("gizlilik_politikasi11")}</p>
            <p>{t("gizlilik_politikasi12")}</p>
            <br/>
            <h3>{t("gizlilik_politikasi13")}</h3>
            <p>{t("gizlilik_politikasi14")}</p>
            <p>{t("gizlilik_politikasi15")}</p>
            <p>{t("gizlilik_politikasi16")}</p>
        </Modal>
    );
}

export default PrivacyPolicyModal;