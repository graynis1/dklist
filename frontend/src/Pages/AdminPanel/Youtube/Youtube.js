import React from 'react';
import { motion } from 'framer-motion';
import { FloatButton, Input} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Helmet } from 'react-helmet';
import debounce from 'lodash.debounce';
import apiRequest from '../../../services';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import AddVideoModal from './components/AddYoutubeModal';
import { useUserAuth } from '../../../Context/UserAuthContext';
import YoutubeVideosTable from './components/YoutubeVideosTable';



const Youtube = () => {

    const {user} = useUserAuth();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(false);
    const [ data, setData ] = React.useState({ videos:[], meta:initialMeta });
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC'
    });
    const [ modal, setModal ] = React.useState( false );

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

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <Helmet>
                <title>Youtube</title>
            </Helmet>
            <Input style={{marginBottom:20}} allowClear onChange={(e) => { !loading && debouncedHandleChange(e.target.value); }} placeholder='Orjinal ve Gözüken Kitap İsmine Göre Arama Yapar'/>
            <FloatButton onClick={() => setModal(true)} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>
            <YoutubeVideosTable loading={loading} data={data} setData={setData} query={query} setQuery={setQuery} />
            <AddVideoModal modal={modal} setModal={setModal} data={data} setData={setData}/>
        </motion.div>
    );
}

export default Youtube;