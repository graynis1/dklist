import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../../Context/UserAuthContext';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import './style.css';
import { Avatar, Input, List, Form, Spin, Tooltip, Popconfirm } from 'antd';
import { DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useForm } from 'antd/es/form/Form';
import apiRequest from '../../../services';
import throwNotification from '../../../GeneralFunctions/throwNotification';

const ChatSayfasi = () => {

    const navigate = useNavigate();
    const { user } = useUserAuth();
    const { t } = useTranslation();
    if ( !user.token ) {
        navigate('/');
    }

    const [ loading, setLoading ] = React.useState(false);

    const [form] = useForm();
    const ref = useRef(null);
    const [ data, setData ] = React.useState({users:[],messages:[]});

    const [ selectedUser, setSelectedUser ] = React.useState(0);

    const sendMessage = async (values) => {

        
        let message = '';
        
        if ( !values ) {
            message = form.getFieldValue('newMessage');    
        }
        else{
            message = values.newMessage;
        }

        setLoading(true);
        const request = await apiRequest({endpoint:'/message/send', headers:{Authorization:user.token}, method:'POST', body:JSON.stringify({message:message, receiverID:selectedUser})});
        setLoading(false);
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('mesaj_gonderilirken_bir_hata_olustu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setData( { ...data, messages:[request.responseData.response, ...data.messages] } );
            form.resetFields();
        }

    }

    const getData = React.useCallback(async () => {

        const request = await apiRequest({endpoint:'/message/get/'+selectedUser, headers:{Authorization:user.token}});
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('mesajlar_getirilirken_bir_hata_olustu_tekrar_deneyin'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            const response = request.responseData.response;
            setData( { users:response.users, messages:response.messages } );
        }

    }, [selectedUser, t, user.token]);

    React.useEffect(() => {
        ref.current.scrollTop = ref.current.scrollHeight;
    }, [sendMessage])

    React.useEffect(() => {
        getData();
        const intervalId = setInterval(() => {
            getData();
        }, 10000);
        return () => clearInterval(intervalId);
    }, [selectedUser, getData]);


    return(
        <>
        
            <Helmet>
                <title>{t('Mesajlar')}</title>
            </Helmet>

            <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center', margin:'20px 0'}}>
                <div className='chatContainer'>
                    <div className='chatLeftContainer'>
                        {
                            data.users.length > 0 &&
                            <List
                                itemLayout="horizontal"
                                dataSource={data.users}
                                renderItem={(userItem) => (
                                    <List.Item 
                                        style={{display:'flex', alignItems:'center', justifyContent:'flex-start', paddingLeft:20, color:'white', cursor:'pointer', opacity:userItem.id === selectedUser ? 1 : 0.8}}
                                        key={userItem.id}
                                    >
                                        <span style={{cursor:'pointer'}} onClick={() => { setSelectedUser(userItem.id) }} >
                                            {
                                                userItem.image ?
                                                    <Avatar src={userItem.image} style={{marginRight:20}}/>
                                                :
                                                    <Avatar style={{marginRight:20}}> { userItem.name.slice(0,1) } </Avatar>
                                            }
                                        </span>
                                        <span onClick={() => { setSelectedUser(userItem.id) }} >{userItem.name}</span>
                                        <DeleteOutlined className='deleteChatIcon' onClick={ async () => {

                                            const request = await apiRequest({endpoint:'/chat/delete/'+userItem.id, headers:{Authorization:user.token}, method:'DELETE'});
                                                                                                    
                                            if ( request.error || !request.responseData || !request.responseData.status ) {
                                                throwNotification({
                                                    type:'error',
                                                    message:t('mesaj_silinirken_bir_hata_oluştu'),
                                                    duration:3
                                                });
                                                console.error('Alınan hata : ', request.errorMessage);
                                            }
                                            else{
                                                setData({
                                                    users:data.users.filter( item => item.id !== userItem.id ),
                                                    messages:userItem.id === userItem.id ? [] : data.messages
                                                });
                                            }
                                            
                                        }}/>
                                    </List.Item>
                                )}
                            />
                        }
                    </div>

                    <div className='chatRightContainer'>

                        <div className='chatRightContainerHeader'>
                            <span>{ data.users && data.users.length > 0 && data.users.find( userItem => userItem.id === selectedUser ) ? data.users.find( userItem => userItem.id === selectedUser ).name  : t('Mesajlar')}</span>
                        </div>

                        <div ref={ref} className='chatRightContainerMessagesContainer'>
                        
                            <div className='chatBox'> 
                                {
                                    loading ?
                                    <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size='large'/></div>
                                    :
                                    data.messages && data.messages.length > 0 &&
                                    data.messages.map( mes => {
                                        return(
                                            <div key={mes.id} style={{flexDirection:Number(mes.sender.id) !== Number(user.id) ? 'row' : 'row-reverse'}} className='messageBox'>
                                                <div style={{width:30, height:30}}>
                                                    <span style={{cursor:'pointer'}}>
                                                        {
                                                            mes.sender.image ?
                                                            <Avatar style={{width:30, height:30}} src={mes.sender.image}/>
                                                            :
                                                            <Avatar style={{width:30, height:30}}> { mes.sender.username.slice(0,1) } </Avatar>
                                                        }
                                                    </span>
                                                </div>
                                                <Popconfirm
                                                    disabled={Number(mes.sender.id) !== Number(user.id)}
                                                    title={t('mesaji_sil')}
                                                    description={t('Mesaji_silmek_istiyormusun?')}
                                                    okText={t('sil')}
                                                    cancelText={t('iptal')}
                                                    trigger={'hover'}
                                                    onConfirm={async () => { 
                                                        
                                                        const request = await apiRequest({endpoint:'/message/delete/'+mes.id, headers:{Authorization:user.token}, method:'DELETE'});
                                                        
                                                        if ( request.error || !request.responseData || !request.responseData.status ) {
                                                            throwNotification({
                                                                type:'error',
                                                                message:t('mesaj_silinirken_bir_hata_oluştu'),
                                                                duration:3
                                                            });
                                                            console.error('Alınan hata : ', request.errorMessage);
                                                        }
                                                        else{
                                                            setData({users:data.users, messages:data.messages.filter( item => item.id !== mes.id )});
                                                        }

                                                    }}
                                                >
                                                    <span style={{cursor:Number(mes.sender.id) === Number(user.id) ? 'pointer' : 'default' , backgroundColor:Number(mes.sender.id) === Number(user.id) ? 'var(--softBlue)' : 'var(--dkred)' , color:'white', padding:'0 10px', borderRadius:10}} className='chatBoxMessage'> {mes.message} </span>
                                                </Popconfirm>
                                            </div>
                                            
                                        )
                                    })
                                }
                            </div>

                        </div>

                        <div className='chatRightContainerInputContainer'>
                        <Form
                            form={form}
                            name="add_message"
                            onFinish={sendMessage}
                            style={{width:'100%', height:35}}
                        >
                            
                            <Form.Item
                                name={'newMessage'}
                            >
                                <Input disabled={selectedUser===0} addonAfter={<SendOutlined onClick={() => { sendMessage(); }} className='sendIconChat'/>}/>
                            </Form.Item>
                        </Form>
                        </div>

                    </div>
                </div>
            </div>

        </>
    )
}

export default ChatSayfasi;