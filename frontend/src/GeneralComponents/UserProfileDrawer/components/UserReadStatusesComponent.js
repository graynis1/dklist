import { Button, Form, Input, Modal, Popover, Progress, Tooltip } from "antd";
import React from "react";
import { useProfile } from "../../../Context/UserProfileContext";
import { useTranslation } from "react-i18next";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useUserAuth } from "../../../Context/UserAuthContext";
import apiRequest from "../../../services";
import { ShareAltOutlined, FacebookOutlined, TwitterOutlined, LinkedinOutlined, WhatsAppOutlined, CopyOutlined } from "@ant-design/icons";


const UserReadStatusesComponent = () => {

    const { profileData, setProfileData } = useProfile();
    const { t }                           = useTranslation();
    const [ show, setShow ]               = React.useState(false);
    const [ shareModal, setShareModal ]   = React.useState(false);

    const { user }                        = useUserAuth();
    const [readTargetForm] = Form.useForm();

    // Paylaşım fonksiyonları
    const generateShareText = () => {
        const currentYear = new Date().getFullYear();
        const readCount = profileData.read.readdedList.length;
        const target = profileData.read.readTarget || 1;
        const percentage = ((readCount / target) * 100).toFixed(1);
        
        return `${currentYear} yılında ${target} kitap okuma hedefim var! Şu ana kadar ${readCount} kitap okudum (%${percentage}). Sen de okuma hedefini belirle! 📚 #OkumaHedefi #DKList`;
    };

    const shareToFacebook = () => {
        const text = generateShareText();
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://dklist.com')}&quote=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const shareToTwitter = () => {
        const text = generateShareText();
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://dklist.com')}`;
        window.open(url, '_blank');
    };

    const shareToLinkedIn = () => {
        const text = generateShareText();
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://dklist.com')}&summary=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const shareToWhatsApp = () => {
        const text = generateShareText();
        const url = `https://wa.me/?text=${encodeURIComponent(text + ' https://dklist.com')}`;
        window.open(url, '_blank');
    };

    const copyToClipboard = () => {
        const text = generateShareText() + ' https://dklist.com';
        navigator.clipboard.writeText(text).then(() => {
            throwNotification({
                type: 'success',
                message: 'Panoya kopyalandı!',
                duration: 2
            });
        });
    };



    return(
        <div className="userReadStatusesComponent">

            {   
                Number(user.id) === Number(profileData.userID) ?
                <Popover
                    content={
                        <Form form={readTargetForm} onFinish={async (values) => {
                            if (values.newReadTarget < 1) {
                                throwNotification({
                                    message:t('okumahedefienaz1olabilir'),
                                    type:'warning',
                                    duration:3
                                });
                                return;
                            }
                            const body = JSON.stringify({count:values.newReadTarget})
                            const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/set-read-purpose', method:'POST', body:body});

                            if ( !(request.error || !request.responseData || !request.responseData.status) ) {
                                setProfileData({...profileData, read:{...profileData.read, readTarget:values.newReadTarget}, currentUserToken:user.token})
                            }
                        }}>
                            <Form.Item name={'newReadTarget'} rules={[{required:true, message:t('gerekli')}]}>
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit"  >{t('gonder')}</Button>
                            </Form.Item>
                        </Form> 
                    }
                >
                    <p style={{margin:'10px 0', cursor:'pointer', fontWeight:600}}>{t('okumahedefi')+' : '+(profileData.read && profileData.read.readTarget ? profileData.read.readTarget : 1 )}</p>
                </Popover>
                :
                <p style={{margin:'10px 0', fontWeight:600}}>{t('okumahedefi')+' : '+(profileData.read && profileData.read.readTarget ? profileData.read.readTarget : 1 )}</p>
            }

            <Tooltip title={(profileData.read?.oldReadedList?.length || 0) > 0 ? "Geçmiş yılları görmek için tıklayın" : "Henüz geçmiş yıl verisi yok"}>
            <span onClick={() => { (profileData.read?.oldReadedList?.length || 0) > 0 && setShow(true); }}>
                <Progress
                    percent={ profileData.read?.readTarget && profileData.read.readTarget > 0 ? (profileData.read?.readdedList?.length || 0)/( profileData.read.readTarget ) * 100 : 0} // TODO değişiklik1
                    trailColor="rgba(0,0,0,.4)"
                    strokeColor={'#52c41a'}
                    type="circle"
                        format={(percent) => {
                            const readCount = profileData.read?.readdedList?.length || 0;
                            const target = profileData.read?.readTarget || 1;
                            return <span style={{fontSize: 12}}>{readCount}/{target}<br/>{percent?.toFixed(1) || '0'}%</span>;
                        }}
                    style={{cursor:(profileData.read?.oldReadedList?.length || 0) > 0 ? 'pointer' : 'default'}}
                />
            </span>
            </Tooltip>

            <p style={{margin:'10px 0', fontWeight:600}}>{t('okunan')+' : '+(profileData.read?.readdedList?.length || 0)}</p>
            
            {/* Paylaşım Butonu */}
            {Number(user.id) === Number(profileData.userID) && (
                <div style={{textAlign: 'center', marginTop: 10}}>
                    <Tooltip title={t('paylas')}>
                        <Button 
                            type="primary" 
                            icon={<ShareAltOutlined />} 
                            onClick={() => setShareModal(true)}
                            style={{backgroundColor: '#ff9500', borderColor: '#ff9500'}}
                        >
                            {t('paylas')}
                        </Button>
                    </Tooltip>
                </div>
            )}


            <Modal 
                title={
                    <div style={{textAlign: 'center'}}>
                        📚 Geçmiş Yılların Okuma Hedefleri
                    </div>
                }
                open={show}
                footer={null}
                onCancel={() => {setShow(false)}}
                bodyStyle={{display:'flex', justifyContent:'center', flexWrap:'wrap', padding: '20px'}}
                width={800}
            >
                {
                    profileData.read?.oldReadedList && profileData.read.oldReadedList.length > 0 && profileData.read.oldReadedList.map( item => {
                        const shareHistoricalGoal = () => {
                            const percentage = ((item.readCount / item.targetCount) * 100).toFixed(1);
                            const text = `${item.year} yılında ${item.targetCount} kitap okuma hedefim vardı! ${item.readCount} kitap okudum (%${percentage}). 📚 #OkumaHedefi #DKList https://dklist.com`;
                            navigator.clipboard.writeText(text).then(() => {
                                throwNotification({
                                    type: 'success',
                                    message: `${item.year} hedefi panoya kopyalandı!`,
                                    duration: 2
                                });
                            });
                        };

                        return(
                            <div key={item.id} style={{width:160, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', marginBottom:20, padding: 10, border: '1px solid #f0f0f0', borderRadius: 8}}>
                                <div style={{marginBottom: 10, fontWeight: 600}}>{item.year + ' ' + t('okumahedefi')}</div>
                                <Progress
                                    percent={(item.readCount/item.targetCount)*100}
                                    trailColor="rgba(0,0,0,.4)"
                                    strokeColor={'#52c41a'}
                                    type="circle"
                                    format={(percent) => {return <span>{percent.toFixed(2)+'%'}</span>;}}
                                />
                                <div style={{marginTop: 10, fontSize: 12, color: '#666'}}>
                                    {item.readCount}/{item.targetCount} kitap
                                </div>
                                {Number(user.id) === Number(profileData.userID) && (
                                    <Tooltip title="Bu yılı paylaş">
                                        <Button 
                                            size="small" 
                                            icon={<ShareAltOutlined />} 
                                            onClick={shareHistoricalGoal}
                                            style={{marginTop: 8, fontSize: 11}}
                                        />
                                    </Tooltip>
                                )}
                            </div>
                        )
                    })
                }
            </Modal>



            {/* Paylaşım Modal */}
            <Modal
                title={
                    <div style={{textAlign: 'center'}}>
                        <ShareAltOutlined style={{marginRight: 8, color: '#ff9500'}} />
                        {t('okumahedefi')} {t('paylas')}
                    </div>
                }
                open={shareModal}
                onCancel={() => setShareModal(false)}
                footer={null}
                width={500}
            >
                <div style={{textAlign: 'center', padding: '20px 0'}}>
                    {/* Önizleme */}
                    <div style={{
                        backgroundColor: '#f5f5f5', 
                        padding: 20, 
                        borderRadius: 10, 
                        marginBottom: 20,
                        border: '1px solid #d9d9d9'
                    }}>
                        <h4 style={{color: '#ff9500', marginBottom: 15}}>📚 Paylaşım Önizlemesi</h4>
                        <p style={{fontSize: 16, lineHeight: 1.6, margin: 0}}>
                            {generateShareText()}
                        </p>
                    </div>

                    {/* Paylaşım Butonları */}
                    <div style={{display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap'}}>
                        <Tooltip title={t('facebookta_paylas')}>
                            <Button 
                                icon={<FacebookOutlined />} 
                                onClick={shareToFacebook}
                                style={{backgroundColor: '#1877f2', borderColor: '#1877f2', color: 'white'}}
                            >
                                Facebook
                            </Button>
                        </Tooltip>

                        <Tooltip title={t('twitterda_paylas')}>
                            <Button 
                                icon={<TwitterOutlined />} 
                                onClick={shareToTwitter}
                                style={{backgroundColor: '#1da1f2', borderColor: '#1da1f2', color: 'white'}}
                            >
                                Twitter
                            </Button>
                        </Tooltip>

                        <Tooltip title={t('linkedinde_paylas')}>
                            <Button 
                                icon={<LinkedinOutlined />} 
                                onClick={shareToLinkedIn}
                                style={{backgroundColor: '#0077b5', borderColor: '#0077b5', color: 'white'}}
                            >
                                LinkedIn
                            </Button>
                        </Tooltip>

                        <Tooltip title={t('whatsappta_paylas')}>
                            <Button 
                                icon={<WhatsAppOutlined />} 
                                onClick={shareToWhatsApp}
                                style={{backgroundColor: '#25d366', borderColor: '#25d366', color: 'white'}}
                            >
                                WhatsApp
                            </Button>
                        </Tooltip>

                        <Tooltip title={t('panoya_kopyala')}>
                            <Button 
                                icon={<CopyOutlined />} 
                                onClick={copyToClipboard}
                                style={{backgroundColor: '#6c757d', borderColor: '#6c757d', color: 'white'}}
                            >
                                {t('kopyala')}
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default UserReadStatusesComponent;