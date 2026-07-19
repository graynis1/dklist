import React from "react";
import { useUserAuth } from "../Context/UserAuthContext";
import { Navigate } from "react-router-dom";
const ProtectedRoute = ({homeUrl, render}) => {
    const { user } = useUserAuth();
    const auth = ['SuperAdmin', 'Admin', 'Mod'].includes(user.userType);
    return(
        <>  
            {
                auth 
                ?
                render
                :
                <Navigate to={homeUrl}/>
            }
        </>
    )
}
export default ProtectedRoute;