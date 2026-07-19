import { Modal, Tabs } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import FollowContainer from "./components/FollowContainer";
import { useProfile } from "../../../../Context/UserProfileContext";
import { useScreenSize } from "../../../../Context/ResponsiveContext";



const UserFollowContainer = () => {

    const [ modalData, setModalData ] = React.useState({tabkey:1, show:false});
    const { profileData } = useProfile();
    const { screenSize } = useScreenSize();

    const { t } = useTranslation();

    const items = [
        {
            key: 1,
            label: t('takipciler'),
            children: <FollowContainer mode={1}/>,
        },
        {
            key: 2,
            label: t('takipedilenler'),
            children: <FollowContainer mode={2}/>,
        },
    ];

    return(
        <div className="optionContainer">
            <span className="optionContainerItem" onClick={() => { setModalData({show:true, tabkey:1}); }}>{t('takipciler')+' : '+ ( profileData.followers && profileData.followers.length ? profileData.followers.length : 0)}</span>
            <span className="optionContainerItem" onClick={() => { setModalData({show:true, tabkey:2}); }}>{t('takipedilenler')+' : '+( profileData.follow && profileData.follow.length ? profileData.follow.length : 0)}</span>
            <Modal
                open={modalData.show}
                bodyStyle={{padding:0}}
                width={screenSize > 600 ? 400 : 280}
                footer={null}
                onCancel={() => {setModalData({...modalData, show:false})}}
            >
                <Tabs items={items} activeKey={modalData.tabkey} style={{margin:0, padding:0}} onChange={key => {setModalData({...modalData, tabkey:key})}} />
            </Modal>
        </div>
    )
}
export default UserFollowContainer;