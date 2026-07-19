import { Alert, Button, Form, Input, Modal } from "antd";
import React from "react";
import { CaretLeftOutlined, GoogleCircleFilled } from "@ant-design/icons";
import apiRequest from "../../../services";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useTranslation } from "react-i18next";


const LoginModal = ({show, setShow}) => {

    const [ form ] = Form.useForm();
    const [ verifiactionForm ] = Form.useForm();
    const [ resetForm ] = Form.useForm();
    const [ showReset, setShowReset ] = React.useState(false);
    const [ loading, setLoading ] = React.useState(false);
    const [ showVerification, setShowVerification ] = React.useState(false);
    const [ userID, setUserID ] = React.useState(-1);
    const { user, setUser, setUserLogin } = useUserAuth();
    const [ resetZone, setResetZone ] = React.useState(false);
    const { t, i18n } = useTranslation();

    const onFinishReset = async (values) => {


        setLoading(true);
        if ( values.target ) {
            const body = JSON.stringify({target:values.target, lang:i18n.language})
            const request = await apiRequest({endpoint:'/user/reset-request', body:body, method:'POST'});

            if ( request.error || ! request.responseData.status ) {
                let message = request.responseData.message ;
                if ( !message ) {
                    message = t('loginerror1');
                }
                throwNotification({
                    type:'error',
                    duration:4,
                    message:message,
                });
            }
            else{
                throwNotification({
                    type:'success',
                    duration:4,
                    message:t('loginmessage1'),
                });
                setResetZone(true);
                setUserID(request.responseData.response.userID);
            }
        }
        else{
            const body = JSON.stringify({userID:userID, lang:i18n.language, code:values.code});
            const request = await apiRequest({endpoint:'/user/reset', body:body, method:'POST'});
            if ( request.error || ! request.responseData.status ) {
                let message = request.responseData.message ;
                if ( !message ) {
                    message = t('sifre_sifirlama_basarisiz');
                }
                throwNotification({
                    type:'error',
                    duration:4,
                    message:message,
                });
            }
            else{
                throwNotification({
                    type:'success',
                    duration:4,
                    message:t('sifre_sifirlama_basarili'),
                });
            }
            setResetZone(false);
            setShowReset(false);
            setShow(false);
            resetForm.resetFields();
        }
        setLoading(false);
    }

    const onFinish = async (values) => {
        setLoading(true);
        await loginAction({username:values.username, password:values.password});
        setLoading(false);
    }

    const verifiactionFormAction = async (values) => {
        setLoading(true);
        const data = JSON.stringify({
            userId:userID,
            code:values.code,
            lang:'us'
        });
        const request = await apiRequest({endpoint:'/user/auth', body:data, method:'POST',});
        if ( request.error || ! request.responseData.status ) {
            let message = request.responseData.message ;
            if ( !message ) {
                message = t('dogrulama_sirasinde_hata');
            }
            throwNotification({
                type:'error',
                duration:4,
                message:message,
            });
        }
        else{
            const token = request.responseData.response;
            setUser({...user, token:token});
            setUserLogin(true);
            setShow(false);
            verifiactionForm.resetFields();
        }
        setLoading(false);
    } 

    const loginAction = async ({username, password}) => {
        setLoading(true);
        const data = JSON.stringify({
            username:username,
            password:password,
            lang:i18n.language
        }) 
        const request = await apiRequest({endpoint:'/user/login', body:data, method:'POST'});

        if ( request.error || ! request.responseData.status ) {

            let message =  request.responseData && request.responseData.message ? request.responseData.message : t('sunucu_hatasi') ;
            
            if ( !message ) {
                message = t('giris_sirasinda_hata');
            }

            throwNotification({
                type:'error',
                duration:4,
                message:message,
            });

        }
        else{
            const responseData = request.responseData.response;
            let imgURL = '';
                if (responseData.img) {
                    imgURL = responseData.img.includes('http') ? responseData.img : 'http://'+responseData.img;
                }
                else{
                    imgURL = null;
                }
            setUser({
                id        : responseData.id        ,
                token     : responseData.token     ,
                userType  : responseData.userType  ,
                username  : responseData.username  ,
                publisher : responseData.publisher ,
                img       : imgURL
            });
            setUserID(responseData.id)
            if ( ! responseData.auth ) {
                setShowVerification(true);
            }
            else{
                throwNotification({
                    message:t('giris_yapildi'),
                    duration:3,
                    type:'info'
                });
                setShowVerification(false);
                setUserLogin(true);
                setShow(false);
            }
        }
        setLoading(false);
    }

    React.useEffect(() => {
        if ( !show ) {
            setShowVerification(false);
            verifiactionForm.resetFields();
        }
    }, [show, verifiactionForm])

    return (
        <Modal
            open={show}
            onCancel={() => { !resetZone && setShow(false); !resetZone && form.resetFields(); !resetZone && setShowReset(false); }} 
            footer = { !resetZone ? [<span key={1} className="loginPopupFooterText" onClick={() => { setShowReset(!showReset) }}>{ showReset ? <span key={2}><CaretLeftOutlined />{t('geri_don')}</span> : t('sifrenimi_unuttun')}</span> ] : null}
            bodyStyle={{ display:'flex', flexDirection:'column', alignItems:'center' }}
            centered={true}
            width={330}
            closable={!resetZone}
        >   
            {
                showReset ? 
                <Form
                    form={resetForm}
                    name="reset-form"
                    onFinish={onFinishReset}
                    labelCol={{ span: 24 }}
                >         
                    
                    {
                        ! resetZone ?
                            <Form.Item
                                name={'target'}
                                label={t('mail_veya_kullanici_adi')}
                                rules={[ { required:true, message:t('bu_alan_dolu_olmali')} ]}
                            >
                                <Input allowClear placeholder={t('kullanici_adi_veya_mail')}/>
                            </Form.Item>
                        :
                            <Form.Item
                                name={'code'}
                                label={t('dogrulama_kodu')}
                                rules={[ { required:true, message:t('dogrulama_kodu_gereklidir')}, { max:5, message:t('dogrulama_bes_karakter'), required:true } ]}
                            >
                                <Input allowClear maxLength={5}/>
                            </Form.Item>
                    }

                    <Form.Item>
                        <Button loading={loading} type="primary" htmlType="submit" className="bgc-softblue">{! resetZone ? t('ileri') : t('onaylayin')}</Button>
                    </Form.Item>
                </Form>
                :
                !showVerification ?
                <>
                    <img src='/images/dklist.png' alt="DKList" style={{width:100, marginBottom:20}}/>
                    <p style={{fontSize:20, fontWeight:600, marginBottom:20, marginTop:20}}>{t("dklist_giris")}</p>
                    <Form
                        form={form}
                        name="login-form"
                        onFinish={onFinish}
                        labelCol={{ span: 24 }}
                        style={{height:250}}
                        
                    >
                        <Form.Item
                            name={'username'}
                            label={t('kullanici_adi')}
                            rules={[ { required:true, message:t('kullanici_adi_gerekli')} ]}
                            labelAlign="left"
                        >
                            <Input allowClear/>
                        </Form.Item>
                        <Form.Item
                            name={'password'}
                            label={t('sifre')}
                            rules={[ { required:true, message:t('sifre_gereklidir')} ]}
                        >
                            <Input.Password allowClear/>
                        </Form.Item>
                        <Form.Item>
                            <div style={{display:'flex', width:'100%', justifyContent:'space-between'}}>
                                <Button loading={loading} type="primary" htmlType="submit" className="bgc-softblue">{!showReset ? t('giris_yap') : t('sifirlama_istegi')}</Button>
                                <GoogleCircleFilled className="googleLogin" style={{display:'none'}}/>
                            </div>
                        </Form.Item>
                    </Form>  
                </>
                :
                <>
                    <Alert type="info" style={{marginTop:30}} message={t('mail_dogrulama')}/>
                    <Form
                        form={verifiactionForm}
                        name="auth-form"
                        onFinish={verifiactionFormAction}
                        labelCol={{ span: 24 }}
                        style={{marginBottom:20}}
                    >
                        <Form.Item
                            name={'code'}
                            label={t('dogrulama_kodu')}
                            rules={[ { required:true, message:t('bu_alan_dolu_olmali')}, { min:5, message:t('bes_karakter'), warningOnly:true } ]}
                            labelAlign="left"
                        >
                            <Input allowClear maxLength={5}/>
                        </Form.Item>
                        <Form.Item>
                            <Button loading={loading} type="primary" htmlType="submit" className="bgc-softblue">{t('dogrula')}</Button>
                        </Form.Item>
                    </Form> 
                </>
                  
            }
        </Modal>
    )


}

export default LoginModal;