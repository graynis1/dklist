import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import './style.css';
import LeftColumn from "./LeftColumn/LeftColumn";
import RightColumn from "../RightColumn/RightColumn";
import { useScreenSize } from "../../Context/ResponsiveContext";
import { useTranslation } from "react-i18next";
import Kapak from "./Kapak";


const DKListSecondLayout = () => {

    const { screenSize } = useScreenSize();
    const location = useLocation();
    const { i18n, t } = useTranslation();

    return(
        <div className="dklistSecondLayout" style={{marginTop:screenSize <= 750 ? 0 : 20}}>
            {
                location.pathname === t('/akis') 
                ?
                    screenSize > 750 ?
                    <>
                        <Kapak />
                        <LeftColumn/>
                        <div className="middleColumn">
                            <Outlet/>
                        </div>
                        <RightColumn/>
                    </>
                    :
                    <>
                        <Kapak />
                        <RightColumn/>
                        <LeftColumn/>
                        <div className="middleColumn">
                            <Outlet/>
                        </div>
                    </>
                :
                <>
                    <LeftColumn/>
                    <div className="middleColumn-2">
                        <Outlet/>
                    </div>
                </>
            }

        </div>
    )
}
export default DKListSecondLayout;