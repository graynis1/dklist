import React, {useContext, createContext } from "react";

const UserAuthContext = createContext()
const useUserAuth = () => {return useContext(UserAuthContext)}

const UserAuthContextProvider = ({children}) => {

    const [ user, setUser ] = React.useState({
        username  : localStorage.getItem('username') ? localStorage.getItem('username')  : null,
        token     : localStorage.getItem('token')    ? localStorage.getItem('token')     : null,
        id        : localStorage.getItem('id')       ? localStorage.getItem('id')        : null,
        userType  : localStorage.getItem('userType') ? localStorage.getItem('userType')  : null,
        publisher : localStorage.getItem('publisher') ? localStorage.getItem('publisher') : null,
        img       : localStorage.getItem('img')      ? (localStorage.getItem('img') !== 'null' ? localStorage.getItem('img') : null) : null,
    });
    
    const [userLogin, setUserLogin] = React.useState(false);

    const data = { user, setUser, userLogin, setUserLogin }

    React.useEffect(() => {
        if ( user.username && user.id && user.token ) {
            localStorage.setItem('username',user.username);
            localStorage.setItem('token',user.token);
            localStorage.setItem('img',user.img);
            localStorage.setItem('id',user.id);
            localStorage.setItem('userType',user.userType);
            localStorage.setItem('publisher', user.publisher);
            setUserLogin(true);
        }
        else{
            setUserLogin(false);
        }
    }, [user]);

    
    return(
        <UserAuthContext.Provider value={ data }>
            {children}
        </UserAuthContext.Provider>
    )
}
export{
    useUserAuth,
    UserAuthContextProvider
}