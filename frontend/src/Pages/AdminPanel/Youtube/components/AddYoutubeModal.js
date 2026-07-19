import { Button, Form, Input, Modal } from 'antd';
import React from 'react'
import TextArea from 'antd/es/input/TextArea';
import throwNotification from '../../../../GeneralFunctions/throwNotification';
import apiRequest from '../../../../services';
import { useUserAuth } from '../../../../Context/UserAuthContext';


const AddVideoModal = ({modal, setModal,data, setData}) => {

    const {user} = useUserAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false)

    const onFinish = async (values) => {

        const body = JSON.stringify({
            'title':values.title,
            'embededCode':values.embededCode,
        })

        setLoading(true);

        const request = await apiRequest({ endpoint:'/youtube/add', body:body, headers:{Authorization:user.token}, method:'POST' });

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Kitap eklenirken sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            throwNotification({
                type:'success',
                message:'Başarılı',
                description: 'Youtube Videosu Eklendi',
                duration:3
            });
            form.resetFields();
            setData({videos:[...data.videos, request.responseData.response], meta:{...data.meta, filteredCount:data.meta.filteredCount+1}})
        }
        setLoading(false)
    };


    return(
        <Modal
            title="Kitap Ekle"
            centered
            open={modal}
            onOk={() => {setModal(false);}}
            onCancel={() => {setModal(false);}}
            width={1000}
            okText='Tamam'
            cancelText='Kapat'
        >
            <Form
                form={form}
                name="add-video"
                onFinish={onFinish}
                style={{ maxWidth: 800 }}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 12 }}
            >
                <Form.Item
                    name={'title'}
                    label="Video Başlığı"
                    rules={[ { required:true, message:'Video Başlığı gerekli'} ]}
                >
                    <Input allowClear/>

                </Form.Item>
                <Form.Item
                    name={'embededCode'}
                    label="Video Kodu"
                    rules={[ { required:true, message:'Video Kodu gerekli'} ]}
                >
                    <TextArea showCount maxLength={3000} allowClear={true}/>
                </Form.Item>
                <Form.Item
                    wrapperCol={{
                        offset: 6,
                    }}
                >
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Kaydet
                    </Button>
                </Form.Item>
            </Form>        
        </Modal>
    );
}


export default AddVideoModal;