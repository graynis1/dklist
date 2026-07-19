import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Spin, Upload } from 'antd';
import React from 'react'
import { UploadOutlined } from '@ant-design/icons';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import apiRequest from '../../../services';
import ButtonComponent from '../../../GeneralComponents/ButtonComponent';
import { useUserAuth } from '../../../Context/UserAuthContext';
import { t } from 'i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';


// Bu kısmı eklemedim

const EditBlogModal = ({show, setShow, data, setData}) => {

    const {user} = useUserAuth();
    const [blogDatas, setBlogDatas] = React.useState(data);
    const [file, setFile] = React.useState(null);
    const [temp, setTemp] = React.useState(0);
    console.log('Blog edit modal render edildi');


    const updateBlog = async () => {

        const formData = new FormData();

        formData.append('preview', blogDatas.preview);
        formData.append('title', blogDatas.title);
        formData.append('content', blogDatas.content);
        file && file[0] && file[0].originFileObj && formData.append('image', file[0].originFileObj);

        const request = await apiRequest({endpoint:'/blog/'+blogDatas.id, body:formData, headers:{Authorization:user.token}, method:'POST'});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('bir_hata_olustu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setShow(false);
            setData(request.responseData.response);
        }
    }

    // React.useEffect(() => {
    //     console.log('X')
    //     setBlogDatas({ ...data });
    // }, [data]);

    React.useEffect(() => {
        const element = document.querySelector("div.ql-editor.ql-blank");
        if (element) {
            element.innerHTML = data.content;
        }
        else{
            setTimeout(() => {
                setTemp(prev => prev - 1);
            }, 500);
        }
    }, [temp])

    return(
        <Modal
            title={t('duzenle')}
            centered
            open={show}
            onOk={() => {setShow(false)}}
            onCancel={() => {setShow(false)}}
            footer = { null }
        >

            <Input maxLength={50} placeholder={t('blog_basligi')} defaultValue={data.title} value={blogDatas.title} onChange={ e => { setBlogDatas({...blogDatas, title:e.currentTarget.value}) }} style={{marginTop:10}}/>

            <Input.TextArea maxLength={500} showCount placeholder={t('blog_onizleme')} defaultValue={data.preview} value={blogDatas.preview} onChange={ e => { setBlogDatas({...blogDatas, preview:e.currentTarget.value}) }} style={{marginTop:10, marginBottom:10}}/>
            
            <Upload
                listType="picture"
                defaultFileList={[{ uid: '-1', name: 'defaultImage.jpg', status: 'done', url: data.img }]}
                onChange={({ fileList: newFile }) => { setFile([newFile[0]]) }}
                beforeUpload={() => { return false; }}
                maxCount={1}
            > 
                <Button style={{marginTop:10, marginBottom:5}} icon={<UploadOutlined />}>{t('yukle')}</Button>
            </Upload>
            
            <div style={{height:300, marginTop:15}}>
                <ReactQuill 
                    style={{height:250}}
                    onChange={ (value) => { setBlogDatas({ ...blogDatas, content:value })} }
                />
            </div>

            <ButtonComponent onClick={async () => {await updateBlog()}}>{t('Guncelle')}</ButtonComponent>

        </Modal>
    );
}


export default EditBlogModal;


