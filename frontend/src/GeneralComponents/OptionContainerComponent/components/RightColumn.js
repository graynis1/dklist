import React from "react";
import { useTranslation } from "react-i18next";
import {  Button,  Select,  Tabs } from "antd";
import { SendOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import getBaseSlug from "../../../GeneralFunctions/getBaseSlug";
import CommentComponent from "../../CommentComponent/CommentComponent";
import { useUserAuth } from "../../../Context/UserAuthContext";
import ShareComponent from "../../ShareComponent/ShareComponent";

const RightColumn = ({data, setData, rightColumnBody, rightColumnHeader, addCommentAction, deleteCommentAction, likeCommentAction, editCommentAction, subCommentEditAction, subCommentDeleteAction, addSubCommentAction, multiLanguage}) => {
    
    const { t, i18n } = useTranslation();
    const [ newComment, setNewComment ] = React.useState('');
    const [ loading, setLoading ] = React.useState(false);
    const [ tabCounter, setTabCounter ] = React.useState('1');
    const [ selectedCommentLanguage, setSelectedCommentLanguage] = React.useState('any');
    const { user } = useUserAuth();
    return(
        <div className="optionContainerRightColumn">

            <div className="optionContainerRightColumnHeader">
                {rightColumnHeader} 
                <ShareComponent content={data.name} red={true}/>
            </div>

            <div className="optionContainerRightColumnBody" style={{lineHeight:'25px', color:'rgba(0,0,0,0.7)'}}>
                {rightColumnBody}
            </div>
            
            <Tabs defaultActiveKey={'1'} activeKey={tabCounter} items={[{label:t('yorumlar'), key:'1'}, {label:t('alintilar'), key:'2'} ]} onChange={(key) => {setTabCounter(key)}} />

            {
                multiLanguage &&
                <div style={{width:'100%', height:30, display:'flex', justifyContent:'flex-end', alignItems:'center', marginBottom:0}}>
                    <Select
                        options={[
                            {value:'any', label:t('hepsi')}, 
                            {value:'Türkçe', label:t('Türkçe')}, 
                            {value:'İngilizce', label:t('İngilizce')},
                            {value:'Hintçe', label:t('Hintçe')},
                            {value:'İspanyolca', label:t('İspanyolca')},
                            {value:'Fransızca', label:t('Fransızca')},
                            {value:'Arapça', label:t('Arapça')},
                            {value:'Bengalce', label:t('Bengalce')},
                            {value:'Portekizce', label:t('Portekizce')},
                            {value:'Rusça', label:t('Rusça')},
                            {value:'Almanca', label:t('Almanca')},
                            {value:'Japonca', label:t('Japonca')},
                            {value:'Çince', label:t('Çince')},
                            {value:'İtalyanca', label:t('İtalyanca')},
                            {value:'Korece', label:t('Korece')},
                            {value:'Farsça', label:t('Farsça')},
                            {value:'Lehçe', label:t('Lehçe')},
                            {value:'Yunanca', label:t('Yunanca')},
                            {value:'Bulgarca', label:t('Bulgarca')},
                            {value:'Danca', label:t('Danca')},
                            {value:'Felemenkçe', label:t('Felemenkçe')},
                            {value:'Macarca', label:t('Macarca')},
                            {value:'Çekçe', label:t('Çekçe')},
                        ]}
                        value={selectedCommentLanguage}
                        onChange={(value) => {setSelectedCommentLanguage(value);}}
                        style={{width:100}}
                    />
                </div>
            }

            <div>
                <p style={{color:'rgba(0,0,0,0.8)', fontWeight:600 }}> {tabCounter === '1' ? t('yorum_yap') : t('alinti_yap')} </p>
                <TextArea style={{margin:'10px 0'}} value={newComment} onChange={(e) => {setNewComment(e.currentTarget.value)}}/>
                <Button onClick={ async () => {

                    const action = await addCommentAction({type:tabCounter === '1' ? 'comment' : 'quotation', value:newComment, lang:data.lang ? data.lang : null });
                    if (action.status) {
                        setData({...data, comments:[action.data , ...(data.comments || [])]});
                        setNewComment('');
                    }

                }} loading={loading} type="primary" htmlType="submit" disabled={!user.token}> <SendOutlined /> </Button>
            </div>

            <div className="optionContainerRightColumnCommentContainer">
                {
                    data.comments && data.comments.length > 0 && data.comments.filter(item => tabCounter === '1' ? (item.commentType === 'comment') : (item.commentType !== 'comment') ).filter( item => {
                       
                        if (multiLanguage) {
                            if ( selectedCommentLanguage === 'any' || item.lang === selectedCommentLanguage ){
                                return true
                            }
                            return false
                        }
                        return true
                    } ).map( item => {
                        return(
                            <CommentComponent 
                                key={item.id}
                                id={item.id}
                                children={item.subComments}
                                comment={item.comment}
                                commentDate={item.date}
                                currentUserIsLiked={item.currentUserIsLiked}
                                likeCount={item.likeCount}
                                ownerAvatar={item.user.image}
                                ownerID={item.user.id}
                                ownerUsername={item.user.username}
                                targetLink={getBaseSlug(item.type, t)+item.slug}
                                targetPicture={item.image}
                                targetScore={item.score}
                                targetText={item.name && item.name.length > 12 ? item.name.slice(0,10)+'...' : (item.name || '')}
                                type={item.commentType}
                                subCommentDeleteAction = {subCommentDeleteAction}
                                subCommentEditAction= {subCommentEditAction}
                                data={data}
                                setData={setData}
                                addSubCommentAction={addSubCommentAction}
                                deleteAction={async () => {
                                    const action = await deleteCommentAction({id:item.id});
                                    if (action) {
                                        setData({...data, comments:(data.comments || []).filter( commentItem => commentItem.id !== item.id)})
                                        return true;
                                    }
                                }}
                                editAction={async ({newComment}) => {
                                    const action = await editCommentAction({id:item.id, value:newComment});
                                    if (action) {
                                        setData({...data, comments:(data.comments || []).map( commentItem => {
                                            if (commentItem.id !== item.id) {
                                                return commentItem;
                                            }
                                            return { ...commentItem, comment:newComment }
                                        })})
                                        return true;
                                    }
                                }}
                                likeAction={async () => {
                                    const action = await likeCommentAction({id:item.id});
                                    if (action) {
                                        setData({...data, comments:(data.comments || []).map( commentItem => {
                                            if (commentItem.id !== item.id) {
                                                return commentItem;
                                            }
                                            return { ...commentItem, currentUserIsLiked:!commentItem.currentUserIsLiked, likeCount:commentItem.currentUserIsLiked ? commentItem.likeCount-1 : commentItem.likeCount+1 }
                                        })})
                                        return true;
                                    }
                                }}
                            />
                        )
                    })
                }
            </div>
        </div>
    )
}
export default RightColumn;