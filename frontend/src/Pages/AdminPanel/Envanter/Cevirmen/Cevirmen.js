import { motion } from 'framer-motion';
import { Space, FloatButton, Table, Input } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import AddCevirmenFormModal from './components/AddCevirmenFormModal/AddCevirmenFormModal';
import apiRequest  from '../../../../services';
import throwNotification from '../../../../GeneralFunctions/throwNotification'
import debounce from "lodash.debounce";
import React from 'react';
import CevirmenTable from './components/CevirmenTable.js/CevirmenTable';
import ButtonComponent from '../../../../GeneralComponents/ButtonComponent';
import {Helmet} from 'react-helmet';
import { useUserAuth } from '../../../../Context/UserAuthContext';
const Cevirmen = () => {

    const {user} = useUserAuth();
    const [ modal, setModal ] = React.useState( false );
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(false);
    const [ data, setData ] = React.useState({ translators:[], meta:initialMeta });
    const [ selected, setSelected ] = React.useState([]);
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const getTranslators = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/translator/get'+params, headers:{Authorization:user.token}});
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
        getTranslators();
    }, [query])

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <Helmet>
                <title> Çevirmenler </title>
            </Helmet>
            <div style={{display:'flex', justifyContent:'center', alignItems:'center', marginBottom:20}}>
                <Input allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Çevirmen Adına Göre Arama Yap'/>
                {
                    selected.length > 0 &&
                    <div style={{display:'flex', justifyContent:'center', alignItems:'center', width:200}}>
                        <ButtonComponent style={{color:'red', marginRight:10}}  onClick = { async () => {

                            const deletePublishers = selected.map( item => item.id ) || [];
                            const request = await apiRequest({ 
                                endpoint:'/translator/delete', 
                                body:JSON.stringify({translators:deletePublishers}), 
                                method:'DELETE',
                                headers:{Authorization:user.token}
                            });

                            if ( request.error || !request.responseData || !request.responseData.status ) {
                                throwNotification({
                                    type:'error',
                                    message:'Bir hata oluştu',
                                    description: request.errorMessage || request.responseData.message,
                                    duration:4
                                });
                                console.error('Alınan hata : ', (request.errorMessage || request.responseData.message) );
                            }
                            else{
                                throwNotification({
                                    type:'success',
                                    message:'İşlem Başarılı',
                                    description: 'Çoklu yayınevi silme işlemi başarılı',
                                    duration:3
                                });
                                setQuery({...query});
                                setSelected([]);
                            }
                        }} ><DeleteOutlined/></ButtonComponent> Seçili {selected.length} satırı sil
                    </div>
                }
            </div>
            <CevirmenTable data={data} setData={setData} loading={loading} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} />
            <FloatButton onClick={() => setModal(true)} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>
            <AddCevirmenFormModal modal={modal} setModal={setModal} data={data} setData={setData}/>
        </motion.div>
    );
}

export default Cevirmen;