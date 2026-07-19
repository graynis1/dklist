import React from 'react';
import { motion } from 'framer-motion';
import YazarTable from './components/YazarTable/YazarTable';
import YazarAddForm from './components/YazarAddForm/YazarAddForm';
import {Input} from "antd";
import debounce from "lodash.debounce";
import throwNotification from "../../../../GeneralFunctions/throwNotification";
import ButtonComponent from "../../../../GeneralComponents/ButtonComponent";
import {DeleteOutlined} from "@ant-design/icons";
import {Helmet} from 'react-helmet';
import { useUserAuth } from '../../../../Context/UserAuthContext';
import apiRequest from '../../../../services';

const Yazar = () => {

    const {user} = useUserAuth();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(false);
    const [ data, setData ] = React.useState({ writers:[], meta:initialMeta });
    const [ selected, setSelected ] = React.useState([]);
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });


    const getWriters = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/writer/get'+params});
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
            setData( { writers:data, meta:meta } );
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
        getWriters();
    }, [query])

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'row', height:'100%', justifyContent:'space-around' }}>

            <Helmet>
                <title>Yazarlar</title>
            </Helmet>

            <div style={{ width:800, height:'80vh'}}>
                <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Yazar Adına Göre Arama Yap'/>
                <YazarTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected}/>
            </div>      

            <div style={{ width:600, height:100, marginLeft:40 }}>
                <YazarAddForm query={query} setQuery={setQuery} data={data} setData={setData}/>
                {
                    selected.length > 0 &&
                    <div style={{marginTop:30}}>
                        <hr style={{marginBottom:30}}></hr>
                        <ButtonComponent style={{color:'red'}}  onClick = { async () => {

                            const body = JSON.stringify({writers:[...selected.map( selectedItem => selectedItem.id )]});

                            const request = await apiRequest( { body:body, endpoint:'/writer/delete', method:'DELETE', headers:{Authorization:user.token} } );
                            
                            if ( request.error || !request.responseData.status ) {
                                throwNotification({
                                    type:'error',
                                    message:'Bir hata oluştu',
                                    description: request.errorMessage ||request.responseData.message,
                                    duration:3
                                });
                                console.error('Alınan hata : ', request.errorMessage);
                            }
                            else{

                                throwNotification({
                                    type:'success',
                                    message:'İşlem Başarılı',
                                    description: 'Çoklu Silme İşlemi Başarılı',
                                    duration:3
                                });

                                setQuery({...query});
                                setSelected([]);
                            }


                        }} ><DeleteOutlined/></ButtonComponent> Seçili {selected.length} satırı sil
                    </div>
                }
            </div>
        
        </motion.div>
    );
}

export default Yazar;