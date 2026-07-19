import React from "react";
import './style.css';
import { CommentOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, LikeOutlined, PlusOutlined, StarOutlined } from "@ant-design/icons";
import { Button } from "antd";
import SubCommentComponent from "./SubCommentComponent";
import { useProfile } from "../../Context/UserProfileContext";
import { useNavigate } from "react-router-dom";
import TextArea from "antd/es/input/TextArea";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "../../Context/UserAuthContext";
import throwNotification from "../../GeneralFunctions/throwNotification";
import apiRequest from "../../services";
import ShareComponent from "../ShareComponent/ShareComponent";

const CommentComponent = ( { 
    ownerUsername, commentDate, ownerAvatar, ownerID, comment, id, likeCount, currentUserIsLiked, data, setData,
    targetPicture, targetText, targetLink, targetScore, editAction, deleteAction, type = 'comment',
    children = null, likeAction = null,  addSubCommentAction, subCommentEditAction = null, subCommentDeleteAction = null
} ) => {

    const { profileData, setProfileData } = useProfile();
    const [ editMode, setEditMode ] = React.useState(false);
    const [ showAddComment, setShowAddComment ] = React.useState(false);
    const [ commentState, setCommentState ] = React.useState({show:comment, beforeShow:null});
    const { t } = useTranslation();
    const { user } = useUserAuth();
    const [ newComment, setNewComment ] = React.useState('');
    const [ showCount, setShowCount ] = React.useState(0);
    const [ showNotice, setShowNotice ] = React.useState(user.token ? true : false);
    const navigate = useNavigate();
    const [ showFullComment, setShowFullComment ] = React.useState(false);

    const notice = async () => {

        await apiRequest({endpoint:'/notice', body:JSON.stringify({commentID:id, type:'comment'}), headers:{Authorization:user.token}, method:'POST'});
        
        throwNotification({
            description:t('bildiri_gonderildi'),
            duration:2,
        })
        setShowNotice(false);
    }
    
    const actions = {
        profileClick : () => { setProfileData({...profileData, userID:ownerID, show:true, currentUserToken:user.token}); },
        like : async () => { 
            if (!user.token) {
                throwNotification({
                    description:t('begenmek_icin_uye_olun'),
                    duration:3,
                    type:'info'
                })
                return;
            }
            await likeAction({commentID:id}); 
        },
        delete : async () => { await deleteAction({id:id}); },
        edit : async () => {
            if (!commentState.show.trim()) {
                setCommentState({show:commentState.beforeShow, beforeShow:null});
            }
            else{
                const result = await editAction({newComment:commentState.show, commentID:id});
    
                if (!result) {
                    setCommentState({show:commentState.beforeShow, beforeShow:null});
                }
            }
            setEditMode(false);
        },
        addSubComment : async () => {
            const result = await addSubCommentAction({newComment:newComment, parentID:id, parentType:'comment', mainParentID:null});
            if (result) {
                setNewComment('');
            }
            setShowAddComment(false);
        },
    }

    return(
        <div className="commentContainer">
            <div className="commentContentContainer">
                <div className="commentLeftContainer">
                    <div className="commentLeftContainerHeader">
                        <img src={ownerAvatar || '/images/nopic2.png'} alt="DK - List Comment Avatar" className="commentAvatar" onClick={actions.profileClick}/>
                        <div className="commentOwnerContainer" onClick={actions.profileClick}>
                            <div className="commentOwnerUsername">{ownerUsername}</div>
                            <div className="commentDate">{commentDate}</div>
                        </div>
                    </div>

                    <div className="commentLeftContainerFooter">
                        <span style={{overflowWrap:'anywhere'}}>
                            { 
                                editMode ?
                                <div>
                                    <TextArea maxLength={3000} showCount={true} style={{maxWidth:'95%'}} value={commentState.show} onChange={(e) => { setCommentState({show:e.currentTarget.value, beforeShow:commentState.show}); }}/>
                                    <Button style={{marginTop:10, color:'green', borderColor:'green'}} onClick={actions.edit} > {t('gonder')} </Button>
                                </div>
                                :
                                type === 'comment' 
                                    ?
                                    <div>
                                        {
                                            commentState.show.slice(0, showFullComment ? commentState.show.length : 200)
                                        }
                                        {
                                            (!showFullComment && commentState.show.length > 200 ) && <div className="comment_more" onClick={()=>{setShowFullComment(true);}} ><PlusOutlined/> {t('devamini_gor')}</div> 
                                        }
                                    </div>
                                    :
                                    <span className="quotation">
                                        {
                                            commentState.show.slice(0, showFullComment ? commentState.show.length : 200)
                                        }
                                        {
                                            (!showFullComment && commentState.show.length > 200 ) && <div className="comment_more" onClick={()=>{setShowFullComment(true);}} ><PlusOutlined/> {t('devamini_gor')}</div> 
                                        }
                                    </span>
                            }
                        </span>
                    </div>

                    <div className="commentLeftContainerBody">
                        <div className="commentLeftContainerBodyIcon" onClick={actions.like} style={{color:currentUserIsLiked ? 'green' : 'black'}}> <LikeOutlined /> <span style={{fontSize:12}}>{likeCount}</span> </div>
                        { parseInt(user.id) === parseInt(ownerID) &&  <DeleteOutlined className="commentLeftContainerBodyIcon icon-delete" onClick={actions.delete} /> }
                        { parseInt(user.id) === parseInt(ownerID) &&  <EditOutlined className="commentLeftContainerBodyIcon" onClick={()=>{setEditMode(true);}}/> }
                        { user.token && type === 'comment' && <span className="commentLeftContainerBodyIcon" onClick={()=>{setShowAddComment(true);}}><CommentOutlined style={{marginRight:0}}/> <span>{children.length || 0}</span></span> }
                        { parseInt(user.id) !== parseInt(ownerID) && showNotice && <ExclamationCircleOutlined className="commentLeftContainerBodyIcon" style={{color:'red'}} onClick={notice}/> }
                        <ShareComponent url={window.location.protocol + "//" + window.location.host + t('/akis') + '/'+id } content={commentState.show.length > 200 ? commentState.show.slice(0, 200)+'...' : commentState.show} />
                    </div>
                    
                </div>
                <div className="commentRightContainer">
                    <div className="commentImageContainer" onClick={() => { navigate(targetLink) }} style={{cursor: 'pointer'}}>
                        <img src={targetPicture || '/images/nopic.png'} alt="DK - List Comment" className="commentImage" />
                        <div className="commentImageScoreContainer">
                            <div className="commentImageShadowBox">
                                <StarOutlined style={{marginRight:5}}/> {targetScore.toFixed(1)}
                            </div>
                        </div>
                    </div>
                    <div className="commentItemText" onClick={() => { navigate(targetLink) }} style={{cursor: 'pointer'}}>
                        {targetText}
                    </div>
                    <div style={{fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 5}}>
                        {t('kaynak')}: {targetLink.includes('/kitap/') ? t('kitap') : 
                         targetLink.includes('/yazar/') ? t('yazar') : 
                         targetLink.includes('/cevirmen/') ? t('cevirmen') : 
                         targetLink.includes('/blog/') ? t('blog') : 
                         targetLink.includes('/yayin-ev/') ? t('yayinevi') : t('diger')}
                    </div>
                </div>
            </div>
            <div className="subCommentsContainer">

                {
                    showAddComment &&
                    <>
                        <TextArea style={{ width:'96%', marginLeft:'4%', marginTop:10}} onChange={e=>{setNewComment(e.currentTarget.value)}} value={newComment} maxLength={3000} showCount/>
                        <div>
                            <Button className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'green', color:'green'}} onClick={actions.addSubComment}>{t('gonder')}</Button>
                            <Button className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'red', color:'red'}} onClick={()=>{setShowAddComment(false);setNewComment('')}}>{t('iptal')}</Button>
                        </div>
                    </>
                }

                {
                    type === 'comment' && children && children.length > 0 && (showCount!==0) && children.slice(0, showCount+1).map((item) => {
                        return(
                            <SubCommentComponent 
                                key={item.id}
                                subCommentID={item.id}
                                subCommentParentID={null}
                                mainParentID={id}
                                ownerUserAvatar={item.user.image}
                                ownerUsername={item.user.username}
                                ownerUserID={item.user.id}
                                subComment={item.comment}
                                nestedComments={item.subComments}
                                subCommentEditAction={subCommentEditAction}
                                subCommentDeleteAction={subCommentDeleteAction}
                                data={data}
                                setData={setData}
                                addSubCommentAction={addSubCommentAction}
                            />
                        )
                    })
                }

                {
                    type === 'comment' && children.length>0 && showCount!==children.length &&
                    <div className="moreCommentContainer">
                        <Button onClick={()=>{setShowCount(children.length)}} style={{marginTop:10, border:'none'}}>+ {t('daha_fazla')}</Button>
                    </div>
                }

            </div>
        </div>
    )
}
export default CommentComponent;