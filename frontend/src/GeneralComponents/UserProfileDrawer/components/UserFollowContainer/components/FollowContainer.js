import React from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../../../../Context/UserProfileContext";
import { Avatar, List, Tooltip } from "antd";
import { PlusOutlined, UsergroupDeleteOutlined } from "@ant-design/icons";
import { useUserAuth } from "../../../../../Context/UserAuthContext";
import apiRequest from "../../../../../services";




const FollowContainer = ({mode}) => {

    const { profileData, setProfileData } = useProfile();
    const { t } = useTranslation();
    const { user } = useUserAuth();

    const follow = async (id, operation) => {

        const oldProfile = profileData;
        // mode1 kullanıcının kendisini takip eden kullanıcının kendisini takip etmesini siler
        // mode2 ise kullanıcının kendi takip ettiğini kaldırır


        if ( operation === 'mode1') {
            setProfileData({
                ...profileData, 
                currentUserToken:user.token, 
                followers:profileData.followers.filter( item => item.id !== id )
            })

            const request = await apiRequest({endpoint:'/delete-follow/'+id, headers:{Authorization:user.token}});

            if (request.error || request.responseData.status === false) {
                setProfileData({...oldProfile});
            }

        }
        else {

            setProfileData({
                ...profileData, 
                currentUserToken:user.token, 
                follow:profileData.follow.filter( item => item.id !== id )
            })

            const request = await apiRequest({endpoint:'/switch-follow/'+id, headers:{Authorization:user.token}});

            if (request.error || request.responseData.status === false) {
                setProfileData({...oldProfile});
            }

        }
        
    }

    return (
        <div className="followerContainer">
            <List
                itemLayout="horizontal"
                dataSource={mode === 1 ? profileData.followers : profileData.follow}
                renderItem={(item, index) => (
                    <List.Item
                        key={index}
                        actions={[
                            (Number(profileData.userID) === Number(user.id)) &&
                            (
                                mode === 1 ? 
                                <Tooltip title={t('takipciyi_cikar')}> <UsergroupDeleteOutlined style={{cursor:'pointer', color:'black', marginLeft:10}} onClick={() => { follow(item.id, 'mode1') }}/> </Tooltip> 
                                : 
                                <Tooltip title={t('takipten_cik')}> <UsergroupDeleteOutlined style={{cursor:'pointer', color:'black', marginLeft:10}} onClick={() => { follow(item.id, 'mode2') }}/> </Tooltip> 
                            )
                        ]}
                    >
                        <List.Item.Meta
                            avatar={<Avatar src={item.image || '/images/nopic2.png'} />}
                            title={<span>{item.username}</span>}
                        />
                  </List.Item>
                )}
                />

        </div>
    )
}
export default FollowContainer;