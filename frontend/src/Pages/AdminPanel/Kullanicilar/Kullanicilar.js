import React from 'react';
import { motion } from 'framer-motion';
import { FloatButton, Input } from 'antd';
import { Helmet } from 'react-helmet';
import debounce from 'lodash.debounce';
import apiRequest from '../../../services';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import KullaniciTable from './KullaniciTable/KullaniciTable';
import { useUserAuth } from '../../../Context/UserAuthContext';
import { DeleteOutlined } from '@ant-design/icons';

const Kullanicilar = () => {

    const {user} = useUserAuth();
    const [ loading, setLoading ] = React.useState(false);
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ users:[], meta:initialMeta });
    const [ selectedRows, setSelectedRows ] = React.useState([]);
    const [ selectOptions, setSelectOptions ] = React.useState({badges:[]});
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const getUserBadges = async () => {

        const request = await apiRequest({endpoint:'/user/get-user-badges'});

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
            setSelectOptions({badges:request.responseData.response});
        }
    }

    const getUsers = React.useCallback( async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/user/get-for-admin'+params, headers:{Authorization:user.token}});
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
            setData( { users:data.filter( item => !item.userType.includes('SuperAdmin') ), meta:meta } );
        }
        await getUserBadges();
        setLoading(false);
    }, [query, user]);

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
        getUsers();
    }, [getUsers])

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            
            <Helmet>
                <title>Kullanıcılar</title>
            </Helmet>
            <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Arama Yapın'/>
            <KullaniciTable selectedRows={selectedRows} setSelectedRows={setSelectedRows} loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selectOptions={selectOptions} setSelectOptions = {setSelectOptions} />
            
            {
                selectedRows.length > 0 &&
                <FloatButton.Group
                    shape="circle"
                    style={{
                        right: 50,
                    }}
                >
                    <FloatButton 
                        icon={<DeleteOutlined style={{color:'red'}}/>}
                        badge={{ count: selectedRows.length }} 
                        onClick={ async () => {
                            const body = JSON.stringify({users:[...selectedRows.map( selectedItem => selectedItem.id )]});
                            const request = await apiRequest( { body:body, endpoint:'/user/delete-user-admin', headers:{Authorization:user.token}, method:'DELETE' } );
                            if ( request.error || !request.responseData.status ) {
                                throwNotification({
                                    type:'error',
                                    message:'Bir hata oluştu',
                                    description: request.responseData ?  request.responseData.message : 'Kullanıcılar silinirken sunucu taraflı hata oluştu ',
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
                                setSelectedRows([]);
                            }
                        }}
                    />
                </FloatButton.Group>
            }
            
        </motion.div>
    );
}

export default Kullanicilar;