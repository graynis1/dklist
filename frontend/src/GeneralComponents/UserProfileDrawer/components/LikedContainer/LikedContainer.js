import { Modal, Tabs } from "antd";
import { t } from "i18next";
import React from "react";
import { useTranslation } from "react-i18next";
import FollowContainer from "./components/LikedModal";
import { useProfile } from "../../../../Context/UserProfileContext";
import { useScreenSize } from "../../../../Context/ResponsiveContext";
import LikedModal from "./components/LikedModal";



const LikedContainer = () => {

    const [ modalData, setModalData ] = React.useState({tabkey:1, show:false});
    const { profileData } = useProfile();
    const { screenSize } = useScreenSize();

    const {i18n, t} = useTranslation();

    const items = [
        {
            key: 1,
            label: t('begenilenyazarlar'),
            children: <LikedModal mode={1}/>,
        },
        {
            key: 2,
            label: t('begenilencevirmenler'),
            children: <LikedModal mode={2}/>,
        },
    ];

    return(
        <div className="optionContainer">
            <span className="optionContainerItem" onClick={() => { setModalData({show:true, tabkey:1}); }}>{t('begenilenyazarlar')}</span>
            <span className="optionContainerItem" onClick={() => { setModalData({show:true, tabkey:2}); }}>{t('begenilencevirmenler')}</span>
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
export default LikedContainer;