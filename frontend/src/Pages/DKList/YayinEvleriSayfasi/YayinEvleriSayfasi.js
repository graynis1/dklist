import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import { NavLink } from "react-router-dom";
import { Input, Pagination, Spin } from "antd";
import debounce from "lodash.debounce";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";
import throwNotification from "../../../GeneralFunctions/throwNotification";


const YayinEvleriSayfasi = () => {

    const { i18n, t } = useTranslation(); 
    const [ publishers, setPublishers ] = React.useState([])
    const { user } = useUserAuth();
    const [loading, setLoading] = React.useState(true);
    const [ query, setQuery ] = React.useState({
        pagePerSize:100,
        page:1,
        search:'',
        sortBy:'name',
        orderBy:'ASC'
    });
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ publishers:[], meta:initialMeta });


    const getPublishers = React.useCallback( async () => {

        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        
        const request = await apiRequest({endpoint:'/publisher/get'+params, headers:{Authorization:user.token}});
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
            setData( { publishers:data, meta:meta } );
        }

        setLoading(false);
    }, [query, user.token]);

    const debouncedHandleChange = React.useMemo(() => {
        return debounce((value) => {
            setQuery( { ...query, search: value, page:1, } );
        }, 700);
    }, [setQuery, query]);

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    React.useEffect(() => {
        getPublishers();
    }, [query, getPublishers])

    return(
        <>
            <Helmet>
                <title>{t('YayinEvleriSayfasi')}</title>
            </Helmet>
            <div className="yayinEvleriContainer dkBox">
                <div className="yayinevleriContainerHeader">
                    <span style={{fontSize:24, color:'rgba(0,0,0,.8)', fontWeight:600}} >{t('yayinevleri')}</span>
                    <Input  className="searchPublisherInput" placeholder={t('yayineviara')} onChange={(e) => { debouncedHandleChange(e.target.value);}}/>
                </div>
                {
                    loading ? 
                    <Spin size="large" style={{margin:'20px auto'}} />
                    :
                    data.publishers && data.publishers.length > 0 ?
                        data.publishers.map( (publisher, index) => {
                            return(
                                <NavLink
                                    to={t('/yayinevi') + '/' + publisher.slug } 
                                    state={{publisherID:publisher.id, name:publisher.name}} 
                                    key={index} 
                                    className="publisherItem"
                                >
                                    {publisher.name}
                                </NavLink>
                            )
                        })
                        :
                        <div>{t('henuzEklenmemis')}</div>
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
export default YayinEvleriSayfasi;