import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import { useForm } from "antd/es/form/Form";
import TextArea from "antd/es/input/TextArea";
import dayjs from "dayjs";
import React from "react";
import { useTranslation } from "react-i18next";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useProfile } from "../../../Context/UserProfileContext";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";


const SettingsModal = ({show, setShow}) => {


    // const states = ['Adana','Adıyaman','Afyon','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye'];
    
    const { profileData, setProfileData } = useProfile();
    const [form] = useForm();
    const { t } = useTranslation();
    const [loading, setLoading] = React.useState(false);
    const { user } = useUserAuth();

    const onFinish = async (values) => {
        
        const bd = values.birthdate.$d;
        const birthDate = (bd.getFullYear())+'-'+(bd.getMonth()+1)+'-'+(bd.getDate());

        const body = {
            sex        : values.sex,
            edu        : values.edu,
            job        : values.job,
            name       : values.name,
            biyo       : values.biyo,
            surname    : values.surname,
            password   : values.password,
            birthdate  : birthDate,
            birthPlace : values.birthPlace,
            livingCity : values.livingCity,
        };


        setLoading(true);

        const request = await apiRequest({endpoint:'/edit-profile', headers:{Authorization:user.token}, method:'POST', body:JSON.stringify(body)});

        if (request.error || request.responseData.status === false) {
            throwNotification({
                message:t('bir_hata_olustu'),
                type:'error',
                duration:4
            });
        }
        
        setProfileData({...profileData, ...body});

        setLoading(false);

        setShow(false);
    }

    const set = (name, value) => {form.setFieldValue(name, value)}

    React.useEffect(() => {
        set('birthdate', dayjs(profileData.birthDate, 'YYYY-MM-DD'));
        set('password', profileData.password);
        set('name', profileData.name);
        set('surname', profileData.surname);
        set('sex', profileData.sex)
        set('birthPlace', profileData.birthPlace || '' );
        set('livingCity', profileData.livingCity || '' );
        set('biyo', profileData.biyo || '' );
        set('edu', profileData.edu || '' );
        set('job', profileData.job || '' );
    });

    return(
        <Modal
            open={show}
            onCancel={() => { setShow(false) }}
            onOk={() => { setShow(false) }}
            footer={null}
        >   
            <p style={{fontSize:16, color:'rgba(0,0,0,.6)', marginBottom:20}}>{t('profilinizi_guncelleyin')}</p>
            <Form
                form={form}
                name="settings-form"
                labelCol={{ span: 24 }}
                onFinish={onFinish}
            >
                <Form.Item
                    style={{margin:0}}
                    name={'name'}
                    label={t('isim')}
                    rules={[{required:true, message:t('isim_gerekli')}]}
                >
                    <Input maxLength={50} showCount={true}/>
                </Form.Item>
                <Form.Item
                    style={{margin:0}}
                    name={'surname'}
                    label={t('soy_isim')}
                    rules={[{required:true, message:t('soyisim_gerekli')}]}
                >
                    <Input maxLength={50} showCount={true}/>
                </Form.Item>
                <Form.Item 
                    style={{margin:0}}
                    name={'password'}
                    label={t('sifre')}
                    rules={[{required:true, message:t('sifre_gerekli')}]} 
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item 
                    style={{margin:0}}
                    name={'biyo'}
                    label={t('biyografi')}
                >
                    <TextArea maxLength={100} showCount={true}/>
                </Form.Item>
                <Form.Item 
                    name={'sex'}
                    label={t('cinsiyet')}
                    rules={[{required:true, message:t('cinsiyet_gerekli')}]} 
                    style={{margin:0}}
                >
                    <Select
                        options={[{label:t('erkek'), value:'Erkek'}, {label:t('bayan'), value:'Kadın'}, {label:t('belirtmek_istemiyorum'), value:'Belirtmek İstemiyorum'} ]}
                    />
                </Form.Item>
                <Form.Item
                    name={'birthdate'}
                    label={t('dogum_tarihi')}
                    rules={[{required:true, message:t('dogum_tarihi_gerekli')}]}
                    style={{margin:0}}
                >
                    <DatePicker/>
                </Form.Item>
                <Form.Item 
                    name={'birthPlace'}
                    label={t('dogum_yeri')}
                    style={{margin:0}}
                >
                    <Input maxLength={50} showCount={true}/>
                    {/* <Select
                        options={states.map( (city) => { return {value:city, label:city}})}
                    /> */}
                </Form.Item>
                <Form.Item 
                    name={'livingCity'}
                    label={t('yasadigi_yer')}
                    style={{margin:0}}
                >
                    <Input maxLength={50} showCount={true}/>
                </Form.Item>
                <Form.Item 
                    style={{margin:0}}
                    name={'edu'}
                    label={t('egitim')}
                >
                    <Input maxLength={50} showCount={true}/>
                </Form.Item>
                <Form.Item 
                    style={{margin:'0 0 20px 0'}}
                    name={'job'}
                    label={t('meslek')}
                >
                    <Input maxLength={50} showCount={true}/>
                </Form.Item>
                <Form.Item>
                    <Button loading={loading} type="primary" htmlType="submit" className="bgc-softblue">{t('kaydet')}</Button>
                </Form.Item>
            </Form>
        </Modal>
    )
}


export default SettingsModal;