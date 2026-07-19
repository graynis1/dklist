import React from 'react';
import { motion } from 'framer-motion';
import {Alert, Input, Spin} from 'antd';
import KategoriTable from "./components/KategoriTable/KategoriTable";
import throwNotification from "../../../../GeneralFunctions/throwNotification";
import debounce from "lodash.debounce"; 
import AddKategoriForm from './components/AddKategoriForm/AddKategoriForm';
import { DeleteOutlined } from '@ant-design/icons';
import ButtonComponent from '../../../../GeneralComponents/ButtonComponent';
import {Helmet} from 'react-helmet';
import apiRequest from '../../../../services';
import { useUserAuth } from '../../../../Context/UserAuthContext';



const Kategori = () => {

    const {user} = useUserAuth();
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ categories:[], meta:initialMeta });
    const [ loading, setLoading ] = React.useState(false);
    const [ selected, setSelected ] = React.useState([]);

    const getAllCategories = async () => {
        
        setLoading(true);

        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;

        const request = await apiRequest({endpoint:'/category/get'+params});

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
            setData( { categories:data, meta:meta } );
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
        getAllCategories();
    }, [query]);

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center' }} >
            <Helmet>
                <title>Kategori</title>
            </Helmet>
            <div style={{width:1200, height:820, display:'flex', flexDirection:'row', justifyContent:'center', alignItems:'center', backgroundColor:'#f5f5f5'}}>

                <div style={{width: 800, height: 800, padding:20}}>
                    <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Kategori Adına Göre Arama Yap'/>
                    <KategoriTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected}/>
                </div>

                <div style={{ width:400, height:800, padding:20 }}>

                    <h3 style={{marginTop:0}}>Toplam Sonuç Sayısı : { !data.meta ? <Spin/> : data.meta.filteredCount}</h3>
                    
                    <div style={{ width:360, height:120, display:'flex', flexDirection:'column', justifyContent:'space-around', alignItems:'flex-start'}}>
                        <AddKategoriForm loading={loading} data={data} setData={setData} query={query} setQuery={setQuery}/>
                    </div>

                    <Alert style={{padding:5}} closable type='info' description={
                        <ul>
                            <p> - <span style={{color:'blue', fontWeight:700}}>Aşk@Love</span> türkçesi '<span style={{color:'blue', fontWeight:700}}>Aşk</span>', İngilizcesi 'Love' olan bir kategori ekler</p>
                            <p> - <span style={{color:'blue', fontWeight:700}}>Aşk</span> sadece '<span style={{color:'blue', fontWeight:700}}>Aşk</span>' kategorisinin türkçesini ekler</p>
                            <p> - <span style={{color:'blue', fontWeight:700}}>Aşk@Love , Komedi</span> Türkçesi '<span style={{color:'blue', fontWeight:700}}>Aşk</span>' İngilizcesi 'Love' olan bir kategori ile sadece Türkçesi '<span style={{color:'blue', fontWeight:700}}>Komedi</span>' olan bir kategori ekler</p>
                        </ul>
                    }/>

                    {
                        selected.length > 0 &&
                        <div style={{marginTop:30}}>
                            <hr style={{marginBottom:30}}></hr>
                            <ButtonComponent style={{color:'red'}}  onClick = { async () => {

                                const deletedCategories = selected.map( item => item.category ) || [];

                                const request = await apiRequest({ endpoint:'/category/delete', body:JSON.stringify({categories:deletedCategories}), method:'DELETE', headers:{Authorization:user.token} });

                                if ( request.error || !request.responseData || !request.responseData.status ) {
                                    throwNotification({
                                        type:'error',
                                        message:'Bir hata oluştu',
                                        description: request.errorMessage || request.responseData.message,
                                        duration:3
                                    });
                                    console.error('Alınan hata : ', (request.errorMessage || request.responseData.message) );
                                }

                                const deletedItemsIDs = request.responseData.response.map( item => item.id );
                                setData({...data, categories: data.categories.filter( item => !deletedItemsIDs.includes( item.id ) )})
                                setQuery({...query});
                                setSelected([]);
                            }} ><DeleteOutlined/></ButtonComponent> Seçili {selected.length} satırı sil
                        </div>
                    }

                </div>
                
            </div>
        </motion.div>
    );
}
export default Kategori;