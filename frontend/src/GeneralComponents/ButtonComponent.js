import { Button } from "antd";
import React from "react";

const ButtonComponent = ( props ) => {

    const [ loading, setLoading ] = React.useState( false );

    const handleOnClick = async () => {
        setLoading( true );
        props.onClick && await props.onClick();
        setLoading( false );
    }

    return <Button {...props} loading={props.loading || loading} onClick={ () => { handleOnClick() } } >{props.children}</Button>
}
export default ButtonComponent