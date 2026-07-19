import { Spin } from "antd";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MyRouter = () => {

    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {

        if (location.pathname.includes('/yazar/')) {
            navigate('/writer/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/writer/')){
            navigate('/yazar/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if (location.pathname.includes('/kitap/')) {
            navigate('/book/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/book/')){
            navigate('/kitap/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if (location.pathname.includes('/cevirmen/')) {
            navigate('/translator/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/translator/')){
            navigate('/cevirmen/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if (location.pathname.includes('/askida-kitap/')) {
            navigate('/store/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/store/')){
            navigate('/askida-kitap/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if (location.pathname.includes('/akis/')) {
            navigate('/flow/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/flow/')){
            navigate('/akis/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if (location.pathname.includes('/blogs/')) {
            navigate('/bloglar/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else if(location.pathname.includes('/bloglar/')){
            navigate('/blogs/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
        }
        else{
            navigate('/');
        }
    })

    return(
        <div style={{width:'100vw', height:'100vh', boxSizing:'border-box', display:'flex', justifyContent:'center', alignItems:'center'}}>
            <Spin size="large"/>
        </div>
    )
}

export default MyRouter;