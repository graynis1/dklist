import { UploadOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, Modal, Upload } from "antd";
import React from "react";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../../../../services";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";

const AddCevirmenFormModal = ( { modal, setModal, data, setData } ) => {

    const [form] = Form.useForm();
    const {user} = useUserAuth();

    const onFinish =  async (values) => {
        
        const formData = new FormData();

        formData.append('name', values.name);
        values.img  && formData.append('img'  , values.img.file );
        values.biyo && formData.append('biyo' , values.biyo );

        let d_temp = null;
        if ( values.birthDate ){
            d_temp = values.birthDate;
            d_temp = d_temp.$y+'-'+(d_temp.$M+1)+'-'+d_temp.$D;
            formData.append('birthDate', d_temp);
        }
        if ( values.deathDate ){
            d_temp = values.deathDate;
            d_temp = d_temp.$y+'-'+(d_temp.$M+1)+'-'+d_temp.$D;
            formData.append('deathDate', d_temp);
        }

        const request = await apiRequest({ endpoint:'/translator/add', body:formData, headers:{Authorization:user.token}, method:'POST' });

        if ( request.error || !request.responseData.status ){
            throwNotification({
                type:'error',
                description:request.responseData.message || 'Çevirmen Eklenirken Sunucu Tarafli Bir Hata Oluştu',
                message:'İşlem Başarısız'
            });
            request.errorMessage && console.error('Alınan Hata : ', request.errorMessage);
        }
        else{
            form.resetFields();
            throwNotification({
                type:'success',
                description:'Yazar Eklendi',
                message:'İşlem Başarılı'
            });
            
            if ( data.meta.filteredCount < data.meta.pagePerSize ) {
                const responseData = request.responseData.response;
                setData( {
                    meta: { ...data.meta, filteredCount:data.meta.filteredCount + 1 },
                    translators : [ ...data.translators, { id:responseData.id , name:responseData.name, birthDate: responseData.birthDate, deathDate: responseData.deathDate, biyo:responseData.biyo, img:responseData.img } ]
                } )                
            }
            else{
                setData({ ...data, meta:{ ...data.meta, filteredCount: data.meta.filteredCount + 1 } });
            }
        }
    };

    const handleUploadPictureBeforeUpload = (file) => {
        if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
            throwNotification({
                type:'warning',
                duration:4,
                description:'İzin verilen resim formatları : png, jfif, jpg, jpeg, webp',
                message: 'Yanlış dosya formatı'
            });
        }
        return false;
    }

    return(
        <Modal
            title="Çevirmen Ekle"
            centered
            open={modal}
            onOk={() => {setModal(false);}}
            onCancel={() => {setModal(false);}}
            width={900}
            okText='Tamam'
            cancelText='Kapat'
        >
            <Form
                onFinish={onFinish}
                autoComplete="off"
                form={form}
                labelCol={{span:4, offset:1}}
                name="add-cevirmen"
                style={{ width: 800 }}
            >
                <Form.Item
                    name={'name'}
                    label="İsim"
                    rules={[
                        {
                            required: true,
                            message:'Isim Gerekli'
                        },
                    ]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name={'biyo'}
                    label="Biyografi"
                >
                    <Input.TextArea allowClear showCount maxLength={2000}/>
                </Form.Item>
                <Form.Item
                    label="Doğum tarihi"
                    name="birthDate"
                >
                    <DatePicker format='YYYY-MM-DD' />
                </Form.Item>
                <Form.Item
                    label="Ölüm tarihi"
                    name="deathDate"
                >
                    <DatePicker format='YYYY-MM-DD' />
                </Form.Item>
                <Form.Item
                    label="Resim"
                    name="img"
                    rules={[
                        {
                            required: true,
                            message:'Resim Gerekli'
                        },
                    ]}
                >
                    <Upload maxCount={1} name="img"  listType="picture" beforeUpload={handleUploadPictureBeforeUpload} >
                        <Button icon={<UploadOutlined />}>Resim Yükle</Button>
                    </Upload>
                </Form.Item>
               
                <Form.Item
                    wrapperCol={{
                        offset: 5,
                    }}
                >
                    <Button type="primary" htmlType="submit">
                        Kaydet
                    </Button>
                </Form.Item>
            </Form>
        </Modal>       
    );
}

export default AddCevirmenFormModal;