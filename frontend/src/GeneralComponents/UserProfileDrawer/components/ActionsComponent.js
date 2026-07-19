import { Button, Form, Popconfirm, Modal, Select } from "antd";
import { useForm } from "antd/es/form/Form";
import TextArea from "antd/es/input/TextArea";
import React from "react";
import { useTranslation } from 'react-i18next';
import { useProfile } from "../../../Context/UserProfileContext";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { ExclamationCircleOutlined } from "@ant-design/icons";



const ActionsComponent = () => {

    const { t } = useTranslation();
    const [form] = useForm();
    const [reportForm] = useForm();
    const { profileData, setProfileData } = useProfile(); 
    const { user } = useUserAuth();
    const [reportModalVisible, setReportModalVisible] = React.useState(false);

    const onFinish = async (values) => {

        const message = values.message;

        const request = await apiRequest({endpoint:'/message/send', headers:{Authorization:user.token}, method:'POST', body:JSON.stringify({message:message, receiverID:profileData.userID})});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('mesaj_gonderilirken_bir_hata_olustu'),
                duration:3
            });

        }
        else{
            form.resetFields();
        }
    }

    const onReportSubmit = async (values) => {
        const { reason } = values;
        
        try {
            const request = await apiRequest({
                endpoint: '/notice/report-user',
                headers: { Authorization: user.token },
                method: 'POST',
                body: JSON.stringify({
                    reportedUserId: profileData.userID,
                    reason: reason
                })
            });

            if (request.error || !request.responseData || !request.responseData.status) {
                throwNotification({
                    type: 'error',
                    message: 'Şikayet gönderilirken hata',
                    description: (request.responseData?.message || 'Bir hata oluştu').toString(),
                    duration: 4
                });
            } else {
                throwNotification({
                    type: 'success',
                    message: 'Şikayet gönderildi',
                    description: 'Kullanıcı şikayeti moderatörlere iletildi',
                    duration: 3
                });
                setReportModalVisible(false);
                reportForm.resetFields();
            }
        } catch (error) {
            throwNotification({
                type: 'error',
                message: 'Hata',
                description: 'Şikayet gönderilirken bir hata oluştu',
                duration: 4
            });
        }
    };

    const reportReasons = [
        { value: 'spam', label: 'Spam/Gereksiz İçerik' },
        { value: 'harassment', label: 'Taciz/Rahatsız Etme' },
        { value: 'inappropriate', label: 'Uygunsuz İçerik' },
        { value: 'fake', label: 'Sahte Hesap' },
        { value: 'copyright', label: 'Telif Hakkı İhlali' },
        { value: 'other', label: 'Diğer' }
    ];

    return(
        <div className='actionsContainer'>

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
                <span >{t('mesajyaz')}</span>
            </Popconfirm>

            <span onClick={ async () => {
                const oldProfile = profileData;
                if (profileData.currentUserIsFallow) {
                    setProfileData({
                        ...profileData, 
                        currentUserIsFallow:!profileData.currentUserIsFallow, 
                        currentUserToken:user.token, 
                        followers:profileData.followers.filter( item => item.id !== user.id )
                    })
                }
                else{
                    setProfileData({
                        ...profileData, 
                        currentUserIsFallow:!profileData.currentUserIsFallow, 
                        currentUserToken:user.token, 
                        followers:[...profileData.followers, {id:user.id, username:user.username, image:user.img}]
                    })
                }
                const request = await apiRequest({endpoint:'/switch-follow/'+profileData.userID, headers:{Authorization:user.token}});
                if (request.error || request.responseData.status === false) {
                    setProfileData({...oldProfile});
                }
            }} >{profileData.currentUserIsFallow ? t('takipten_cik') : t('takipet')}</span>

            <span 
                onClick={() => setReportModalVisible(true)}
                style={{ color: '#ff4d4f', cursor: 'pointer' }}
            >
                <ExclamationCircleOutlined /> Şikayet Et
            </span>

            <Modal
                title="Kullanıcıyı Şikayet Et"
                open={reportModalVisible}
                onCancel={() => {
                    setReportModalVisible(false);
                    reportForm.resetFields();
                }}
                footer={null}
                width={400}
            >
                <Form
                    form={reportForm}
                    onFinish={onReportSubmit}
                    layout="vertical"
                >
                    <Form.Item
                        name="reason"
                        label="Şikayet Sebebi"
                        rules={[{ required: true, message: 'Lütfen bir sebep seçiniz' }]}
                    >
                        <Select
                            placeholder="Şikayet sebebini seçiniz"
                            options={reportReasons}
                        />
                    </Form.Item>
                    
                    <Form.Item>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setReportModalVisible(false)}>
                                İptal
                            </Button>
                            <Button type="primary" danger htmlType="submit">
                                Şikayet Gönder
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
export default ActionsComponent;