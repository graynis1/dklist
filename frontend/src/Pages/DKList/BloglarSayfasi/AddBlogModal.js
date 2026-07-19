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

const AddBlogModal = ({show, setShow, query, setQuery}) => {

    const {user} = useUserAuth();
    const [value, setValue]         = React.useState('');
    const [title, setTitle]         = React.useState('');
    const [preview, setPreview]     = React.useState('');
    const [file, setFile]           = React.useState(null);
    const [disabled, setDisabled]   = React.useState(false);

    // ReactQuill için resim upload handler
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('image', file);

                try {
                    // Resmi sunucuya upload et
                    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'https://dklist.com/api';
                    const response = await fetch(`${apiBaseUrl}/upload-image`, {
                        method: 'POST',
                        headers: {
                            'Authorization': user.token
                        },
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const imageUrl = data.imageUrl;

                        // Quill editor'a resmi ekle
                        const quill = this.quill;
                        const range = quill.getSelection();
                        quill.insertEmbed(range.index, 'image', imageUrl);
                    } else {
                        throwNotification({
                            type: 'error',
                            message: 'Resim yüklenemedi',
                            duration: 3
                        });
                    }
                } catch (error) {
                    console.error('Resim upload hatası:', error);
                    throwNotification({
                        type: 'error',
                        message: 'Resim yüklenirken hata oluştu',
                        duration: 3
                    });
                }
            }
        };
    };

    // ReactQuill modülleri
    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    };

    const addBlog = async () => {

        const formData = new FormData();

        formData.append('title', title);
        formData.append('content', value);
        formData.append('preview', preview);
        formData.append('img', file[0].originFileObj);

        const request = await apiRequest({endpoint:'/blog', body:formData, headers:{Authorization:user.token}, method:'POST'});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('bir_hata_olustu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setFile(null);
            setValue('');
            setTitle('');
            setPreview('');
        }
        setQuery({...query});
    }

    React.useEffect(() => {
        setDisabled( !(file && value && title && preview) );
    }, [value, file, title, preview]);

    return(
        <Modal
            title={t('blog_ekle')}
            centered
            open={show}
            onOk={() => {setShow(false)}}
            onCancel={() => {setShow(false)}}
            footer = { null }
            maskClosable={false}
            closable={true}
            destroyOnClose={false}
        >

            <Upload
                listType="picture"
                value={ file ? [file] : [] }
                onChange={({ fileList: newFile }) => { setFile([newFile[0]]) }}
                beforeUpload={() => { return false; }}
                maxCount={1}
            > 
                <Button style={{marginTop:10, marginBottom:5}} icon={<UploadOutlined />}>{t('yukle')}</Button>
            </Upload>

            <Input maxLength={50} placeholder={t('blog_basligi')} value={title} onChange={ e => { setTitle(e.currentTarget.value) }} style={{marginTop:10}}/>

            <Input.TextArea maxLength={500} showCount placeholder={t('blog_onizleme')} value={preview} onChange={ e => { setPreview(e.currentTarget.value) }} style={{marginTop:10, marginBottom:10}}/>

            <div style={{height:300, marginTop:15}}>
                <ReactQuill 
                    style={{height:250}}
                    value={value} 
                    onChange={(newValue) => {setValue(newValue)}}
                    modules={modules}
                />
            </div>

            <ButtonComponent
                onClick = {addBlog}
                disabled = { disabled }                
            >{t('Gonder')}</ButtonComponent>

        </Modal>
    );
}


export default AddBlogModal;

// setFile(newFileList)