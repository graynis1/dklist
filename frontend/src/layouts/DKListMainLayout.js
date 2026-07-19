import React from "react";
import HeaderComponent from "../GeneralComponents/Header/Header";
import Footer from "../GeneralComponents/Footer/Footer";
import { Outlet } from "react-router-dom";
import { ProfileContextProvider } from "../Context/UserProfileContext";
import UserProfileDrawer from "../GeneralComponents/UserProfileDrawer/UserProfileDrawer";

const DKListMainLayout = () => {

    return(
        <ProfileContextProvider>
            <HeaderComponent/>
            <Outlet/>
            <Footer/>
            <UserProfileDrawer/>            
        </ProfileContextProvider>
    )
}
export default DKListMainLayout;