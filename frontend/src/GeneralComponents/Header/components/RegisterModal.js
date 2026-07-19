import { Button, Checkbox, DatePicker, Form, Input, Modal, Select } from "antd";
import React from "react";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import 'dayjs/locale/tr';
import 'dayjs/locale/es-us'
import localeTR from 'antd/es/date-picker/locale/tr_TR';
import localeUS from 'antd/es/date-picker/locale/en_US';
import SiteTermsOfUseModal from "../../SiteTermsOfUseModal";
import apiRequest from "../../../services";
import { useTranslation } from "react-i18next";


const RegisterModal = ({show, setShow}) => {

    const [form] = Form.useForm();
    const [showTerms, setShowTerms] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [button, setButton] = React.useState(true);
    const { t, i18n } = useTranslation();

    const onFinish = async (values) => {
        setLoading(true);
        const data = JSON.stringify({
            name:values.name,
            surname:values.surname,
            username:values.username,
            password:values.password,
            birthDate:values.birthDate.$y+'-'+(values.birthDate.$M+1)+'-'+values.birthDate.$D,
            sex:values.sex,
            mail:values.email,
            lang:'tr'
        });
        const request = await apiRequest({endpoint:'/user/register', body:data, method:'POST'});
        if ( request.error || ! request.responseData.status ) {
            let message = request.responseData.message ;
            if ( !message ) {
                message = t('kayit_olma_hata');
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
                message:t('kayit_yapildi_kod_gonderildi'),
            });
            setShow(false);
        }
        setLoading(false);
    }

    return (
        <Modal 
            open={show}
            onCancel={() => { setShow(false); form.resetFields(); }} 
            footer = {null}
            bodyStyle={{display:'flex', flexDirection:'column', alignItems:'center'}}
        >   
            <img src='/images/dklist.png' alt="DKList" style={{width:100, marginBottom:20}}/>
            <h3 style={{margin:'30px 0', fontWeight:500, fontSize:20}}>{t('kayit_olma_formu')}</h3>
            <Form
                form={form}
                name="register-form"
                onFinish={onFinish}
                style={{ maxWidth: 300 }}
                labelCol={{ span: 24 }}
            >
                <Form.Item
                    name={'name'}
                    label={t('isim')}
                    rules={[ { required:true, message:t('isim_gerekli')} ]}
                    labelAlign="left"
                >
                    <Input allowClear />
                </Form.Item>
                <Form.Item
                    name={'surname'}
                    label={t('soyisim')}
                    rules={[ { required:true, message:t('soyisim_gerekli')} ]}
                >
                    <Input allowClear />
                </Form.Item>
                <Form.Item
                    name={'username'}
                    label={t('kullanici_adi')}
                    rules={[ { required:true, message:t('kullanici_adi_gerekli')} ]}
                >
                    <Input allowClear />
                </Form.Item>
                <Form.Item
                    name={'password'}
                    label={t('sifre')}
                    rules={[ 
                        { required:true, message:t('sifre_gerekli')}, 
                        { min:8, message:t('minimum_8'), required:true }, 
                        { validator: (_, value) => !value.includes(" ") ? Promise.resolve() : Promise.reject(new Error(t('bosluk_olmasin'))) } 
                    ]}
                >
                    <Input.Password allowClear maxLength={50} autoComplete="nope"/>
                </Form.Item>
                <Form.Item
                    name={'email'}
                    label={t('mail_adresi')}
                    rules={[ { required:true, message:t('mail_adresi_gerekli')}, {type:'email', message:t('mail_gir'), required:true} ]}
                >
                    <Input allowClear />
                </Form.Item>
                <Form.Item
                    name={'birthDate'}
                    label={t('dogum_tarihi')}
                    rules={[ { required:true, message:t('dogum_tarihi_gerekli')} ]}
                >
                    <DatePicker format='YYYY-MM-DD' locale={ i18n.language === 'tr' ? localeTR : localeUS} />
                </Form.Item>
                <Form.Item
                    name={'sex'}
                    label={t('cins')}
                    rules={[ { required:true, message:t('cins_gerekli')} ]}
                >
                    <Select
                        placeholder={t('cisn_sec')}
                        options={[{label:t('erkek'), value:'Erkek'}, {label:t('bayan'), value:'Kadın'}, {label:t('belirtmek_istemiyorum'), value:'Belirtmek İstemiyorum'}]}
                    />
                </Form.Item>
                <Form.Item name={'termsCheckbox'}>
                    <Checkbox defaultChecked onChange={e => {setButton(e.target.checked)}}><span className="c-softBlue" onClick={() => {setShowTerms(true);}}>{t('site_kullanim_sartlarini')}</span> {t('')}</Checkbox>
                </Form.Item>
                <Form.Item>
                    <Button loading={loading} disabled={!button} type="primary" htmlType="submit" className="bgc-softblue" style={{marginTop:20}}>{t('aramiza_katil')}</Button>
                </Form.Item>
            </Form>
            <SiteTermsOfUseModal show={showTerms} setShow={setShowTerms}/>
        </Modal>
    )
}
export default RegisterModal;