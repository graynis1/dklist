import React, { useRef } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import { Input, Pagination } from "antd";
import apiRequest from "../../../services";
import debounce from "lodash.debounce";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useScreenSize } from "../../../Context/ResponsiveContext";

const YoutubeVideo = ({iframe, title}) => {

    const length = 40

    const ref = useRef();

    React.useEffect(() => {
        ref.current.innerHTML = '<span>' + ( title.length > length ? title.slice(0, length)+'...' : title ) + '</span>' + iframe;
    }, []);

    return( <div ref={ref} className="youtubeVideo"> </div>);
}

const VideolarSayfasi = () => {

    const { i18n, t } = useTranslation();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ videos:[], meta:initialMeta });
    const { screenSize } = useScreenSize();
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });
    const [loading, setLoading] = React.useState(true);

    const getVideos = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/youtube/get'+params});
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
            setData( { videos:data, meta:meta } );
        }
        setLoading(false);
    }

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

    React.useEffect( () => {
        getVideos();
    }, [query])


    return(
        <>
            <Helmet>
                <title>{t('videolar')}</title>
            </Helmet>
            <div className="videolarContainer dkBox">
                <h2 style={{color:'rgba(0, 0, 0, 0.7)'}}> {t('videolar')} </h2>
                <Input style={{margin:'20px 0'}} onChange={(e) => { debouncedHandleChange(e.target.value); }} placeholder={t('videoara')}/>
                <div style={{width:'100%', height:1, backgroundColor:'rgba(0, 0, 0, 0.2)', marginBottom:10}}></div>

                <div className="videolarRenderContainer">
                    {
                        data.videos.length > 0 ? data.videos.map(item => {
                            return(
                                <YoutubeVideo 
                                    iframe = {item.embededCode}
                                    title = {item.title}
                                    key = {item.id}
                                    screen = {screenSize}
                                />
                            )
                        })
                        
                        :
                        <div>{t('video_bulunamadi')}</div>
                    }
                </div>

                <Pagination
                    total           = {data.meta.filteredCount ? data.meta.filteredCount : 0}
                    current         = {query ? query.page : 0}
                    pageSize        = {query ? query.pagePerSize : 10}
                    onChange        = {( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });}}
                    showSizeChanger = {true}
                    style={{marginRight:40, width:'100%', marginBottom:30, textAlign:'right'}}
                />
            </div>
        </>
    )
}
export default VideolarSayfasi;