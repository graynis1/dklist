import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Spin, Upload } from 'antd';
import React from 'react'
import { motion } from 'framer-motion';
import TextArea from 'antd/es/input/TextArea';
import { UploadOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import apiRequest from '../../../services';
import ButtonComponent from '../../../GeneralComponents/ButtonComponent';
import { useUserAuth } from '../../../Context/UserAuthContext';
import { t } from 'i18next';

const AddKitapModal = ({modal, setModal, setter }) => {

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
        formData.append('publisherID', JSON.stringify(user.publisher));
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

            setter();
        }
        setLoading(false)
    };

    const handleUploadPictureBeforeUpload = (file) => {
        if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
            throwNotification({
                type:'warning',
                duration:4,
                description:t('İzin verilen resim formatları : png, jfif, jpg, jpeg, webp'),
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
            okText={t('tamam')}
            cancelText={t('kapat')}
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
                    rules={[ { required:true, message:t('Orjinal Kitap adı gerekli')} ]}
                >
                    <Input allowClear onChange={(e) => {
                        form.setFieldsValue({name:e.currentTarget.value});
                        setParent({...parent, bookNameInputValue:e.currentTarget.value});
                    }}/>
                </Form.Item>
                <Form.Item
                    name={'name'}
                    label="Kitap Adı"
                    rules={[ { required:true, message:t('Kitap_adı_gerekli')} ]}
                >
                    <Input/>
                </Form.Item>
                <Form.Item
                    name={'writers'}
                    label={t("Yazarlar")}
                    rules={[ { message:t('En_az_bir_yazar_seçmek_zorundasın!'), required:true } ]}
                >
                    <Select
                        disabled={!parent.bookNameInputValue}
                        onChange={(e) => setParent({...parent, selectedWritersIDs:e})}
                        onClick={ async () => { state.writers.data.length < 1 && await handleSelectDatas({type:'writers'}) } }
                        loading = { state.writers.loading }
                        showSearch
                        filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        mode='multiple'
                        allowClear
                        placeholder={t("Yazarlar")}
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
                    label={t("Kitap Dili")}
                    rules={[ { required:true, message:t('Kitap_dili_gerekli') } ]}
                >
                    <Select
                        options={[
                            {value:'Türkçe', label:t('Türkçe')}, 
                            {value:'İngilizce', label:t('İngilizce')},
                            {value:'Hintçe', label:t('Hintçe')},
                            {value:'İspanyolca', label:t('İspanyolca')},
                            {value:'Fransızca', label:t('Fransızca')},
                            {value:'Arapça', label:t('Arapça')},
                            {value:'Bengalce', label:t('Bengalce')},
                            {value:'Portekizce', label:t('Portekizce')},
                            {value:'Rusça', label:t('Rusça')},
                            {value:'Almanca', label:t('Almanca')},
                            {value:'Japonca', label:t('Japonca')},
                            {value:'Çince', label:t('Çince')},
                            {value:'İtalyanca', label:t('İtalyanca')},
                            {value:'Korece', label:t('Korece')},
                            {value:'Farsça', label:t('Farsça')},
                            {value:'Lehçe', label:t('Lehçe')},
                            {value:'Yunanca', label:t('Yunanca')},
                            {value:'Bulgarca', label:t('Bulgarca')},
                            {value:'Danca', label:t('Danca')},
                            {value:'Felemenkçe', label:t('Felemenkçe')},
                            {value:'Macarca', label:t('Macarca')},
                            {value:'Çekçe', label:t('Çekçe')},
                        ]}
                        disabled={!activeOtherInputs}
                    />
                </Form.Item>

                <Form.Item
                    name={'format'}
                    label={t("Format")}
                >
                    <Input disabled={!activeOtherInputs}/>
                </Form.Item>
                <Form.Item
                    name={'isbn'}
                    label={t("ISBN Numarası")}
                    
                >
                    <Input disabled={!activeOtherInputs}/>
                </Form.Item>
                <Form.Item
                    name={'date'}
                    label={t("Basım Tarihi")}
                    rules={[{required:true, message:t('Basım_Tarihi_Boş_Olamaz')}]}
                >
                    <DatePicker format='YYYY-MM-DD' disabled={!activeOtherInputs} />
                </Form.Item>
                <Form.Item
                    name={'img'}
                    label={t("Görsel")}
                    rules={[{required:true, message:t('Görsel Zorunlu')}]}
                >
                    <Upload maxCount={1} name="img" listType="picture" beforeUpload={handleUploadPictureBeforeUpload} onRemove={() => { setIsOkey(true) }}>
                        <Button disabled={!activeOtherInputs} icon={<UploadOutlined />}>Resim Yükle</Button>
                    </Upload>
                </Form.Item>
                <Form.Item
                    name={'pageNumber'}
                    label={t("Sayfa Sayısı")}
                    rules={[ { required:true, message:t('Sayfa Sayısı Gerekli')}, ]}
                    children={<InputNumber disabled={!activeOtherInputs} min={0} />}
                />
                
                <Form.Item name={'content'} rules={[{ required:true, message:t('Açıklama olmak zorunda!') }]} label={t("Açıklama")} children={<Input.TextArea disabled={!activeOtherInputs} showCount maxLength={2000}/>} />
                
                <Form.Item
                    name={'categories'}
                    label={t("Kategoriler")}
                    rules={[ { message:t('En az bir kategori seçmek zorundasın!'), required:!notification.show } ]}
                >
                    <Select
                        disabled={!activeOtherInputs || notification.show}
                        onClick={ async () => { state.categories.data.length < 1 && await handleSelectDatas({type:'categories'}) } }
                        loading = { state.categories.loading }
                        mode='multiple'
                        allowClear
                        placeholder={t("Kategoriler")}
                        onChange={() => { }}
                        showSearch = { false }
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
                                        </>
                                    }
                                </div>
                            )
                        }}
                    />
                </Form.Item>
                
                <Form.Item
                    name={'translators'}
                    label={t("Çevirmenler")}
                >
                    <Select
                        disabled={!activeOtherInputs}
                        onClick={ async () => { state.translators.data.length < 1 && await handleSelectDatas({type:'translators'}) } }
                        loading = { state.translators.loading }
                        mode='multiple'
                        allowClear
                        placeholder={t("Çevirmenler")}
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
                        {t('Kaydet')}
                    </Button>
                </Form.Item>
            </Form>        
        </Modal>
    );
}


export default AddKitapModal;