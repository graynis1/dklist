import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useParams } from "react-router-dom";
import CardItem from "../../../GeneralComponents/CardItem/CardItem";
import { FloatButton, Pagination, Select, Spin, Input } from "antd";
import { useScreenSize } from "../../../Context/ResponsiveContext";
import './style.css';
import debounce from 'lodash.debounce';
import apiRequest from "../../../services";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import AddKitapModal from "./AddKitapModal";


const KitaplarSayfasi = () => {
    const { screenSize } = useScreenSize(); 
    const { categorySlug, publisherSlug } = useParams();
    const { t } = useTranslation(); 
    const [ option, setOption ] = React.useState({ id:null, type:null, name:null });
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        option:1,
        sortBy:'viewCount',
        orderBy:'DESC',
        search:'',
        read:false
    });
    
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ books:[], meta:initialMeta });
    const [loading, setLoading] = React.useState(false);
    const { user } = useUserAuth();
    const location = useLocation();
    const [modal, setModal] = React.useState(false);

    const getBooks = React.useCallback( async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        if (option.id && option.type ) {
            params = params+'&optionID='+option.id+'&optionType='+option.type
        }
        if (query.read) {
            params = params+'&readQuery='+1
        }
        const request = await apiRequest({endpoint:'/books'+params, headers:{Authorization:user.token}});
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
            setData( { books:data, meta:meta } );
        }

        setLoading(false);

    }, [query, option]);

    React.useEffect(() => {
        if ( categorySlug && location.state && location.state.name && location.state.categoryID) {
            setOption({name:location.state.name, id:location.state.categoryID, type:'category' })
        }
        else if( publisherSlug && location.state && location.state.name && location.state.publisherID){
            setOption({name:location.state.name, id:location.state.publisherID, type:'publisher' })
        }
        else{
            setOption({ id:null, type:null, name:null });
        }
    }, [categorySlug, publisherSlug])

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
        getBooks();
    }, [query, option, getBooks])

    return(
        <>
            <Helmet>
                <title>{t('KitaplarSayfasi')}</title>
            </Helmet>

            <div className="kitaplarContainer dkBox">

                {
                    user.publisher && JSON.parse(user.publisher) && <FloatButton onClick={() => setModal(true)} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>   
                }

                <AddKitapModal modal={modal} setModal={setModal} setter={() => { setQuery({...query}) }} />

                <div className="kitaplarHeader">
                    <h2 style={{color:'rgba(0, 0, 0, 0.7)'}}> {t('kitaplar') + ' ' + ( option.name ? ' / ' + option.name : '' )} </h2>
                    <Select
                        defaultValue={query.option}
                        style={{
                            width: 200,
                            marginRight:screenSize > 600 ? 0 : 0,
                            marginTop:screenSize < 600 ? 10 : 0,
                        }}
                        options={[ { label: t('enCokZiyaretEdilenler'), value: 1 }, { label: t('enCokOkunanlar'), value: 2 }, { label: t('enSonEklenenler'), value: 3 }, { label: t('enCokPuanAlıyorlar'), value: 4 } ]}
                        onChange={(selectedValue) => { 
                            switch (selectedValue) {
                                case 2:
                                    setQuery({...query, read:true});
                                    break;
                                case 3:
                                    setQuery({...query, sortBy:'id', read:false});
                                    break;
                                case 4:
                                    setQuery({...query, sortBy:'score', read:false});
                                    break;
                                default:
                                    setQuery({...query, sortBy:'viewCount', read:false});
                                    break;
                            }
                        }}
                    />
                </div>

                <div>
                    <Input style={{ marginBottom:20, width:'100%'}} placeholder={t('kitap_arayin')} onChange={(e) => { debouncedHandleChange(e.target.value); }} />
                </div>

                <div style={{width:'100%', height:1, marginBottom:20, backgroundColor:'rgba(0,0,0,.1)'}}/>

                {
                    loading ?
                    <div style={{width:'100%', height:300, display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large"/></div>
                    :
                    <div className="kitaplarBody">
                        {
                            data.books.length > 0 ? data.books.map( (item) => {
                                return(
                                    <CardItem
                                        score={item.score}
                                        key={item.id}
                                        image={item.image}
                                        imageHref={t('/kitap')+'/'+item.slug}
                                        content={
                                            <>
                                                <NavLink style={{textDecoration:'none', color:'#0471a3'}} to={t('/kitap')+'/'+item.slug} >{item.name}</NavLink>
                                                <NavLink style={{textDecoration:'none', color:'#0471a3'}} to={t('/yazar')+'/'+item.writer.slug} >{item.writer.name}</NavLink>
                                                <NavLink style={{textDecoration:'none', color:'#0471a3'}} to={t('/yayinevi')+'/'+item.publisher.slug} >{item.publisher.name}</NavLink>
                                                <span style={{color:'rgba(0,0,0,.6)'}}><EyeOutlined style={{marginRight:5}}/>{(item.viewCount > 10000 ? '10k +' : item.viewCount) + ' ' + t('inceleme')}</span>
                                            </>
                                        }
                                    />
                                )
                            })
                            :
                            <p style={{marginBottom:20}}>{'sonucBulunamadi'}</p>
                        }
                        <Pagination
                            total           = {data.meta.filteredCount ? data.meta.filteredCount : 0}
                            current         = {query ? query.page : 0}
                            pageSize        = {query ? query.pagePerSize : 10}
                            onChange        = {( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });}}
                            showSizeChanger = {true}
                            style={{marginRight:40, width:'100%', marginBottom:30, textAlign:'right'}}
                        />
                    </div>  
                }
                    
            </div>
        </>
    )
}
export default KitaplarSayfasi;


// pagination={{
//     position    : ['none', 'bottomRight'],
// }}