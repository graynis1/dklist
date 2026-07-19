import React from 'react';
import { motion } from 'framer-motion';
import { useUserAuth } from '../../../../Context/UserAuthContext';
import apiRequest from '../../../../services';
import throwNotification from '../../../../GeneralFunctions/throwNotification';
import { Table, Select, Space, Tag, Button, Popconfirm } from 'antd';
import ButtonComponent from '../../../../GeneralComponents/ButtonComponent';


const Iletiler = () => {

    const {user} = useUserAuth();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ loading, setLoading ] = React.useState(true);
    const [ data, setData ] = React.useState({ notices:[], meta:initialMeta });
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        search:'',
        sortBy:'id',
        orderBy:'ASC',
        type:'all'
    });

    const getNotices = async () => {
        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy+'&type='+query.type;
        const request = await apiRequest({endpoint:'/notice'+params, headers:{Authorization:user.token}});
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
            setData( { notices:data, meta:meta } );
        }
        setLoading(false);
    }

    const resolveNotice = async (id) => {
        const request = await apiRequest({ 
            endpoint: `/notice/${id}/resolve`, 
            method: 'PUT', 
            headers: { Authorization: user.token } 
        });

        if (request.error || !request.responseData.status) {
            throwNotification({
                type: 'error',
                duration: 6,
                description: 'Şikayet çözüldü olarak işaretlenirken bir hata meydana geldi',
                message: 'Başarısız'                        
            });
            console.error('Error : ', request.errorMessage || request.responseData.message);
            return false;
        }

        throwNotification({
            type: 'success',
            duration: 3,
            description: 'Şikayet çözüldü olarak işaretlendi',
            message: 'Başarılı'                        
        });
        setQuery({...query});
    };

    React.useEffect( () => {
        getNotices();
    }, [query])

    const columns = [
        { 
            title:'#',
            width:60,
            fixed:'left',
            render:(record) => { return record.id; },
        },
        {
            title:'Tip',
            width:120,
            render:(record) => { 
                const typeMap = {
                    'user_report': 'Kullanıcı Şikayeti',
                    'comment': 'Yorum Şikayeti', 
                    'subComment': 'Alt Yorum Şikayeti'
                };
                return <Tag color={record.type === 'user_report' ? 'red' : 'blue'}>
                    {typeMap[record.type] || record.type}
                </Tag>;
            },
        },
        {
            title:'Şikayet Edilen',
            width:140,
            render:(record) => { 
                if (record.type === 'user_report') {
                    return record.reportedUser ? record.reportedUser.username : '-';
                } else {
                    return record.user ? record.user.username : '-';
                }
            },
        },
        {
            title:'Şikayet Eden',
            width:140,
            render:(record) => { 
                if (record.type === 'user_report') {
                    return record.reporterUser ? record.reporterUser.username : '-';
                } else {
                    return '-';
                            }
            },
        },
        {
            title:'İçerik/Sebep',
            width:300,
            render:(record) => { 
                if (record.type === 'user_report') {
                    return record.reason || '-';
                } else {
                    return record.commentDatas ? record.commentDatas.comment : '-';
                }
            },
        },
        {
            title:'Tarih',
            width:120,
            render:(record) => { 
                return record.createdAt ? new Date(record.createdAt).toLocaleDateString('tr-TR') : '-';
            },
        },
        {
            title:'Durum',
            width:100,
            render:(record) => { 
                return record.isResolved ? 
                    <Tag color="green">Çözüldü</Tag> : 
                    <Tag color="orange">Beklemede</Tag>;
            },
        },
        {
            title:'İşlemler',
            width:200,
            fixed:'right',
            render:(record) => { 
                return (
                    <Space>
                        {!record.isResolved && (
                            <Popconfirm
                                title="Şikayeti çözüldü olarak işaretle?"
                                onConfirm={() => resolveNotice(record.id)}
                                okText="Evet"
                                cancelText="Hayır"
                            >
                                <Button type="primary" size="small">
                                    Çöz
                                </Button>
                            </Popconfirm>
                        )}
                        <Popconfirm
                            title="Şikayeti sil?"
                            onConfirm={async () => {
                                const request = await apiRequest({ 
                                    endpoint:'/notice/'+record.id, 
                                    method:'DELETE', 
                                    headers:{Authorization:user.token}
                                });

                if ( request.error || !request.responseData.status ) {
                    throwNotification({
                        type:'error',
                        duration:6,
                                        description: 'Silme işlemi yapılırken bir hata meydana geldi',
                        message:'Başarısız'                        
                    });
                    console.error('Error : ', request.errorMessage || request.responseData.message );
                    return false;
                }

                throwNotification({
                    type:'success',
                    duration:3,
                                    description:'Şikayet silindi',
                    message:'Başarılı'                        
                });
                setQuery({...query});
                            }}
                            okText="Evet"
                            cancelText="Hayır"
                        >
                            <Button danger size="small">
                                Sil
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ]

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <div style={{ marginBottom: 16 }}>
                <Select
                    value={query.type}
                    style={{ width: 200 }}
                    onChange={(value) => setQuery({...query, type: value, page: 1})}
                    options={[
                        { value: 'all', label: 'Tüm Şikayetler' },
                        { value: 'user_report', label: 'Kullanıcı Şikayetleri' },
                        { value: 'comment', label: 'Yorum Şikayetleri' }
                    ]}
                />
            </div>

            <Table
                columns={columns}
                loading         = {loading}
                scroll          = {{ y:600, x: 1000 }}
                dataSource      = { data.notices.map( item => { return { ...item, key:item.id }} ) || [] }
                pagination      = {{
                    total           : data.meta.filteredCount ? data.meta.filteredCount : 0,
                    position        : ['none', 'bottomRight'],
                    current         : query ? query.page : 0,
                    pageSize        : query ? query.pagePerSize : 10,
                    showSizeChanger : true,
                    onChange        : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });},
                }}
            />
        </motion.div>
    );
}

export default Iletiler;