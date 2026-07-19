import {Button, DatePicker, Form, Input, Upload} from "antd";
import React from "react";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import {UploadOutlined} from "@ant-design/icons";
import {useUserAuth} from '../../../../../../Context/UserAuthContext';
import apiRequest from '../../../../../../services';
const YazarAddForm = ( {data, setData} ) => {

    const [ buttonLoader, setButtonLoader ] = React.useState(false);
    const [isOkey, setIsOkey] = React.useState(true);
    const [form] = Form.useForm();
    const {user} = useUserAuth();
    const onFinish =  async (values) => {

        setButtonLoader(true);

        const formData = new FormData();

        formData.append('writerName', values.name);
        values.img  && formData.append('img'  , values.img.file );
        values.biyo && formData.append('biyo' , values.biyo );
        let d_temp = null;
        if ( values.date ){
            d_temp = values.date;
            d_temp = d_temp.$y+'-'+(d_temp.$M+1)+'-'+d_temp.$D;
            formData.append('date', d_temp);
        }

        const request = await apiRequest({ endpoint:'/writer/add', body:formData, method:'POST', headers:{Authorization:user.token} });

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
                description:'Yazar Eklendi',
                message:'İşlem Başarılı'
            });
            if ( data.meta.filteredCount < data.meta.pagePerSize ) {
                const responseData = request.responseData.response;
                setData( {
                    meta: { ...data.meta, filteredCount:data.meta.filteredCount + 1 },
                    writers : [ ...data.writers, { id:responseData.id , name:responseData.name, date: responseData.date, biyo:responseData.biyo, img:responseData.img } ]
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
        <Form
            form={form}
            name="basic"
            labelCol={{
                span: 6,
            }}
            wrapperCol={{
                span: 12,
            }}
            style={{
                maxWidth: 600,
            }}
            onFinish={onFinish}
            autoComplete="off"
        >
            <Form.Item
                label="Yazar Adı"
                name="name"
                rules={[ { required: true, message: 'İsim girmek Zorundasın!'}]}
            >
                <Input/>
            </Form.Item>
            <Form.Item
                label="Biyografi"
                name="biyo"
            >
                <Input.TextArea showCount maxLength={2000} />
            </Form.Item>
            <Form.Item
                label="Doğum tarihi"
                name="date"
            >
                <DatePicker format='YYYY-MM-DD' />
            </Form.Item>
            <Form.Item
                label="Resim"
                name="img"
                rules={[ { required: true, message: 'Resim girmek Zorundasın!'}]}
            >
                <Upload maxCount={1} name="img"  listType="picture" beforeUpload={handleUploadPictureBeforeUpload} onRemove={() => { setIsOkey(true) }}>
                    <Button icon={<UploadOutlined />}>Resim Yükle</Button>
                </Upload>
            </Form.Item>
            <Form.Item
                wrapperCol={{
                    offset: 6,
                    span: 12,
                }}
            >
                <Button  loading = { buttonLoader } disabled={!isOkey} type="primary"  htmlType="submit" >
                    Kaydet
                </Button>
            </Form.Item>
        </Form>
    )
}

export default YazarAddForm;