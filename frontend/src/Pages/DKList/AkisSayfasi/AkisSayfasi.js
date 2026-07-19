import React from "react";
import { Button, Spin } from "antd";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import CommentComponent from "../../../GeneralComponents/CommentComponent/CommentComponent";
import getBaseSlug from "../../../GeneralFunctions/getBaseSlug";
import apiRequest from "../../../services";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useParams } from "react-router-dom";


const AkisSayfasi = () => {

    const [ loading, setLoading ] = React.useState(false);
    const { t } = useTranslation(); 
    const [data, setData] = React.useState([]);
    const [more, setMore] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const { user } = useUserAuth();
    const { commentID } = useParams();

    const getComments = async () => {

        setLoading(true);

        const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/comments/'+page+'?commentID='+commentID});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            setMore(false)
        }
        else{
            const responseData = request.responseData.response;
            setData([...data, ...responseData.comments]);
            setMore(responseData.more)
        }
        setLoading(false);
    } 

    React.useEffect(() => {
        getComments();
    }, [page]);

    return(

        <div style={{display:'flex', flexDirection:'column'}} >

            <Helmet>
                <title>{t('AkisSayfasi')}</title>
            </Helmet>

            {
                data.length > 0 && data.map( (item, index) => {
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
                            targetText={item.name.length > 12 ? item.name.slice(0,10)+'...' : item.name}
                            type={item.commentType}
                            data={data}
                            setData={setData}
                            subCommentDeleteAction = { async ({id, parentID, mainParentID}) => {

                                const request = await apiRequest({endpoint:'/sub-comment/'+id, headers:{Authorization:user.token}, method:'DELETE'});
                                if (request.error || request.responseData.status === false) {
                                    return false;
                                }
                                
                                if (parentID) {
                                    setData(data.map( comment => {
                                        if ( comment.id !== mainParentID ) {
                                            return comment;
                                        }
                                        return {...comment, subComments:comment.subComments.map( subComment => {
                                            if (subComment.id !== parentID) {
                                                return subComment;
                                            }
                                            return { ...subComment, subComments:subComment.subComments.filter(nestedComment => nestedComment.id !== id) }
                                        })}
                                    }))
                                }
                                else{
                                    setData(data.map( comment => {
                                        if ( comment.id !== mainParentID ) {
                                            return comment;
                                        }
                                        return {...comment, subComments:comment.subComments.filter( subComment => subComment.id !== id )}
                                    }))
                                }
        
                                return true;
                            }}
                            subCommentEditAction= { async ({newComment, id}) => {
                                const request = await apiRequest({endpoint:'/sub-comment/'+id, headers:{Authorization:user.token}, body:JSON.stringify({newComment:newComment}), method:'PUT'});
                                if (request.error || request.responseData.status === false) {
                                    return false;
                                }
                                return true;
                            }}
                            addSubCommentAction={ async ({newComment, parentID, parentType, mainParentID}) => { // OK
                                const body = JSON.stringify({
                                    newComment:newComment,
                                    parentType:parentType,
                                    parentID:parentID
                                })
                                const request = await apiRequest({endpoint:'/sub-comment', headers:{Authorization:user.token}, method:'POST', body:body});
                                if (request.error || request.responseData.status === false) {
        
                                    return false;
                                }
                                if ( parentType === 'comment' ){
                                    setData(data.map( comment => {
                                        if (comment.id !== parentID) {
                                            return comment;
                                        }
                                        return { ...comment, subComments:[...comment.subComments, request.responseData.response]}
                                    }))
                                }
                                else{
                                    setData(data.map( comment => {
                                        if (comment.id !== mainParentID) {
                                            return comment;
                                        }
                                        return { ...comment, subComments:comment.subComments.map( subComment=> {
                                            if (subComment.id !== parentID) {
                                                return subComment;
                                            }
                                            return { ...subComment, subComments:[ ...subComment.subComments, request.responseData.response] }
                                        } )}
                                    }))
                                }
                                return true;
                            }}
                            deleteAction={async ({id}) => { // OK
                                const request = await apiRequest({endpoint:'/comment/'+id, headers:{Authorization:user.token}, method:'DELETE'});
                                if (request.error || request.responseData.status === false) {
                                    return false;
                                }
                                setData(data.filter( commentItem => commentItem.id !== item.id))
                                return true;
                            }}
                            editAction={async ({newComment, commentID}) => { // OK

                                const request = await apiRequest({endpoint:'/comment/'+commentID, headers:{Authorization:user.token}, body:JSON.stringify({newComment:newComment}), method:'PUT'});
                                if (request.error || request.responseData.status === false) {
                                    return false;
                                }
                                setData(data.map( commentItem => {
                                    if (commentItem.id !== item.id) {
                                        return commentItem;
                                    }
                                    return { ...commentItem, comment:newComment }
                                }))
                                return true;
                            }}
                            likeAction={async ({commentID}) => { // OK

                                const request = await apiRequest({endpoint:'/comment/'+commentID, headers:{Authorization:user.token}});
                                if (request.error || request.responseData.status === false) {
                                    return false;
                                }
                                setData(data.map( commentItem => {
                                    if (commentItem.id !== commentID) {
                                        return commentItem;
                                    }
                                    return { ...commentItem, currentUserIsLiked:!commentItem.currentUserIsLiked, likeCount:commentItem.currentUserIsLiked ? commentItem.likeCount-1 : commentItem.likeCount+1 }
                                }))
                                return true;
                            }}
                        />
                    );
                })
            }

            {
                more && <Button style={{width:200, margin:'20px auto'}} onClick={() => {setPage(page+1)}}>{t('daha_fazla_gonderi')}</Button>
            }

            {
                data.length < 1 && <div style={{width:'90%', padding:20, backgroundColor:'white'}}> {t('henuzgonderiyapilmamis')} </div>
            }

            {
                loading && <div style={{width:'100%', height:50, display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large"/></div>
            }
        </div>
    )
}
export default AkisSayfasi;