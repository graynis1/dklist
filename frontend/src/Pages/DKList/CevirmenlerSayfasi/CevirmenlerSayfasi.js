import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import CardItem from "../../../GeneralComponents/CardItem/CardItem";
import { Input, Pagination, Spin } from "antd";
import debounce from 'lodash.debounce';
import './style.css';
import { EyeOutlined } from "@ant-design/icons";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";

const CevirmenlerSayfasi = () => {

    const { i18n, t } = useTranslation(); 
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        sortBy:'name',
        orderBy:'ASC',
        search:'',
    });
    
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ translators:[], meta:initialMeta });
    const [loading, setLoading] = React.useState(true);
    const { user } = useUserAuth();

    const getTranslators = React.useCallback( async () => {

        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
       
        const request = await apiRequest({endpoint:'/translator/get-translators-for-client'+params, headers:{Authorization:user.token}});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            const meta = request.responseData.response.meta;
            const data = request.responseData.response.data;
            setData( { translators:data, meta:meta } );
        }

        setLoading(false);

    }, [query]);

    const debouncedHandleChange = React.useMemo(() => {
        return debounce((value) => {
            setQuery( { ...query, search: value, page:1 } );
        }, 700);
    }, [setQuery, query]);

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    React.useEffect(() => {
        getTranslators();
    }, [query, getTranslators])

    return(
        <>
            <Helmet>
                <title>{t('ÇevirmenlerSayfasi')}</title>
            </Helmet>

            <div className="cevirmenlerContainer dkBox">

                <div className="cevirmenlerHeader">
                    <h2 style={{color:'rgba(0, 0, 0, 0.7)'}}> {t('cevirmenler')} </h2>
                    <Input onChange={(e) => { debouncedHandleChange(e.target.value); }} placeholder={t('cevirmenara')}/>
                    <div style={{width:'100%', height:1, backgroundColor:'rgba(0, 0, 0, 0.2)'}}></div>
                </div>

                {
                    !loading ?
                    <div className="cevirmenlerBody">
                        {
                            data.translators && data.translators.length > 0 ? data.translators.map( (item, index) => {
                                return(
                                    <CardItem
                                        key={index}
                                        score={item.score}
                                        image={item.image}
                                        imageHref={t('/cevirmen')+'/'+item.slug}
                                        contentHeight={75}
                                        content={
                                            <>
                                                <NavLink style={{textDecoration:'none', color:'#0471a3'}} to={t('/cevirmen')+'/'+item.slug}>{item.name}</NavLink>
                                                <span style={{color:'rgba(0,0,0,.6)'}}><EyeOutlined style={{marginRight:5}}/>{item.view + ' ' + t('inceleme')}</span>
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </>
                                        }
                                    />
                                )
                            })
                            :
                            <p>{'henuzEklenmemis'}</p>
                        }
                    </div>
                    :
                    <div style={{width:'100%', height:50, display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large" /></div>
                }

                <Pagination
                    total           = {data.meta.filteredCount ? data.meta.filteredCount : 0}
                    current         = {query ? query.page : 0}
                    pageSize        = {query ? query.pagePerSize : 10}
                    onChange        = {( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });}}
                    showSizeChanger = {true}
                    style={{marginRight:40, width:'100%', textAlign:'right'}}
                />
            </div>
        </>
    )
}
export default CevirmenlerSayfasi;