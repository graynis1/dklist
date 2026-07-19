import React, {useContext, createContext } from "react";

const ResponsiveContext = createContext()
const useScreenSize = () => {return useContext(ResponsiveContext)}

const ResponsiveContextProvider = ({children}) => {

    const [ screenSize, setScreenSize ] = React.useState(window.innerWidth);

    React.useEffect(() => {
        const handleResize = () => {setScreenSize(window.innerWidth);}
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); };
    }, []);

    const data = { screenSize, setScreenSize }

    return(
        <ResponsiveContext.Provider value={ data }>
            {children}
        </ResponsiveContext.Provider>
    )
}
export{
    useScreenSize,
    ResponsiveContextProvider
}