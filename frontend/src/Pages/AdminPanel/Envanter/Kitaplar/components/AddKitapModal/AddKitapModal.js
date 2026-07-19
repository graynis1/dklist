import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Spin, Upload } from 'antd';
import React from 'react'
import { motion } from 'framer-motion';
import throwNotification from '../../../../../../GeneralFunctions/throwNotification';
import ButtonComponent from '../../../../../../GeneralComponents/ButtonComponent';
import TextArea from 'antd/es/input/TextArea';
import { UploadOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import apiRequest from '../../../../../../services';
import { useUserAuth } from '../../../../../../Context/UserAuthContext';

const AddKitapModal = ({modal, setModal, data, setData}) => {

    const {user} = useUserAuth();

    const [ state, setState ] = React.useState({
        categories   : { data: [], loading:false, newValues:'' },
        writers      : { data: [], loading:false, newValues:'' },
        translators  : { data: [], loading:false, newValues:'' },
        publisher    : { data: [], loading:false, newValues:'' },
    });

    const [isOkey, setIsOkey] = React.useState(true);
    const [form] = Form.useForm();
    const [notification, setNotification] = React.useState({show:false, message:''});
    const [loading, setLoading] = React.useState(false)
    const [parent, setParent] = React.useState({bookNameInputValue:'', selectedWritersIDs:[]});
    const [activeOtherInputs, setActiveOtherInputs] = React.useState(false);
    const [parentID, setParentID] = React.useState(0);

    const onFinish = async (values) => {

  
        const formData = new FormData();

        formData.append('parentID', parentID);
        formData.append('name', values.name);
        formData.append('lang', values.lang);
        formData.append('orgName', values.orgName);
        formData.append('writerIDs', JSON.stringify(values.writers));
        formData.append('publisherID', JSON.stringify(values.publisher));
        formData.append('categorieIDs', JSON.stringify(values.categories));
        formData.append('translatorIDs', JSON.stringify(values.translators));

        values.img        && formData.append('img', values.img.file);
        values.isbn       && formData.append('isbn', values.isbn);
        values.format     && formData.append('format', values.format);
        values.content    && formData.append('content', values.content);
        values.pageNumber && formData.append('pageNumber', values.pageNumber);

        if ( values.date ){
            const date = values.date.$y+'-'+(values.date.$M+1)+'-'+values.date.$D;
            formData.append('date', date);
        }

        setLoading(true);
        const request = await apiRequest({ endpoint:'/book/add', body:formData, headers:{Authorization:user.token}, method:'POST' });
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Kitap eklenirken sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            throwNotification({
                type:'success',
                message:'Başarılı',
                description: 'Kitap eklendi',
                duration:3
            });
            form.resetFields();
            setParent({bookNameInputValue:'', selectedWritersIDs:[]});
            setActiveOtherInputs(false);
            setNotification({show:false, message:''});
            const responseData = request.responseData.response;

            setData({books:[...data.books, responseData], meta:{...data.meta, filteredCount:data.meta.filteredCount+1}})
        }
        setLoading(false)
    };

    const handleUploadPictureBeforeUpload = (file) => {
        if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
            throwNotification({
                type:'warning',
                duration:4,
                description:'İzin verilen resim formatları : png, jfif, jpg, jpeg, webp',
                message: 'Yanlış dosya formatı'
            });
            setIsOkey(false);
        }
        return false;
    }

    const handleSelectDatas = async ({type}) => {

        if ( type === 'categories' ) {
            setState({...state, categories:{ ...state.categories, loading:true }});
            const request = await apiRequest({endpoint:'/category/get?getAll=true'});
            if ( request.error || ! request.responseData.status ) {
                throwNotification({
                    type:'error',
                    message:'Bir hata oluştu',
                    description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Kategoriler getirilirken bir hata oluştu',
                    duration:3
                });
                console.error('Alınan hata : ', request.errorMessage);
            }
            else{
                const data = request.responseData.response.data.map( item => { return { value:item.id, label:item.category+' - '+(item.categoryUS || 'İngilizcesi Yok') } } );
                setState({...state, categories:{ ...state.categories, data:data, loading:false }});
            }
        }
        else if( type === 'writers' ){
            setState({...state, writers:{ ...state.writers, loading:true }});
            const request = await apiRequest({endpoint:'/writer/get?getAll=true'});
            if ( request.error || ! request.responseData.status ) {
                throwNotification({
                    type:'error',
                    message:'Bir hata oluştu',
                    description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Yazarlar getirilirken bir hata oluştu',
                    duration:3
                });
                console.error('Alınan hata : ', request.errorMessage);
            }
            else{
                const data = request.responseData.response.data.map( item => { return { value:item.id, label:item.name } } );
                setState({...state, writers:{ ...state.writers, data:data, loading:false }});
            }
        }
        else if( type === 'translators' ){
            setState({...state, translators:{ ...state.translators, loading:true }});
            const request = await apiRequest({endpoint:'/translator/get?getAll=true'});

            if ( request.error || ! request.responseData.status ) {
                throwNotification({
                    type:'error',
                    message:'Bir hata oluştu',
                    description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Çevirmenler getirilirken bir hata oluştu',
                    duration:3
                });
                console.error('Alınan hata : ', request.errorMessage);
            }
            else{
                const data = request.responseData.response.data.map( item => { return { value:item.id, label:item.name, img:item.img } } );
                setState({...state, translators:{ ...state.translators, data:data, loading:false }});
            }
        }
        else if( type === 'publisher' ){
            setState({...state, publisher:{ ...state.publisher, loading:true }});
            const request = await apiRequest({endpoint:'/publisher/get?getAll=true'});

            if ( request.error || ! request.responseData.status ) {
                throwNotification({
                    type:'error',
                    message:'Bir hata oluştu',
                    description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Yayın Evleri getirilirken bir hata oluştu',
                    duration:3
                });
                console.error('Alınan hata : ', request.errorMessage);
            }
            else{
                const data = request.responseData.response.data.map( item => { return { value:item.id, label:item.name } } );
                setState({...state, publisher:{ ...state.publisher, data:data, loading:false }});
            }
        }

    } 

    const debouncedHandleChange = React.useMemo(() => {
        return debounce( async (writerIDs, bookName) => {

            const request = await apiRequest({endpoint:'/book/check-book', body:JSON.stringify({name:bookName, writerIDs:writerIDs}), method:'POST'});

            if ( request.error || !request.responseData || !request.responseData.status ) {
                throwNotification({
                    type:'warning',
                    message:'',
                    description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Girilen kitap ismi kontrol edilirken sunucu taraflı bir hata oluştu',
                    duration:3
                });
                console.error('Alınan hata : ', request.errorMessage);
                setParentID(0);
                setNotification({
                    show:false,
                    message:''
                })
            }
            else{
                const data = request.responseData.response;
                setParentID(data.parentID);
                setNotification({
                    show:true,
                    message:'Eklemeye Çalıştığınız Kitap Envanterde mevcut olduğu için şuanda varyasyon ekliyorsunuz'
                })
            }
            setActiveOtherInputs(true);
            
        }, 700);
    }, [notification]);

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    React.useEffect(() => {
        if ( parent.bookNameInputValue.length>0 && parent.selectedWritersIDs.length>0 ) {
            debouncedHandleChange(parent.selectedWritersIDs, parent.bookNameInputValue);
        }
        else{
            setActiveOtherInputs(false);
        }
    }, [parent])

    return(
        <Modal
            title="Kitap Ekle"
            centered
            open={modal}
            onOk={() => {setModal(false);setActiveOtherInputs(false)}}
            onCancel={() => {setModal(false);setActiveOtherInputs(false)}}
            width={1000}
            okText='Tamam'
            cancelText='Kapat'
        >
                
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{width:'100%', marginBottom:10, visibility:notification.show ? 'visible' : 'hidden'}}>
                <Alert message={notification.message} type="info" showIcon />
            </motion.div>

            <Form
                form={form}
                name="add-book"
                onFinish={onFinish}
                style={{ maxWidth: 800 }}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 12 }}
            >
                
                <Form.Item
                    name={'orgName'}
                    label="Orjinal Kitap Adı"
                    rules={[ { required:true, message:'Orjinal Kitap adı gerekli'} ]}
                >
                    <Input allowClear onChange={(e) => {
                        form.setFieldsValue({name:e.currentTarget.value});
                        setParent({...parent, bookNameInputValue:e.currentTarget.value});
                    }}/>
                </Form.Item>
                <Form.Item
                    name={'name'}
                    label="Kitap Adı"
                    rules={[ { required:true, message:'Kitap adı gerekli'} ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item
                    name={'writers'}
                    label="Yazarlar"
                    rules={[ { message:'En az bir yazar seçmek zorundasın!', required:true } ]}
                >
                    <Select
                        disabled={!parent.bookNameInputValue}
                        onChange={(e) => setParent({...parent, selectedWritersIDs:e})}
                        onClick={ async () => { state.writers.data.length < 1 && await handleSelectDatas({type:'writers'}) } }
                        loading = { state.writers.loading }
                        mode='multiple'
                        allowClear
                        placeholder="Yazarlar"
                        showSearch
                        filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={ state.writers.data || [] }
                        dropdownRender={(menu) => {
                            return (
                                <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                                    {
                                        state.writers.loading 
                                        ?
                                            <Spin/>
                                        :
                                        menu
                                    }
                                </div>
                            )
                        }}
                    />
                </Form.Item>
                <Form.Item
                    name={'lang'}
                    label="Kitap Dili"
                    rules={[ { required:true, message:'Kitap dili gerekli' } ]}
                >
                    <Select
                        options={[
                            {value:'Türkçe', label:'Türkçe'}, 
                            {value:'İngilizce', label:'İngilizce'},
                            {value:'Hintçe', label:'Hintçe'},
                            {value:'İspanyolca', label:'İspanyolca'},
                            {value:'Fransızca', label:'Fransızca'},
                            {value:'Arapça', label:'Arapça'},
                            {value:'Bengalce', label:'Bengalce'},
                            {value:'Portekizce', label:'Portekizce'},
                            {value:'Rusça', label:'Rusça'},
                            {value:'Almanca', label:'Almanca'},
                            {value:'Japonca', label:'Japonca'},
                            {value:'Çince', label:'Çince'},
                            {value:'İtalyanca', label:'İtalyanca'},
                            {value:'Korece', label:'Korece'},
                            {value:'Farsça', label:'Farsça'},
                            {value:'Lehçe', label:'Lehçe'},
                            {value:'Yunanca', label:'Yunanca'},
                            {value:'Bulgarca', label:'Bulgarca'},
                            {value:'Danca', label:'Danca'},
                            {value:'Felemenkçe', label:'Felemenkçe'},
                            {value:'Macarca', label:'Macarca'},
                            {value:'Çekçe', label:'Çekçe'},
                        ]}
                        disabled={!activeOtherInputs}
                    />
                </Form.Item>

                <Form.Item
                    name={'format'}
                    label="Format"
                >
                    <Input disabled={!activeOtherInputs}/>
                </Form.Item>
                <Form.Item
                    name={'isbn'}
                    label="ISBN Numarası"
                    
                >
                    <Input disabled={!activeOtherInputs}/>
                </Form.Item>
                <Form.Item
                    name={'date'}
                    label="Basım Tarihi"
                    rules={[{required:true, message:'Basım Tarihi Boş Olamaz'}]}
                >
                    <DatePicker format='YYYY-MM-DD' disabled={!activeOtherInputs} />
                </Form.Item>
                <Form.Item
                    name={'img'}
                    label="Görsel"
                    rules={[{required:true, message:'Görsel Zorunlu'}]}
                >
                    <Upload maxCount={1} name="img" listType="picture" beforeUpload={handleUploadPictureBeforeUpload} onRemove={() => { setIsOkey(true) }}>
                        <Button disabled={!activeOtherInputs} icon={<UploadOutlined />}>Resim Yükle</Button>
                    </Upload>
                </Form.Item>
                <Form.Item
                    name={'pageNumber'}
                    label="Sayfa Sayısı"
                    rules={[ { required:true, message:'Sayfa Sayısı Gerekli'}, ]}
                    children={<InputNumber disabled={!activeOtherInputs} min={0} />}
                />
                
                <Form.Item name={'content'} rules={[{ required:true, message:'Açıklama olmak zorunda!' }]} label="Açıklama" children={<Input.TextArea disabled={!activeOtherInputs} showCount maxLength={2000}/>} />
                
                <Form.Item
                    name={'publisher'}
                    label="Yayın Evi"
                    rules={[ { message:'Yayın Evi Seçmek Zorundasın', required:true } ]}
                >
                    <Select
                        disabled={!activeOtherInputs}
                        onClick={ async () => { state.publisher.data.length < 1 && await handleSelectDatas({type:'publisher'}) } }
                        loading = { state.publisher.loading }
                        allowClear
                        placeholder="Yayın Evi"
                        onChange={() => { }}
                        showSearch = { false }
                        options={ state.publisher.data || [] }
                        dropdownRender={(menu) => {
                            return (
                                <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                                    {
                                        state.publisher.loading 
                                        ?
                                            <Spin/>
                                        :
                                        <>
                                            {menu}
                                            <div style={{ width:'100%', height:120, display:'flex', flexDirection:'column', justifyContent:'space-around', alignItems:'center' }}>
                                                <TextArea value={state.publisher.newValues} placeholder={'Eklemek istediğiniz yayın evlerini virgülle ayırarak girin girin'} style={{ height:60, resize:'none' }} allowClear showCount maxLength={100} onChange = { e => { setState({...state, publisher:{ ...state.publisher, newValues:e.currentTarget.value }}) } }/>
                                                <ButtonComponent type={'primary'}  onClick = { async () => {

                                                    const publishers = state.publisher.newValues.split(',').map( item => item.trim() );

                                                    const request = await apiRequest( { endpoint:'/publisher/add-multiple', body:JSON.stringify({ publishers:publishers }), method:'POST', headers:{Authorization:user.token} } );
                                                    if ( request.error || ! request.responseData.status ) {
                                                        throwNotification({
                                                            type:'error',
                                                            message:'Bir hata oluştu',
                                                            description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Yeni yayın evi eklenirken sunucu taraflı hata oluştu',
                                                            duration:3
                                                        });
                                                        console.error('Alınan hata : ', request.errorMessage);
                                                    }

                                                
                                                    const addedItems = request.responseData.response;

                                                    throwNotification({
                                                        type:'success',
                                                        message:'İşlem Başarılı',
                                                        description:request.responseData.message || 'Yayınevi eklendi !'
                                                    })

                                                    setState({...state, publisher:{ ...state.publisher, newValues:'', data:[...state.publisher.data, ...addedItems.map( item => { return { label:item.name, value:item.id } } )] }})
                                                }}>Ekle</ButtonComponent>
                                            </div>
                                        </>
                                    }
                                </div>
                            )
                        }}
                    />    
                </Form.Item>
                <Form.Item
                    name={'categories'}
                    label="Kategoriler"
                    rules={[ { message:'En az bir kategori seçmek zorundasın!', required:!notification.show } ]}
                >
                    <Select
                        disabled={!activeOtherInputs || notification.show}
                        onClick={ async () => { state.categories.data.length < 1 && await handleSelectDatas({type:'categories'}) } }
                        loading = { state.categories.loading }
                        mode='multiple'
                        allowClear
                        placeholder="Kategoriler"
                        onChange={() => { }}
                        showSearch
                        filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={ state.categories.data || [] }
                        dropdownRender={(menu) => {
                            return (
                                <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                                    {
                                        state.categories.loading 
                                        ?
                                            <Spin/>
                                        :
                                        <>
                                            {menu}
                                            <div style={{ width:'100%', height:120, display:'flex', flexDirection:'column', justifyContent:'space-around', alignItems:'center' }}>
                                                <TextArea value={state.categories.newValues} placeholder={'Eklemek istediğiniz kategorileri virgülle ayırarak girin girin'} style={{ height:60, resize:'none' }} allowClear showCount maxLength={100} onChange = { e => { setState({...state, categories:{ ...state.categories, newValues:e.currentTarget.value }}) } }/>
                                                <ButtonComponent type={'primary'}  onClick = { async () => {

                                                    const categories = state.categories.newValues.split(',').map( item => item.trim() );

                                                    const request = await apiRequest( { endpoint:'/category/add-multiple', body:JSON.stringify({ categories:categories }), headers:{Authorization:user.token}, method:'POST' } );

                                                    if ( request.error || ! request.responseData.status ) {
                                                        throwNotification({
                                                            type:'error',
                                                            message:'Bir hata oluştu',
                                                            description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Yeni kategori eklenirken sunucu taraflı hata oluştu',
                                                            duration:3
                                                        });
                                                        console.error('Alınan hata : ', request.errorMessage);
                                                    }

                                                
                                                    const addedItems = request.responseData.response;
                                                    const addedItemsCount = addedItems.length;

                                                    throwNotification({
                                                        type:'success',
                                                        message:'İşlem Başarılı',
                                                        description:request.responseData.message || 'Kategoriler eklendi !'
                                                    })

                                                    setState({...state, categories:{ ...state.categories, newValues:'', data:[...state.categories.data, ...addedItems.map( item => { return { label:item.category+' - '+(item.categoryUS || 'İngilizcesi Yok'), value:item.id } } )] }})
                                                }}>Ekle</ButtonComponent>
                                            </div>
                                        </>
                                    }
                                </div>
                            )
                        }}
                    />
                </Form.Item>
                
                <Form.Item
                    name={'translators'}
                    label="Çevirmenler"
                >
                    <Select
                        disabled={!activeOtherInputs}
                        onClick={ async () => { state.translators.data.length < 1 && await handleSelectDatas({type:'translators'}) } }
                        loading = { state.translators.loading }
                        mode='multiple'
                        allowClear
                        placeholder="Çevirmenler"
                        showSearch
                        filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={ (state.translators.data || []) }
                        dropdownRender={(menu) => {
                            return (
                                <div style={{display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                                    {
                                        state.translators.loading 
                                        ?
                                            <Spin/>
                                        :
                                        menu
                                    }
                                </div>
                            )
                        }}
                    />
                </Form.Item>
                <Form.Item
                    wrapperCol={{
                        offset: 6,
                    }}
                >
                    <Button type="primary" htmlType="submit" disabled={ !isOkey || !activeOtherInputs} loading={loading}>
                        Kaydet
                    </Button>
                </Form.Item>
            </Form>        
        </Modal>
    );
}


export default AddKitapModal;