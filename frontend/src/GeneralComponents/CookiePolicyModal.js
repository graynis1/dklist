import { Modal } from 'antd';
import React from 'react';
import { useScreenSize } from '../Context/ResponsiveContext';
import { useTranslation } from 'react-i18next';

function CookiePolicyModal({show, setShow}) {
    const { screenSize } = useScreenSize();
    const { t } = useTranslation();

    return ( 
        <Modal 
            open={show}
            onCancel={() => { setShow(false);}} 
            footer = {null}
            width={screenSize > 700 ? screenSize-300 : 300}
        >
            <h2>{t('cerez_politikasi1')}</h2>
            <br/>
            <hr/>
            <br/>
            <h3>{t("cerez_politikasi1")}</h3>
            <p>{t("cerez_politikasi2")}</p>
            <p>{t("cerez_politikasi3")}</p>
            <br/>
            <h3>{t("cerez_politikasi4")}</h3>
            <p>{t("cerez_politikasi5")}</p>
            <br/>
            <h3>{t("cerez_politikasi6")}</h3>
            <p>{t("cerez_politikasi7")}</p>
            <br/>
            <h3>{t("cerez_politikasi8")}</h3>
            <p>{t("cerez_politikasi9")}</p>
            <br/>
            <h3>{t("cerez_politikasi10")}</h3>
            <p>{t("cerez_politikasi11")}</p>
            <br/>
            <h3>{t("cerez_politikasi12")}</h3>
            <p>{t("cerez_politikasi13")}</p>
            <p>{t("cerez_politikasi14")}</p>
            <p>{t("cerez_politikasi15")}</p>
            <br/>
            <h3>{t("cerez_politikasi16")}</h3>
            <p>{t("cerez_politikasi17")}</p>
            <br/>
            <h3>{t("cerez_politikasi18")}</h3>
            <p>{t("cerez_politikasi19")}</p>
            <ul>
                <li>{t("cerez_politikasi20")}</li>
                <li>{t("cerez_politikasi21")}</li>
                <li>{t("cerez_politikasi22")}</li>
                <li>{t("cerez_politikasi23")}</li>
                <li>{t("cerez_politikasi24")}</li>
            </ul>
            <br/>
            <h3>{t("cerez_politikasi25")}</h3>
            <p>{t("cerez_politikasi26")}</p>
            <p>{t("cerez_politikasi27")}</p>
            <p>{t("cerez_politikasi28")}</p>
            <p>{t("cerez_politikasi29")}</p>
            <p>{t("cerez_politikasi30")}</p>
            <br/>

        </Modal>
    );
}

export default CookiePolicyModal;