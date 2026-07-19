import { Button, Form, Input } from "antd";
import React from "react";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import TextArea from "antd/es/input/TextArea";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";
import apiRequest from "../../../../../../services";



const YayinEviAddForm =  ( {data, setData, query, setQuery } ) => {

    const {user} = useUserAuth();
    const [form] = Form.useForm();
    const [ buttonLoader, setButtonLoader ] = React.useState(false);

    const onFinish = async (values) => {

        setButtonLoader(true);
        const publishers = values.publishers.split(',').map( item => item.trim() );

        const request = await apiRequest( { endpoint:'/publisher/add-multiple', body:JSON.stringify({ publishers:publishers }), method:'POST', headers:{Authorization:user.token} } );

        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Yayın evi eklerken bir hata oluştu',
                description:request.errorMessage || request.responseData.message
            })
        }
        else{
            throwNotification({
                type:'success',
                message:'İşlem Başarılı',
                description:request.responseData.message || 'Yeni yayınevleri eklendi !'
            })
            form.resetFields();
            const addedItems = request.responseData.response || [];
            const addSize = data.meta.pagePerSize - data.publishers.length;
            if ( addSize > 0 )
            {
                if ( addedItems.length > addSize ){
                    setQuery({...query})
                }
                else{
                    setData({
                        meta:{ ...data.meta, filteredCount:(addedItems.length) + 1  },
                        publishers:[ ...data.publishers, ...addedItems.map( addedItem => { return {id:addedItem.id, name:addedItem.name} } ) ]
                    });
                }
            }

        }
        setButtonLoader(false);
    };

    return( 
        <Form
            form={form}
            name="basic"
            labelCol={{
                span: 8,
            }}
            wrapperCol={{
                span: 16,
            }}
            style={{
                maxWidth: 600,
            }}
            onFinish={onFinish}
            autoComplete="off"
        >
            <Form.Item
                label="Yayın Evi"
                name="publishers"
                rules={[ { required: true, message: 'Yayın Evini Girmek Zorundasın!'}]} 
            >
                <TextArea placeholder={'Eklemek istediğiniz kategorileri virgülle ayırarak girin girin'} style={{ height:90, resize:'none' }} allowClear showCount maxLength={510}/>
            </Form.Item>
            <Form.Item
                wrapperCol={{
                    offset: 8,
                    span: 16,
                }}
            >
                <Button type="primary" htmlType="submit" loading={buttonLoader}>
                    Kaydet
                </Button>
            </Form.Item>
        </Form>
    )
}

export default YayinEviAddForm;