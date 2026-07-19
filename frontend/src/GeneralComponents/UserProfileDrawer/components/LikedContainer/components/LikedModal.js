import React from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../../../../Context/UserProfileContext";
import { Avatar, List, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import apiRequest from "../../../../../services";
import { useUserAuth } from "../../../../../Context/UserAuthContext";


const LikedModal = ({mode}) => {

    const {profileData, setProfileData} = useProfile();
    const { i18n, t } = useTranslation();
    const { user } = useUserAuth();
    const [disabled, setDisabled] = React.useState(false);

    const action = async (id, mode) => {

        const oldProfileData = profileData;

        setDisabled(true);

        if (mode === 1) {
            setProfileData({...profileData, liked:{ translators:profileData.liked.translators, writers:profileData.liked.writers.filter( item => item.id !== id) }});
        }
        else{
            setProfileData({...profileData, liked:{ writers:profileData.liked.writers, translators:profileData.liked.translators.filter( item => item.id !== id) }});
        }

        const request = await apiRequest({endpoint:'/user-unlike', headers:{Authorization:user.token}, method:'POST', body:JSON.stringify({type: mode === 1 ? 'writer' : 'translator', id:id})});

        if (request.error || request.responseData.status === false) {
            setProfileData({...oldProfileData});
        }
        
        setDisabled(false);
    }

    return (
        <div className="likedModalContainer">
            <List
                itemLayout="horizontal"
                // loadMore={loadMore}
                dataSource={mode === 1 ? profileData.liked.writers : profileData.liked.translators}
                renderItem={(item, index) => (
                    <List.Item
                        key={index}
                        actions={[
                            (Number(user.id) === Number(profileData.userID)) && <Tooltip title={t('begenmektenvazgec')}> <DeleteOutlined style={{cursor:'pointer', color:'black', marginLeft:10}} onClick={() => {!disabled && action(item.id, mode)}}/> </Tooltip> 
                        ]}
                    >
                        <List.Item.Meta
                            avatar={<Avatar src={item.image || '/images/nopic2.png'} />}
                            title={<span>{item.name}</span>}
                            children
                        />
                  </List.Item>
                )}
                />

        </div>
    )
}
export default LikedModal;