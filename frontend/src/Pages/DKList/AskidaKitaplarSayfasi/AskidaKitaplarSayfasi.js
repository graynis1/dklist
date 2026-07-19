import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';
import { Button, Input, Modal, Select, Spin, Form, Upload, InputNumber } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import debounce from "lodash.debounce";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useForm } from "antd/es/form/Form";
import './style.css';
import TextArea from "antd/es/input/TextArea";

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

const AskidaKitaplarSayfasi = () => {

    const [books, setBooks] = React.useState([]);
    const [searchBook, setSearchBook] = React.useState('');
    const navigate = useNavigate();
    const { t } = useTranslation(); 
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        sortBy:'id',
        orderBy:'DESC',
        search:'',
    });
    
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [ data, setData ] = React.useState({ store:[], meta:initialMeta });
    const [loading, setLoading] = React.useState(true);
    const [addLoading, setAddLoading ] = React.useState(false);
    const { user } = useUserAuth();
    const [ showModal, setShowModal ] = React.useState(false);
    const [form] = useForm();
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewImage, setPreviewImage] = React.useState('');
    const [previewTitle, setPreviewTitle] = React.useState('');
    const [fileList, setFileList] = React.useState([]);

    const handleCancel = () => setPreviewOpen(false);
    const handlePreview = async (file) => {
        if (!file.url && !file.preview) {
            file.preview = await getBase64(file.originFileObj);
        }
        setPreviewImage(file.url || file.preview);
        setPreviewOpen(true);
        setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
    };
    const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);

    const uploadButton = (
      <div>
        <PlusOutlined />
        <div
          style={{
            marginTop: 8,
          }}
        >
          {t('upload')}
        </div>
      </div>
    );

    const getStore = React.useCallback( async () => {

        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
       
        const request = await apiRequest({endpoint:'/store'+params});
        
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
            const store = request.responseData.response.store;
            setData( { store:store, meta:meta } );
        }

        setLoading(false);

    }, [query]);


    const getBooks = async (search) => {

        setLoading(true);
        let params = '?search='+search;
       
        const request = await apiRequest({endpoint:'/get-books-for-advert'+params});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'warning',
                description: t('ilan_bulunamadi'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setBooks(request.responseData.response);
        }

        setLoading(false);

    };

    const debouncedHandleChange = React.useMemo(() => {
        return debounce((value) => {
            setQuery( { ...query, search: value, page:1 } );
        }, 700);
    }, [setQuery, query]);

    const forwardAdvert = (slug) => { navigate(t('/askida-kitap')+'/'+slug) }

    const onFinish = async (values) => {

        const formData = new FormData();
        values.pictures.fileList.forEach( file => {
            if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
                throwNotification({
                    type:'warning',
                    duration:4,
                    description:t('İzin verilen resim formatları : png, jfif, jpg, jpeg, webp'),
                });
            }
            else{
                formData.append('pictures[]', file.originFileObj);
            }
        })

        formData.append('title', values.title);
        formData.append('content', values.content);
        formData.append('state', values.state);
        values.shipment && formData.append('shipment', values.shipment);
        values.stock    && formData.append('stock', values.stock);
        values.book     && formData.append('bookID', values.book);
        values.location && formData.append('location', values.location);
        values.price    && formData.append('price', values.price);
        
        setAddLoading(true);

        const request = await apiRequest({endpoint:'/store', body:formData, headers:{Authorization:user.token}, method:'POST'});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('bir_hata_olustu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            form.resetFields();
            setFileList([]);
        }
        setAddLoading(false);
        setQuery({...query});
    }

    const debounceSearchBook = React.useMemo(() => {
        return debounce((value) => {
            setSearchBook(value);
        }, 700);
    }, []);

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    React.useEffect(() => {
        return () => {
            debounceSearchBook.cancel();
        };
    }, [debounceSearchBook]);

    React.useEffect(() => {
        getStore();
    }, [query, getStore])

    React.useEffect(() => {
        getBooks(searchBook);
    }, [searchBook])

    return(
        <>
            <Helmet>
                <title>{t('AskidaKitaplar')}</title>
            </Helmet>

            <div className="storeContainer dkBox">
                
                <div className="storeHeader">
                    <div style={{width:'100%', display:'flex', justifyContent:'space-between'}}>
                        <h2 style={{color:'rgba(0, 0, 0, 0.7)'}}> {t('askida_kitap')} </h2>
                        { user.token && <PlusOutlined className="addAdvertButton" onClick={() => { user.token && setShowModal(true) }}/> }
                    </div>
                    <Input style={{margin:'20px 0'}} onChange={(e) => { debouncedHandleChange(e.target.value); }} placeholder={t('ilan_ara')}/>
                </div>
                
                {
                    loading ?
                    <div style={{width:'100%', height:50, display:'flex', justifyContent:'center', alignItems:'center'}}> <Spin size="large"/> </div>                    
                    :
                    <div className="storeBody">
                        {
                            data.store && data.store.length > 0 ? 
                            data.store.map( item => {
                                return(
                                    <div className="advertContainer" key={item.id} onClick={() => {forwardAdvert(item.slug)}}>
                                        <img className="advertImage" src={item.image}/>
                                        <div className="advertTitle">{item.title}</div>
                                        <div className="advertPrice">{ item.price ? t('price')+' : '+item.price : t('free') }</div>
                                        { item.location && <div className="advertLocation"> {item.location.slice(0, 40)} </div>}
                                        <Button className="advertButton" style={{color:'white', backgroundColor:'var(--dkred)'}} type="link" shape="round" icon={<SearchOutlined/>}>{t('gozat')}</Button>
                                    </div>
                                );
                            })
                            :
                            <div>{t('ilan_bulunamadi')}</div>
                        }
                    </div>                    
               }
            </div>

            <Modal
                title={t('ilan_ekle')}
                centered
                open={showModal}
                onOk={() => {setShowModal(false);}}
                onCancel={() => {setShowModal(false);}}
                footer={null}
                style={{ maxWidth: 300 }}

            >
                <Form
                    form={form}
                    name="add-store"
                    onFinish={onFinish}
                    style={{ maxWidth: 300 }}
                    labelCol={{ span: 24 }}
                    key="store-form"
                >
                    <Form.Item
                        name={'title'}
                        label={t("ilan_basligi")}
                        rules={[ { required:true, message:t('bu_alan_zorunlu')} ]}
                    >
                        <Input allowClear showCount maxLength={255} placeholder={t("ilan_basligi")}/>
                    </Form.Item>
                    <Form.Item
                        name={'content'}
                        label={t("ilan_aciklamasi")}
                        rules={[ { required:true, message:t('bu_alan_zorunlu')} ]}
                    >
                        <TextArea allowClear showCount maxLength={2000} placeholder={t("ilan_aciklamasi")}/>
                    </Form.Item>

                    <Form.Item
                        name={'state'}
                        label={t("urun_durumu")}
                        rules={[ { required:true, message:t('bu_alan_zorunlu')} ]}
                    >
                        <Select
                            placeholder={t("urun_durumu")}
                            options={[
                                {label:'İkinci El', value:'ikinci_el'},
                                {label:'Sıfır', value:'sifir'}
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name={'shipment'}
                        label={t("kargo")}
                        rules={[ { required:true, message:t('bu_alan_zorunlu')} ]}
                    >
                        <Select
                            placeholder={t("kargo")}
                            options={[
                                {label:'Alıcı Öder', value:'alici_oder'},
                                {label:'Gönderici Öder', value:'gonderici_oder'}
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name={'pictures'}
                        label={t("gorseller(1-3 Resim)")}
                        rules={[
                            {
                                required:true, 
                                message:t('bu_alan_zorunlu'), 
                                validator: () => {
                                    if (fileList.length>0) {
                                        return Promise.resolve();
                                    } else {
                                        return Promise.reject(); 
                                    }
                                }
                            }
                        ]}
                    >
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onPreview={handlePreview}
                            onChange={handleChange}
                            beforeUpload={() => { return false; }}
                            maxCount={3}
                            multiple={true}
                        >
                            {fileList.length >= 3 ? null : uploadButton}
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name={'location'}
                        label={t("Bölge")}
                    >
                        <Input allowClear showCount maxLength={255} placeholder={t("Bölge")}/>
                    </Form.Item>
                    <Form.Item
                        name={'price'}
                        label={t('Fiyat')}
                        children={<InputNumber min={0} />}
                    />

                    <Form.Item
                        name={'stock'}
                        label={t('stock')}
                        children={<InputNumber min={0} />}
                    />
                    <Form.Item
                        name={'book'}
                        label={t("kitap")}
                    >
                        <Select
                            showSearch
                            options={[...books]}
                            filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={addLoading}>
                            {t('kaydet')}
                        </Button>
                    </Form.Item>
                </Form>
                
            </Modal>

            
            <Modal open={previewOpen} title={previewTitle} footer={null} onCancel={handleCancel}>
                <img
                    alt="example"
                    style={{
                        width: '100%',
                    }}
                    src={previewImage}
                />
            </Modal>            
        </>
    )
}
export default AskidaKitaplarSayfasi;