import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import debounce from "lodash.debounce"; 
import apiRequest from '../../../services';
import BultenTable from './components/BultenTable';
import { useUserAuth } from '../../../Context/UserAuthContext';
import { Input } from 'antd';


const Bulten = () => {

    const {user} = useUserAuth();
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });

    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ newsletters:[], meta:initialMeta });
    const [ loading, setLoading ] = React.useState(false);

    const getNewsletters = async () => {
        
        setLoading(true);

        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;

        const request = await apiRequest({endpoint:'/newsletter/get'+params});

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
            setData( { newsletters:data, meta:meta } );
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
        getNewsletters();
    }, [query]);

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            
            <Helmet>
                <title>Bülten</title>
            </Helmet>

            <Input allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Mail Ara' style={{marginBottom:20}}/>
            <BultenTable data={data} setData={setData} query={query} loading={loading} setQuery={setQuery} />
        </motion.div>
    );
}

export default Bulten;