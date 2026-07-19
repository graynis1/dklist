import React from 'react';
import { motion } from 'framer-motion';
import YayinEviTable from './components/YayinEviTable/YayinEviTable';
import YayinEviAddForm from './components/YayinEviAddForm/YayinEviAddForm';
import throwNotification from "../../../../GeneralFunctions/throwNotification";
import debounce from "lodash.debounce";
import {Alert, Input} from "antd";
import ButtonComponent from "../../../../GeneralComponents/ButtonComponent";
import {DeleteOutlined} from "@ant-design/icons";
import {Helmet} from "react-helmet";
import { useUserAuth } from '../../../../Context/UserAuthContext';
import apiRequest from '../../../../services';

const YayinEvi = () => {

    const {user} = useUserAuth();
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const initialMeta               = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ]         = React.useState({ publishers:[], meta:initialMeta });
    const [ loading, setLoading ]   = React.useState(false);
    const [ selected, setSelected ] = React.useState([]);

    const getPublishers = async () => {

        setLoading(true);

        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;

        const request = await apiRequest({endpoint:'/publisher/get'+params});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: 'Bir hata oluştu!',
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
        getPublishers();
    }, [query]);

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ display:'flex', flexDirection:'row', height:'100%', justifyContent:'space-around' }}>

            <Helmet>
                <title> Yayın Evi </title>
            </Helmet>

            <div style={{ width:600, height:'80vh'}}>
                <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Yayınevi Adına Göre Arama Yap'/>
                <YayinEviTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} />
            </div>      

            <div style={{ width:600, height:100, marginLeft:40 }}>

                <YayinEviAddForm query={query} setQuery={setQuery} data={data} setData={setData} />

                {
                    selected.length > 0 &&
                    <div>
                        <div style={{marginTop:30}}>
                            <hr style={{marginBottom:30}}></hr>

                            <Alert
                                style={{marginBottom:30}}
                                message="Bir yayın evi silindiğinde sahibi olduğu kitaplarda silinir bu yüzden dikkatli olun!"
                                type="warning"
                                showIcon
                            />
                            
                            <ButtonComponent style={{color:'red'}}  onClick = { async () => {

                                const deletePublishers = selected.map( item => item.name ) || [];

                                const request = await apiRequest({ endpoint:'/publisher/delete', body:JSON.stringify({publishers:deletePublishers}), method:'DELETE', headers:{Authorization:user.token} });

                                if ( request.error || !request.responseData || !request.responseData.status ) {
                                    throwNotification({
                                        type:'error',
                                        message:'Bir hata oluştu',
                                        description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                                        duration:4
                                    });
                                    console.error('Alınan hata : ', request.errorMessage);
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
                    </div>
                }
            </div>

        </motion.div>
    );
}

export default YayinEvi;