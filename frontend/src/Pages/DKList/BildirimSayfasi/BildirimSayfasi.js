import React from "react";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useNavigate } from "react-router-dom";
import { Avatar, List } from 'antd';
import './style.css';
import { DeleteOutlined } from "@ant-design/icons";
import apiRequest from "../../../services";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../../Context/UserProfileContext";
import ButtonComponent from "../../../GeneralComponents/ButtonComponent";

const BildirimSayfasi = () => {

    const [ loading, setLoading ] = React.useState(false);
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [ data, setData ] = React.useState([]);
    const { t, i18n } = useTranslation();
    const { profileData, setProfileData } = useProfile();
    const [deleteLoading, setDeleteLoading] = React.useState(false);

    const deleteAllNotifications = async () => {
        
        setDeleteLoading(true);

        const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/all-notify', method:'DELETE'});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
        }
        else{
            const responseData = request.responseData.response;
            setData([]);
        }

        setDeleteLoading(false);

    }

    const getNotification = async () => {

        setLoading(true);

        const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/all-notify'});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
        }
        else{
            const responseData = request.responseData.response;
            setData([...responseData]);
        }

        setLoading(false);
    }

    const deleteNotification = async (id) => {

        const oldData = data;

        setData(data.filter( item => item.id !== id));

        setLoading(true);

        const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/notify/'+id, method:'DELETE'});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
            setData([...oldData]);
        }

        setLoading(false);
    }

    const setView = async () => {
        await apiRequest({headers:{Authorization:user.token}, endpoint:'/notify', method:'PUT'});
    }

    React.useEffect(() => {
        if ( !user.token ) {
            navigate('/')
        }
    }, [user]);

    React.useEffect(() => {
        getNotification();
    }, []);

    React.useEffect(() => {
        data.length > 0 && setView();
    }, [data]);

    return(
        <div className="notifiactionContainer">
            <div className="notificationListContainer">
                {
                    data.length > 0 &&
                    <ButtonComponent 
                        onClick={ async () => { await deleteAllNotifications()}} 
                        style={{borderColor:'red', color:'red', margin:'10px auto', display:'block'}}
                    >
                        {t('tum_bildirimleri_sil')}
                    </ButtonComponent>
                }
                <List
                    loading={loading}
                    dataSource={data}
                    renderItem={(item, index) => (
                    <List.Item
                        style={{backgroundColor: !item.view ? '#e7e7e7' : '#f7f8fb', padding:10, marginBottom:10}}
                    >
                        <List.Item.Meta
                            avatar={
                                item.otherUser.image ? 
                                <Avatar style={{cursor:"pointer"}} src={item.otherUser.image}  onClick={() => { setProfileData({...profileData, userID : item.otherUser.id, show:true}) }}/>
                                :
                                <Avatar style={{cursor:"pointer"}} onClick={() => { setProfileData({...profileData, userID : item.otherUser.id, show:true}) }}>
                                    {item.otherUser.username}
                                </Avatar>
                            }
                            title={<span style={{cursor:"pointer"}} onClick={() => { setProfileData({...profileData, userID : item.otherUser.id, show:true}) }} >{item.otherUser.username}</span>}
                            description={ i18n.language === 'tr' ? item.contentTR : item.contentUS }
                        />
                        <DeleteOutlined className="deleteNotifyIcon" onClick={ async () => { await deleteNotification(item.id) }}/>
                    </List.Item>
                    )}
                />
            </div>
        </div>
    )
}

export default BildirimSayfasi;