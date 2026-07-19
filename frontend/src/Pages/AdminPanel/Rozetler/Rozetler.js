import React from 'react';
import { motion } from 'framer-motion';
import {FloatButton, Input} from "antd";
import debounce from "lodash.debounce";
import {DeleteOutlined, PlusOutlined} from "@ant-design/icons";
import RozetTable from "./components/RozetTable/RozetTable";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import ButtonComponent from "../../../GeneralComponents/ButtonComponent";
import RozetAddFormModal from './components/RozetAddFormModal/RozetAddFormModal';
import {Helmet} from 'react-helmet';
import { useUserAuth } from '../../../Context/UserAuthContext';
import apiRequest from '../../../services';

const Rozetler = () => {

    const {user} = useUserAuth();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(false);
    const [ data, setData ] = React.useState({ badges:[], meta:initialMeta });
    const [ modal, setModal ] = React.useState(false);
    const [ selected, setSelected ] = React.useState([]);
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const getBadges = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/badge/get'+params});
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
            setData( { badges:data, meta:meta } );
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
        getBadges();
    }, [query])

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'row', height:'100%', justifyContent:'space-around' }}>

            <Helmet>
                <title>Rozetler</title>
            </Helmet>

            <div style={{ width:'100%', height:'80vh'}}>
                <div  style={{marginBottom:20, display:'flex', flexDirection:'row', justifyContent:'center', alignItems:'center', height:60}} >
                    <Input allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Rozet Adına Göre Arama Yap'/>
                    {
                        selected.length > 0 &&
                        <div style={{width:200, marginLeft:10}}>
                            <ButtonComponent style={{color:'red'}}  onClick = { async () => {
                                const body = JSON.stringify({badges:[...selected.map( selectedItem => selectedItem.id )]});

                                const request = await apiRequest( { body:body, endpoint:'/badge/delete', headers:{Authorization:user.token}, method:'DELETE' } );
                                if ( request.error || !request.responseData.status ) {
                                    throwNotification({
                                        type:'error',
                                        message:'Bir hata oluştu',
                                        description: request.responseData ?  request.responseData.message : 'Rozetler silinirken sunucu taraflı hata oluştu ',
                                        duration:3
                                    });
                                    request.errorMessage && console.error('Alınan hata : ', request.errorMessage );
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
                <RozetTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected}/>
            </div>
            <RozetAddFormModal data={data} setData={setData} modal={modal} setModal={setModal}/>
            <FloatButton onClick={() => setModal(true)} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>
        </motion.div>
    );
}

export default Rozetler;