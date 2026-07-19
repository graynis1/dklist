import {Button, DatePicker, Form, Input, Modal, Upload} from "antd";
import React from "react";
import {UploadOutlined} from "@ant-design/icons";
import throwNotification from "../../../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../../../services";
import { useUserAuth } from "../../../../../Context/UserAuthContext";

const RozetAddFormModal = ( {data, setData, modal, setModal} ) => {
    const {user} = useUserAuth()
    const [ buttonLoader, setButtonLoader ] = React.useState(false);
    const [isOkey, setIsOkey] = React.useState(true);
    const [form] = Form.useForm();
    const onFinish =  async (values) => {

        setButtonLoader(true);

        const formData = new FormData();

        formData.append('comment', values.comment);
        formData.append('img', values.img.file);
        formData.append('name', values.name);
        formData.append('nameUS', values.nameUS);
        formData.append('commentUS', values.commentUS);

        const request = await apiRequest({ endpoint:'/badge/add', body:formData, method:'POST', headers:{Authorization:user.token} });
        if ( request.error || !request.responseData.status ){
            throwNotification({
                type:'error',
                description:request.errorMessage || request.responseData.message,
                message:'İşlem Başarısız'
            });
        }
        else{
            form.resetFields();
            throwNotification({
                type:'success',
                description:'Rozet Eklendi',
                message:'İşlem Başarılı'
            });
            if ( data.meta.filteredCount < data.meta.pagePerSize && data.badges.length < data.meta.pagePerSize ) {
                const responseData = request.responseData.response;
                setData( {
                    meta: { ...data.meta, filteredCount:data.meta.filteredCount + 1 },
                    badges : [ ...data.badges, responseData ]
                } )                
            }
            else{
                setData({ ...data, meta:{ ...data.meta, filteredCount: data.meta.filteredCount + 1 } });
            }
        }
        setButtonLoader(false)
    };

    const handleUploadPictureBeforeUpload = (file) => {
        if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
            throwNotification({
                type:'warning',
                duration:4,
                description:'İzin verilen resim formatları : png, jfif, jpg, jpeg, webp',
                message: 'Yanlış dosya formatı'
            });
            setIsOkey(false);
        }
        return false;
    }

    return(
        <Modal
            title="Rozet Ekle"
            centered
            open={modal}
            onOk={() => {setModal(false);}}
            onCancel={() => {setModal(false);}}
            width={900}
            okText='Tamam'
            cancelText='Kapat'
        >
            <Form
                form={form}
                name="basic"
                labelCol={{
                    span: 8,
                }}
                wrapperCol={{
                    span: 14,
                }}
                style={{
                    maxWidth: 600,
                }}
                onFinish={onFinish}
                autoComplete="off"
            >
                <Form.Item
                    label="Rozet Adı"
                    name="name"
                    rules={[ { required: true, message: 'İsim girmek Zorundasın!'}]}
                >
                    <Input showCount maxLength={50} />
                </Form.Item>
                <Form.Item
                    label="Rozet Adı İngilizce"
                    name="nameUS"
                >
                    <Input showCount maxLength={50} />
                </Form.Item>
                <Form.Item
                    label="Rozet Açıklaması"
                    name="comment"
                    rules={[ { required: true, message: 'Açıklama girmek zorundasın!'}]}
                >
                    <Input.TextArea showCount maxLength={255} />
                </Form.Item>
                <Form.Item
                    label="Rozet Açıklaması İngilizce"
                    name="commentUS"
                >
                    <Input.TextArea showCount maxLength={255} />
                </Form.Item>
                <Form.Item
                    label="Resim"
                    name="img"
                    rules={[ { required: true, message: 'Resim seçmek zorundasın!'}]}
                >
                    <Upload maxCount={1} name="img"  listType="picture" beforeUpload={handleUploadPictureBeforeUpload} onRemove={() => { setIsOkey(true) }}>
                        <Button icon={<UploadOutlined />}>Resim Yükle</Button>
                    </Upload>
                </Form.Item>
                <Form.Item
                    wrapperCol={{
                        offset: 8,
                        span: 14,
                    }}
                >
                    <Button  loading = { buttonLoader } disabled={!isOkey} type="primary"  htmlType="submit" >
                        Kaydet
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    )
}

export default RozetAddFormModal;