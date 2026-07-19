import React from "react";
import { useTranslation } from "react-i18next";

const Kapak = () => {

    const { t } = useTranslation();
    return(
        <div className="kapakContainer">
            <p>{t('xxxsoz')}</p>
            <h1>Lev Nikolayeviç Tolstoy</h1>
            <img src={"/images/kapak.jpg"} alt="DK - List"/>
        </div>
    );
}

export default Kapak;