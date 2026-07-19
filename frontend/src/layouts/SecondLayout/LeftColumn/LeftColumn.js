import React from "react";
import {useTranslation} from "react-i18next";
import "./style.css";
import { CategoriesContainer, PagesContainer, TopUsersContainer} from './components/exportContainers'
import { useScreenSize } from "../../../Context/ResponsiveContext";

const LeftColumn = () => {

    const { t } = useTranslation();
    const { screenSize } = useScreenSize();

    return(
        <div className='leftColumn'>
            {
                screenSize > 750 ?
                <>
                    <PagesContainer/>    
                    <CategoriesContainer/>
                    <TopUsersContainer/>
                </>
                :
                <>
                    <div className="pagesUsersContainer">
                        <PagesContainer/>    
                        <TopUsersContainer/>
                    </div>
                    <CategoriesContainer/>
                </>
            }

        </div>
    )
}
export default LeftColumn;