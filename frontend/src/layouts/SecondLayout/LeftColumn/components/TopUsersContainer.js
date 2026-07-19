import {Avatar, Spin, Tooltip} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import React from "react";
import { useTranslation } from 'react-i18next';
import { useScreenSize } from '../../../../Context/ResponsiveContext';
import throwNotification from '../../../../GeneralFunctions/throwNotification';
import apiRequest from '../../../../services';
import { useProfile } from '../../../../Context/UserProfileContext';
import { useUserAuth } from '../../../../Context/UserAuthContext';

const TopUsersContainer = () => {

    const { t } = useTranslation();
    const {screenSize} = useScreenSize();
    const [loading, setLoading] = React.useState(false);
    const [ users, setUsers ] = React.useState([])
    const { profileData, setProfileData } = useProfile();
    const { user } = useUserAuth();

    const getTopUsers = React.useCallback( async () => {

        setLoading(true);
        
        const request = await apiRequest({endpoint:'/user/get-top-users'});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setUsers(request.responseData.response);
        }
        setLoading(false);
    }, []);

    React.useEffect(() => {
        getTopUsers();
    }, [getTopUsers])

    return(
        
        <>
            {
                loading ?
                <div style={{width:'100%', height:50, display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size='large'/></div>
                :
                users.length > 1 ?
                <div className='topUsersContainer dkBox'>
                    <h3 style={{color:'#424242'}}>{t('en_katilimci')}</h3>
                    <span style={{width:'100%', height:1, display:'block', backgroundColor:'var(--dkGray)', margin:'10px auto'}}></span>
                    <Avatar.Group >
                    {
                        users.slice(0, 5).map( (userItem, index) => {
                            return (
                            <span key={index} onClick = { () => { setProfileData({...profileData, userID:userItem.id, show:true, currentUserToken:user.token}); } }>
                                <Tooltip  title={userItem.username}  placement="top" > 
                                    {
                                        userItem.img 
                                        ?
                                        <Avatar style={{cursor:'pointer'}} src={userItem.img} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>
                                        :
                                        <Avatar style={{ backgroundColor: '#87d068', cursor:'pointer'}} icon={<UserOutlined />} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>
                                    }
                                </Tooltip>
                            </span>
                            )
                        })
                    }
                    </Avatar.Group>
                    {
                        users.length > 4 && 
                        <Avatar.Group >
                        {
                            users.slice(5, 10).map( (userItem, index) => {
                                return (
                                    <span style={{cursor:'pointer'}} key={index} onClick = { () => { setProfileData({...profileData, userID:userItem.id, show:true, currentUserToken:user.token}); } }>
                                        <Tooltip  title={userItem.username}  placement="top" > 
                                            {
                                                userItem.img 
                                                ?
                                                <Avatar style={{cursor:'pointer'}} src={userItem.img} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>
                                                :
                                                <Avatar style={{ backgroundColor: '#87d068', cursor:'pointer'}} icon={<UserOutlined />} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>

                                            }
                                        </Tooltip>
                                    </span>
                                )
                            })
                        }
                        </Avatar.Group>
                    }
                    {
                        users.length > 9 && 
                        <Avatar.Group >
                        {
                            users.slice(10, 15).map( (userItem, index) => {
                                return (
                                    <span style={{cursor:'pointer'}} key={index} onClick = { () => { setProfileData({...profileData, userID:userItem.id, show:true, currentUserToken:user.token}); } }>
                                        <Tooltip  title={userItem.username}  placement="top" > 
                                            {
                                                userItem.img 
                                                ?
                                                <Avatar style={{cursor:'pointer'}} src={userItem.img} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>
                                                :
                                                <Avatar style={{ backgroundColor: '#87d068', cursor:'pointer'}} icon={<UserOutlined />} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>

                                            }
                                        </Tooltip>
                                    </span>
                                )
                            })
                        }
                        </Avatar.Group>
                    }
                    {
                        users.length > 14 && 
                        <Avatar.Group >
                        {
                            users.slice(15, 20).map( (userItem, index) => {
                                return (
                                    <span style={{cursor:'pointer'}} key={index} onClick = { () => { setProfileData({...profileData, userID:userItem.id, show:true, currentUserToken:user.token}); } }>
                                        <Tooltip  title={userItem.username}  placement="top" > 
                                            {
                                                userItem.img 
                                                ?
                                                <Avatar style={{cursor:'pointer'}} src={userItem.img} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>
                                                :
                                                <Avatar style={{ backgroundColor: '#87d068', cursor:'pointer'}} icon={<UserOutlined />} size={ screenSize > 1200  ? 'large' : screenSize > 750 ? 'medium' : screenSize < 450 ? 'large' : 'default'}/>

                                            }
                                        </Tooltip>
                                    </span>
                                )
                            })
                        }
                        </Avatar.Group>
                    }
                    
                </div>
                :
                <span></span>
            }
        </>
        
    )
}
export default React.memo(TopUsersContainer);