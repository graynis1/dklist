import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import { useNavigate, useParams } from "react-router-dom";
import { Button, Image, Popconfirm, Form, Spin } from "antd";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useProfile } from "../../../Context/UserProfileContext";
import TextArea from "antd/es/input/TextArea";
import { useForm } from "antd/es/form/Form";
import { SendOutlined, DeleteFilled } from '@ant-design/icons';
import { useScreenSize } from "../../../Context/ResponsiveContext";
import ShareComponent from "../../../GeneralComponents/ShareComponent/ShareComponent";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../services";


const AskidaKitapSayfasi = () => {

    const { t } = useTranslation();
    const [ loading, setLoading ] = React.useState(false);
    const { slug } = useParams();
    const { user } = useUserAuth();
    const { profileData, setProfileData } = useProfile();
    const [form] = useForm();
    const { screenSize } = useScreenSize();
    const [ viewImage, setViewImage ] = React.useState(0);
    const [ data, setData ] = React.useState({
        title:'',
        content:'',
        id:1,
        state:'',
        shipment:'',
        stock:1,
        book:null,
        owner:{
            username:'kullanici-adi',
            id:1,
        },  
        pictures:[ ]
    })
    const navigate = useNavigate();

    const getAdvert = async () => {

        setLoading(true);

        const request = await apiRequest({endpoint:'/store/'+slug, headers:{Authorization:user.token}});
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
            navigate(t('/askida-kitap'))
        }
        else{
            const data = request.responseData.response;
            setData( data );
        }
        setLoading(false);
    }

    React.useEffect(() => {
        getAdvert();
    }, [slug])

    const onFinish = async (values) => {
        
        const link = window.location.href;
        const message = link + ' - ' + values.message;

        const request = await apiRequest({endpoint:'/message/send', headers:{Authorization:user.token}, method:'POST', body:JSON.stringify({message:message, receiverID:data.owner.id})});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('mesaj_gonderilirken_bir_hata_olustu'), 
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            form.resetFields();
        }
    }

    const deleteAdvert = async () => {
        const request = await apiRequest({endpoint:'/store/'+data.id, headers:{Authorization:user.token}, method:'DELETE'});
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
        }
        else{
            navigate(t('/askida-kitap'));
        }
    }
   
    return(
        <>
            <Helmet>
                <title>{t('AskidaKitapSayfasi')}</title>
            </Helmet>
            
            <div className="dkBox advertPersonalContainer">
                
               { 
                    loading && data ?

                    <div><Spin /></div>
                    :
                    <>
                        <div className="advertImageContainer">
                            <Image.PreviewGroup
                                preview={{ onChange: (current, prev) => {setViewImage(current)} }}
                                items={data.pictures}
                            >
                                <Image
                                    height={screenSize > 1051 ? 360 : screenSize > 650 ? 310 : 230 }
                                    width={screenSize > 1051 ? 260 : screenSize > 650 ? 200 : 150 }
                                    src={data.pictures[viewImage]}
                                    style={{objectFit:'cover'}}
                                />
                            </Image.PreviewGroup>

                            <Image.PreviewGroup>
                                <div style={{display:'flex', flexDirection:'row', justifyContent:'space-between', width:screenSize > 1051 ? 260 : screenSize > 650 ? 200 : 150 }}>
                                {
                                    data.pictures.map( (image, index) => {
                                        return(
                                            <span style={{cursor:'pointer'}}><Image preview={false} width={screenSize > 1051 ? 80 : screenSize > 650 ? 60 : screenSize > 500 ? 45 : 30 } height={screenSize > 1051 ? 120 : screenSize > 650 ? 90 : 70 } style={{objectFit:'contain'}} src={image} onClick={() => { setViewImage(index) }}/></span>
                                        )
                                    })
                                }
                                </div>
                            </Image.PreviewGroup>
                        </div>

                        <div className="advertContentContainer">
                            <div className="advertHeader">
                                <span>{data.title} <ShareComponent content={'DK List - '+data.title} /></span>
                            </div>
                            <div className="advertOwnerContainer">
                                <div className="advertOwnerContainerItem" >
                                    <span className="advertOwnerContainerItemHeader">{t('kitap_sahibi')+': '}</span>
                                    <span onClick={()=>{setProfileData({...profileData, show:true, userID:data.owner.id, currentUserToken:user.token})}} style={{color:'var(--softBlue)', cursor:'pointer'}}>@{data.owner.username}</span>
                                </div>
                                {
                                    data.stock &&
                                    <div className="advertOwnerContainerItem">
                                        <span className="advertOwnerContainerItemHeader">{t('stok')+': '}</span>
                                        <span>{data.stock}</span>
                                    </div>
                                }
                                <div className="advertOwnerContainerItem">
                                    <span className="advertOwnerContainerItemHeader">{t('urun_durumu')+': '}</span>
                                    <span>{data.state}</span>
                                </div>
                                {
                                    data.shipment &&
                                    <div className="advertOwnerContainerItem">
                                        <span className="advertOwnerContainerItemHeader">{t('kargo_ucreti')+': '}</span>
                                        <span>{data.shipment}</span>
                                    </div>
                                }

                                {
                                    data.price &&
                                    <div className="advertOwnerContainerItem">
                                        <span className="advertOwnerContainerItemHeader">{t('price')+': '}</span>
                                        <span>{data.price}</span>
                                    </div>
                                }
                                {
                                    data.location &&
                                    <div className="advertOwnerContainerItem">
                                        <span className="advertOwnerContainerItemHeader">{t('bolge')+': '}</span>
                                        <span>{data.location}</span>
                                    </div>
                                }
                            </div>
                            
                            <div className="advertContent">
                                {data.content}
                            </div>

                            {
                                data.book && <div style={{marginTop:10}}> {t('bu_ilandaki_kitap')+' : '} <span onClick={() => {navigate(t('/kitap')+'/'+data.book.slug)}} style={{color:'var(--softBlue)', cursor:'pointer'}}>{data.book.name}</span> </div>
                            }

                            <div className="advertActions">

                                {
                                    Number(user.id) !== data.owner.id &&
                                    <Popconfirm
                                        icon={null}
                                        okText={t('kapat')}
                                        cancelText={t('iptal')}
                                        onCancel={() => { form.resetFields(); }}
                                        description = { 
                                            <Form form={form} onFinish={onFinish}>
                                                <Form.Item name={'message'} rules={[{required:true, message:t('gerekli')}]}>
                                                    <TextArea maxLength={500} showCount={true}/>
                                                </Form.Item>
                                                <Form.Item>
                                                    <Button type="primary" htmlType="submit"  >{t('gonder')}</Button>
                                                </Form.Item>
                                            </Form>
                                        }
                                    >
                                        <Button style={{color:'var(--softBlue)', borderColor:'var(--softBlue)'}} icon={<SendOutlined/>}>{t('mesaj_yolla')}</Button>
                                    </Popconfirm>
                                }

                                {
                                    Number(user.id) === data.owner.id && <Button onClick={deleteAdvert} style={{color:'var(--dkred)', borderColor:'var(--dkred)', marginLeft:10}} icon={<DeleteFilled/>}>{t('sil')}</Button>
                                }
                                
                            </div>
                        </div>
                    </>
                }
                    
            </div>

        </>
    )
}
export default AskidaKitapSayfasi;