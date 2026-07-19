import React from "react";
import './style.css';
import { FacebookOutlined, InstagramOutlined, TwitterOutlined, YoutubeOutlined } from "@ant-design/icons";
import CookiePolicyModal from "../CookiePolicyModal";
import PrivacyPolicyModal from "../PrivacyPolicyModal";
import SiteTermsOfUseModal from "../SiteTermsOfUseModal";
import { Button, Form, Input } from "antd";
import { useForm } from "antd/es/form/Form";
import apiRequest from "../../services";
import throwNotification from "../../GeneralFunctions/throwNotification";
import { useTranslation } from 'react-i18next';



const Footer = () => {

    const [showCookies, setShowCookies] = React.useState(false);
    const [showPrivacy, setShowPrivacy] = React.useState(false);
    const [showSiteTerms, setSiteTerms] = React.useState(false);
    const [form] = useForm();

    const { t } = useTranslation();

    const onFinish = async (values) => {
        const request = await apiRequest({endpoint:'/newsletter/add', method:'POST', body:JSON.stringify({mail:values.mail})});
        if ( !request.error ) {
            throwNotification({
                message:'Mail Adresiniz Bültene Eklendi',
                type:'success',
                duration:2
            });
        }
        form.resetFields();
    }

    return ( 
        <div className="footer">

            <div className="footer-col footer-col-1">
                <img src='/images/dklist.png' alt='Dklist Logosu' style={{margin:'20px 0'}} className="footerImg"/>
                <p style={{color:'#777'}}>{t('footer1')}</p>
                <p style={{margin:'20px 0', color:'#777'}}>info@dklist.com</p>
                <div className="footer-social-links">
                    <a href='https://www.instagram.com/dklist/' target="_blank" rel="noreferrer" ><InstagramOutlined style={{color:'gray'}}/></a>
                    <a href='https://www.facebook.com/dunyakitaplistesi/' target="_blank" rel="noreferrer" ><FacebookOutlined style={{color:'gray'}}/></a>
                    <a href='https://www.youtube.com/channel/UC1Jh1-m3Lw7oQPG9ptSYAnA' target="_blank" rel="noreferrer" ><YoutubeOutlined style={{color:'gray'}}/></a>
                    <a href='https://twitter.com/dklist2' target="_blank" rel="noreferrer" ><TwitterOutlined style={{color:'gray'}}/></a>
                </div>
            </div>

            <div className="footer-col footer-col-2">
                <p>{t('hakkimizda')}</p>
                <p onClick={() => {setSiteTerms(true)}}>{t('site_kullanim1')}</p>
                <p onClick={() => {setShowCookies(true)}}>{t('cerez_politikasi1')}</p>
                <p onClick={() => {setShowPrivacy(true)}}>{t('gizlilik_politikasi1')}</p>
                <p>{t('iletisim')}</p>
            </div>

            <div className="footer-col footer-col-3">
                <h3 style={{color:'#292929'}}>{t('footer2')}</h3>
                <p style={{margin:'30px 0'}}>{t('footer3')}</p>
                <Form
                    form={form}
                    name="login-form"
                    onFinish={onFinish}
                >
                    <div className="addBultenContainer">
                        <Form.Item
                            name={'mail'}
                            rules={[{ type:'email', message:t('mailAdresiOlmali') }, { required:true, message:t('mailAdresiniziGirin') }]}
                        >
                            <Input allowClear className="addBultenInput"/>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit"  className="addBultenButton">{t('kaydol')}</Button>
                        </Form.Item>
                    </div>
                </Form>
            </div>
            <CookiePolicyModal show={showCookies} setShow={setShowCookies}/>
            <PrivacyPolicyModal show={showPrivacy} setShow={setShowPrivacy}/>
            <SiteTermsOfUseModal show={showSiteTerms} setShow={setSiteTerms}/>
        </div>
    );
}
export default Footer;