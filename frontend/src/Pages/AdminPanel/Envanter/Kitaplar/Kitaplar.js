import React from 'react';
import { motion } from 'framer-motion';
import { FloatButton, Input} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Helmet } from 'react-helmet';
import AddKitapModal from './components/AddKitapModal/AddKitapModal';
import throwNotification from '../../../../GeneralFunctions/throwNotification';
import debounce from 'lodash.debounce';
import KitapTable from './components/KitapTable/KitapTable';
import apiRequest from '../../../../services';
import { useUserAuth } from '../../../../Context/UserAuthContext';

const Kitaplar = () => {
    const {user} = useUserAuth();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(false);
    const [ data, setData ] = React.useState({ books:[], meta:initialMeta });
    const [ selectOptions, setSelectOptions ] = React.useState({categories:[], translators:[], writers:[]});
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'approve',
        orderBy:'ASC'
    });
    
    const [ modal, setModal ] = React.useState( false );

    const getBookSelectOptions = async () => {

        const request = await apiRequest({endpoint:'/book/get-options', headers:{Authorization:user.token}});

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
            setSelectOptions(request.responseData.response)
        }
    }

    const getBooks = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
        const request = await apiRequest({endpoint:'/book/get'+params});
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
        await getBookSelectOptions();
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
        getBooks();
    }, [query])


    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            
            <Helmet>
                <title>Kitaplar</title>
            </Helmet>

            <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Orjinal ve Gözüken Kitap İsmine Göre Arama Yapar'/>

            <KitapTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} selectOptions={selectOptions} setSelectOptions = {setSelectOptions} />
            
            <FloatButton onClick={() => setModal(true)} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>

            <AddKitapModal modal={modal} setModal={setModal} data={data} setData={setData}/>

        </motion.div>
    );
}

export default Kitaplar;