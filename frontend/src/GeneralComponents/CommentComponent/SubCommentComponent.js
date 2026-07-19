import { Button, Popover } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../Context/UserProfileContext";
import TextArea from "antd/es/input/TextArea";
import { CommentOutlined, DeleteOutlined, EditOutlined, ExclamationCircleOutlined, MoreOutlined } from "@ant-design/icons";
import { useUserAuth } from "../../Context/UserAuthContext";
import throwNotification from "../../GeneralFunctions/throwNotification";
import apiRequest from "../../services";




const SubCommentComponent = ({ownerUsername, ownerUserID, ownerUserAvatar, mainParentID, subComment, subCommentID, subCommentParentID, nestedComments, subCommentEditAction, addSubCommentAction, subCommentDeleteAction, isParent = true}) => {

    const { t } = useTranslation();
    const { profileData, setProfileData } = useProfile();
    const [ editMode, setEditMode ] = React.useState(false);
    const [ showAddComment, setShowAddComment ] = React.useState(false);
    const [ newComment, setNewComment ] = React.useState('');
    const { user } = useUserAuth();
    const [ commentState, setCommentState ] = React.useState({show:subComment, beforeShow:null});
    const [ showCount, setShowCount ] = React.useState(0);
    const [ showNotice, setShowNotice ] = React.useState(user.token ? true : false);

    const notice = async () => {
        await apiRequest({endpoint:'/notice', body:JSON.stringify({commentID:subCommentID, type:'subComment'}), headers:{Authorization:user.token}});
        throwNotification({
            description:t('bildiri_gonderildi'),
            duration:2,
        })
        setShowNotice(false);
    }

    const actions = {
        delete: async () => { await subCommentDeleteAction({id:subCommentID, parentID:subCommentParentID, mainParentID:mainParentID}) },
        edit : async () => {
            if (!commentState.show.trim()) {
                setCommentState({show:commentState.beforeShow, beforeShow:null});
            }
            else{
                const result = await subCommentEditAction({newComment:commentState.show, id:subCommentID});
    
                if (!result) {
                    setCommentState({show:commentState.beforeShow, beforeShow:null});
                }
            }
            setEditMode(false);
        },
        addComment : async () => {
            const result = await addSubCommentAction({newComment:newComment, parentID:isParent ? subCommentID : subCommentParentID, parentType:'subComment', mainParentID:mainParentID}); 
            if (result.status) {
                setNewComment('');
            }
            setShowAddComment(false);
        },

    }

    return(
            <div className="subCommentContainer">
                <div className="subCommentContentContainer">
                    <div className="subCommentContainerHeader">
                        <div className="subCommentContainerHeaderLeft" onClick={() => { setProfileData({...profileData, show:true, userID:ownerUserID, currentUserToken:user.token}) }}>
                            <img src={ownerUserAvatar || '/images/nopic2.png' } alt="DK - List Comment Avatar" className="commentAvatar" />
                            <div className="subCommentOwnerUsername">{ownerUsername}</div>
                        </div>
                        <div className="subCommentContainerHeaderRight">
                            <Popover
                                content={
                                    <div>
                                        { parseInt(user.id) === ownerUserID &&  <DeleteOutlined className="commentLeftContainerBodyIcon icon-delete" onClick={actions.delete} /> }
                                        { parseInt(user.id) === ownerUserID &&  <EditOutlined className="commentLeftContainerBodyIcon" onClick={()=>{setEditMode(true);}}/> }
                                        <CommentOutlined className="commentLeftContainerBodyIcon" onClick={()=>{ user.token && setShowAddComment(true);}} />
                                        { parseInt(user.id) !== ownerUserID && showNotice && <ExclamationCircleOutlined className="commentLeftContainerBodyIcon" style={{color:'red'}} onClick={notice}/> }
                                    </div>
                                }
                            >
                                <MoreOutlined style={{cursor:'pointer'}}/>
                            </Popover>                        
                        </div>
                    </div>
                    <div className="subCommentContainerBody">
                        {
                            editMode
                            ?
                            <>
                                <TextArea style={{width:'95%'}} value={commentState.show} onChange={e => { setCommentState({show:e.currentTarget.value, beforeShow:commentState.show}); }} maxLength={3000} showCount/>
                                <Button className="buttonHover" style={{borderColor:'green', color:'green', marginTop:10}} onClick={actions.edit}>{t('kaydet')}</Button>
                            </>
                            :
                            commentState.show
                        }
                    </div>
                </div>
                {
                    showAddComment && isParent && 
                    <>
                        <TextArea style={{ width:'96%', marginLeft:'4%', marginTop:10}} onChange={e => {setNewComment(e.currentTarget.value)}}/>
                        <div>
                            <Button onClick={actions.addComment} className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'green', color:'green'}} >{t('gonder')}</Button>
                            <Button onClick={()=>{setShowAddComment(false);setNewComment('')}} className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'red', color:'red'}} >{t('iptal')}</Button>
                        </div>
                    </>
                }
                {
                    isParent && nestedComments && nestedComments.length > 0 && (showCount!==0) && nestedComments.slice(0, showCount+1).map( (item) => {
                        return(
                            <SubCommentComponent
                                key={item.id}
                                subCommentID={item.id}
                                subCommentParentID={subCommentID}
                                nestedComments={null}
                                mainParentID={mainParentID}
                                ownerUserAvatar={item.user.image}
                                ownerUserID={item.user.id}
                                ownerUsername={item.user.username}
                                subComment={item.comment}
                                isParent={false}
                                subCommentEditAction={subCommentEditAction}
                                subCommentDeleteAction={subCommentDeleteAction}
                                addSubCommentAction ={addSubCommentAction}
                            />
                        )
                    })
                }
                {
                    showAddComment && !isParent && 
                    <>
                        <TextArea style={{ width:'96%', marginLeft:'4%', marginTop:10}} onChange={e => {setNewComment(e.currentTarget.value)}}/>
                        <div>
                            <Button onClick={actions.addComment} className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'green', color:'green'}} >{t('gonder')}</Button>
                            <Button onClick={()=>{setShowAddComment(false);setNewComment('')}} className="buttonHover" style={{width:100, marginLeft:'4%', marginTop:10, borderColor:'red', color:'red'}} >{t('iptal')}</Button>
                        </div>
                    </>
                }

                {
                    isParent && nestedComments && nestedComments.length>0 && showCount!==nestedComments.length &&
                    <div className="moreCommentContainer">

                        <Button onClick={()=>{setShowCount(nestedComments.length)}} style={{border:'none', marginTop:10}}>+ {t('daha_fazla')}</Button>
                    </div>
                }
            </div>
    )
}

export default SubCommentComponent;