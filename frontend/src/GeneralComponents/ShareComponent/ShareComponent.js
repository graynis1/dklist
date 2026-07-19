import { FacebookOutlined, LinkedinOutlined, ShareAltOutlined, TwitterOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Modal, Tooltip } from "antd";
import React from "react";
import './style.css';
import { useTranslation } from 'react-i18next';

const ShareComponent = ({content = '', url=window.location.href, red = false}) => {

    const [ show, setShow ] = React.useState(false);
    const { t } = useTranslation();

    const share = {
        facebook : () => { 
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        },
        twitter : () => { 
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}&url=${encodeURIComponent(url)}`, '_blank');
        },
        linkedin : () => { 
            window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}`, '_blank');
        },
        whatsapp : () => { 
            const facebookShareUrl = `https://api.whatsapp.com/send/?text=${'DK List - '+content+' '+url }`;
            window.open(facebookShareUrl, '_blank');
        }
    }

    return(
        <span>
            <ShareAltOutlined onClick={() => {setShow(true)}} className="mainShaceIcon" style={{color: !red ? 'black' : 'red'}}/>
            <Modal footer={null} open={show} onCancel={() => {setShow(false)}} bodyStyle={{display:'flex', justifyContent:'space-around', alignItems:'center', flexWrap:'wrap', paddingBottom:20}}>
                <div style={{width:'100%', height:70, margin:'10px 0', textAlign:'center', fontSize:24}} >{t('paylas')}</div>
                <Tooltip trigger={'hover'} title={t('facebookta_paylas')}><FacebookOutlined className="shareIcons" onClick={share.facebook} /> </Tooltip>
                <Tooltip trigger={'hover'} title={t('twitterda_paylas')}><TwitterOutlined className="shareIcons"  onClick={share.twitter} /> </Tooltip>
                <Tooltip trigger={'hover'} title={t('linkedinde_paylas')}><LinkedinOutlined className="shareIcons" onClick={share.linkedin} /> </Tooltip>
                <Tooltip trigger={'hover'} title={t('whatsappta_paylas')}><WhatsAppOutlined className="shareIcons" onClick={share.whatsapp} /></Tooltip>
            </Modal>
        </span>            
    )
}

export default ShareComponent