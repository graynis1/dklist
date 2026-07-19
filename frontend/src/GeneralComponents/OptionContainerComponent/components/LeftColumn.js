import React from "react";
import { Image, Modal, Rate } from 'antd';
import { HeartFilled, HeartOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from "../../../Context/UserAuthContext";

const LeftColumn = ({loading, data, setData, leftColumnContent, likeThis, scoreAction}) => {

    const [ showRateModal, setShowRateModal ] = React.useState(false)
    const { t } = useTranslation();
    const { user } = useUserAuth();

    const likeThisItem = async () => {

        setData({...data, currenstUserLiked:!data.currenstUserLiked});

        const action = await likeThis();
        
        if (!action) {
            setData({...data, currenstUserLiked:!data.currenstUserLiked});
        }
    }

    return(
        <div className="optionContainerLeftColumn">

            <div className="imgContainer">
                <Image
                    className="img"
                    src={data.image}
                    fallback='/images/nopic.png'
                />
                <div className="imgContainerFooter">
                    <div><StarFilled style={{color:"#f5a623"}}/> <span style={{color:'rgba(0,0,0,0.5)'}}> <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{data.score.toFixed(1)}</span>/10 - {data.scoreCount} {t('kisi')}</span> </div>
                    <div style={{cursor:"pointer"}} onClick={() => {user.token && setShowRateModal(true)}}> <StarOutlined /> {t('oyla')} </div>
                    <div style={{cursor:"pointer"}} onClick={() => {user.token && likeThisItem() }}> { data.currenstUserLiked ?  <HeartFilled style={{color:'green'}} /> : <HeartOutlined style={{color:'green'}} />} </div>
                </div>
            </div>

            {
                leftColumnContent
            }

            <Modal 
                open={showRateModal}
                onCancel={() => {setShowRateModal(false)}}
                footer = {null}
                bodyStyle={{textAlign:'center'}}
            >
                <p style={{marginBottom:20}}> {t('puanla')} </p>
                <Rate 
                    count={10}
                    defaultValue={data.currentUserScore || 0}
                    onChange={ async (score) => {

                        const action = await scoreAction({newScore: score});

                        if (action) { // TODO değişiklik 4
                            if (data.currentUserScore) {
                                setData({...data, currentUserScore:score, score:((data.score*data.scoreCount) - data.currentUserScore + score)/data.scoreCount});
                            }
                            else{
                                setData({...data, score:((data.score*data.scoreCount)+score)/(data.scoreCount+1) , currentUserScore:score, scoreCount:data.scoreCount+1});
                            }
                        }
                        setShowRateModal(false);
                    }}    
                />
            </Modal>
        </div>
    )
}
export default LeftColumn;