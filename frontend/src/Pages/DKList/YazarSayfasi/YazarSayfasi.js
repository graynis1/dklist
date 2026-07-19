import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import { NavLink, useParams } from "react-router-dom";
import OptionContainerComponent from "../../../GeneralComponents/OptionContainerComponent/OptionContainerComponent";
import { Image, Spin } from "antd";
import apiRequest from "../../../services";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { useUserAuth } from "../../../Context/UserAuthContext";

const YazarSayfasi = () => {

    const { i18n, t } = useTranslation();
    const [ loading, setLoading ] = React.useState(true)
    const { slug } = useParams();
    const [ data, setData ] = React.useState({})
    const { user } = useUserAuth();

    const getWriter = async () => {

        setLoading(true);
        const request = await apiRequest({endpoint:'/writer/'+slug, headers:{Authorization:user.token}});
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
            setData(null)
        }
        else{
            const data = request.responseData.response;
            setData( data );
        }
        setLoading(false);
    }

    React.useEffect(() => {
        getWriter();
    }, [slug])

    React.useEffect(() => {
        user.token && data.id && apiRequest({endpoint:'/increament-view/'+data.id+'/writer', headers:{Authorization:user.token}})
    }, [data.id]);

    return(
        <>
            <Helmet>
                <title>{t('YazarSayfasi')}</title>
            </Helmet>
            {
                loading || !data ?
                <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large" /></div>
                :
                <OptionContainerComponent 
                    data={data}
                    setData={setData}
                    loading={loading}
                    rightColumnHeader={data.name}
                    rightColumnBody={
                        <div className="rightColumnYazarBody">
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('tamisim')} : </span><span>{data.name}</span>
                            </div>
                            {
                                data.birthDate &&
                                <div>
                                    <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('dogumtarihi')} : </span><span>{data.birthDate}</span>
                                </div>
                            }
                            {   
                                data.biyo && 
                                <div>
                                    <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('biyografi')} : </span><span>{data.biyo}</span>
                                </div>
                            }
                        </div>
                    }
                    leftColumnContent={
                        <div className="otherBooksContainer">
                            <p style={{width:'100%', textAlign:'center', fontSize:20, color:'rgba(0,0,0,0.6)', fontWeight:600}}>{t('yazarindigerkitaplari')}</p>
                            {
                                data.books && data.books.map( (book, index) => {
                                    return(
                                        <NavLink key={index} to={t('/kitap')+'/'+book.slug} className={"otherBooksItem"}>
                                            <Image
                                                preview={false}
                                                className="bookImg"
                                                src={book.img}
                                                fallback='/images/nopic.png'
                                                width={70}
                                                height={120}
                                            />
                                        </NavLink>
                                    )
                                })
                            }
                        </div>
                    }
                    addCommentAction={async ({value, type, lang}) => {
                        const body = JSON.stringify({
                            targetType:'writer',
                            commentType:type,
                            newComment:value,
                            lang:lang
                        })
                        const request = await apiRequest({endpoint:'/comment/'+data.id, headers:{Authorization:user.token}, method:'POST', body:body});
                        if (request.error || request.responseData.status === false) {
                            return {status:false, data:null};
                        }
                        return {status:true, data:request.responseData.response};
                    }}
                    deleteCommentAction={ async ({id}) => {
                        const request = await apiRequest({endpoint:'/comment/'+id, headers:{Authorization:user.token}, method:'DELETE'});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    likeCommentAction={async ({id}) => {
                        const request = await apiRequest({endpoint:'/comment/'+id, headers:{Authorization:user.token}});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    editCommentAction={ async ({id, value}) => {

                        const request = await apiRequest({endpoint:'/comment/'+id, headers:{Authorization:user.token}, body:JSON.stringify({newComment:value}), method:'PUT'});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    subCommentDeleteAction = { async ({id, parentID, mainParentID}) => {

                        const request = await apiRequest({endpoint:'/sub-comment/'+id, headers:{Authorization:user.token}, method:'DELETE'});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        
                        if (parentID) {
                            setData({...data, comments:data.comments.map( comment => {
                                if ( comment.id !== mainParentID ) {
                                    return comment;
                                }
                                return {...comment, subComments:comment.subComments.map( subComment => {
                                    if (subComment.id !== parentID) {
                                        return subComment;
                                    }
                                    return { ...subComment, subComments:subComment.subComments.filter(nestedComment => nestedComment.id !== id) }
                                })}
                            })})
                        }
                        else{
                            setData({...data, comments:data.comments.map( comment => {
                                if ( comment.id !== mainParentID ) {
                                    return comment;
                                }
                                return {...comment, subComments:comment.subComments.filter( subComment => subComment.id !== id )}
                            })})
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
                    addSubCommentAction={ async ({newComment, parentID, parentType, mainParentID}) => {
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
                            setData({...data, comments: data.comments.map( comment => {
                                if (comment.id !== parentID) {
                                    return comment;
                                }
                                return { ...comment, subComments:[...comment.subComments, request.responseData.response]}
                            })})
                        }
                        else{
                            setData({...data, comments: data.comments.map( comment => {
                                if (comment.id !== mainParentID) {
                                    return comment;
                                }
                                return { ...comment, subComments:comment.subComments.map( subComment=> {
                                    if (subComment.id !== parentID) {
                                        return subComment;
                                    }
                                    return { ...subComment, subComments:[ ...subComment.subComments, request.responseData.response] }
                                } )}
                            })})
                        }
                        return true;
                    }}
                    likeThis={async () => {
                        const request = await apiRequest({endpoint:'/like-writer/'+data.id, headers:{Authorization:user.token}});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    scoreAction={async ({newScore}) => {

                        const request = await apiRequest({endpoint:'/score/' + data.id, headers:{Authorization:user.token}, method:'PUT', body:JSON.stringify({score:newScore, type:'writer'})});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                />
            }
        </>
    )
}
export default YazarSayfasi;