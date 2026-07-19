import React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import './style.css';
import { NavLink, useParams } from "react-router-dom";
import OptionContainerComponent from "../../../GeneralComponents/OptionContainerComponent/OptionContainerComponent";
import { Avatar, Image, Popover, Radio, Spin, Tooltip } from "antd";
import { useProfile } from "../../../Context/UserProfileContext";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useScreenSize } from "../../../Context/ResponsiveContext";
import apiRequest from "../../../services";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import { PlusOutlined } from "@ant-design/icons";

const KitapSayfasi = () => {

    const { i18n, t } = useTranslation();
    const [ loading, setLoading ] = React.useState(true)
    const { profileData, setProfileData } = useProfile();
    const { slug } = useParams();
    const { user } = useUserAuth();
    const { screenSize } = useScreenSize();
    const [ data, setData ] = React.useState([]);

    const getBook = React.useCallback( async () => {
        setLoading(true);
        
        const request = await apiRequest({endpoint:'/book/'+slug, headers:{Authorization:user.token}});
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

    }, [slug, user.token, ]);

    React.useEffect(() => {
        getBook();
    }, [slug]);

    React.useEffect(() => {
        user.token && data.id && apiRequest({endpoint:'/increament-view/'+data.id+'/book', headers:{Authorization:user.token}})
    }, [data.id]);

    return(
        <>
            <Helmet>
                <title>{t('KitapSayfasi')}</title>
            </Helmet>

            {
                loading || !data ?
                <div style={{width:'100%', height:300, display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <Spin size="large"/>
                </div>
                :
                <OptionContainerComponent 
                    data={data}
                    setData={setData}
                    loading={loading}
                    multiLanguage={true}
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
                    addCommentAction={async ({value, type, lang}) => {

                        const body = JSON.stringify({
                            targetType:'book',
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
                    editCommentAction={ async ({id, value}) => {

                        const request = await apiRequest({endpoint:'/comment/'+id, headers:{Authorization:user.token}, body:JSON.stringify({newComment:value}), method:'PUT'});
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
                    likeThis={async () => {
                        const request = await apiRequest({endpoint:'/like-book/'+data.id, headers:{Authorization:user.token}});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    scoreAction={async ({newScore}) => {

                        const request = await apiRequest({endpoint:'/score/' + data.id, headers:{Authorization:user.token}, method:'PUT', body:JSON.stringify({score:newScore, type:'book'})});
                        if (request.error || request.responseData.status === false) {
                            return false;
                        }
                        return true;
                    }}
                    leftColumnContent= {
                        <>
                            <div style={{textAlign:'center'}}> 
                                <Radio.Group
                                    disabled={ !user.token }
                                    options={[{label:t('Okuyorum'), value:'currentRead'}, {label:t('Okuyacagim'), value:'targetRead',}, {label:t('Okudum'), value:'finishRead'}]}
                                    value={data.userReadStatus}
                                    optionType="button"
                                    buttonStyle="outline"
                                    size={screenSize > 400 ? 'middle' : 'small'}
                                    onChange={ async ({ target: { value } }) => { 
                                        const beforeValue = data.userReadStatus;
                                        setData({...data, userReadStatus:value});
                                        const request = await apiRequest({endpoint:'/set-book-read-status/'+data.id, headers:{Authorization:user.token}, method:'PUT', body:JSON.stringify({status:value})});
                                        if ( request.error || !request.responseData || !request.responseData.status ) {
                                            setData({...data, userReadStatus:beforeValue});
                                        }
                                    }}
                                />
                            </div>
                            {
                                data.readersOfThisBook && data.readersOfThisBook.length > 0 &&
                                <div className="otherReadersContainer">
                                    <p style={{width:'100%', textAlign:'center', fontSize:20, color:'rgba(0,0,0,0.6)', fontWeight:600, marginBottom:15}}>{t('buKitabiOkuyanDigerInsanlar')}</p>
                                    {
                                        data.readersOfThisBook.map( (reader, index) => {
                                            return(
                                                <Tooltip key={index}  title={reader.username} placement="bottom">
                                                    <Avatar onClick={() => { setProfileData({...profileData, userID:reader.id, show:true, currentUserToken:user.token}) }} style={{border:'1px solid rgba(0,0,0,0.1)', marginRight:5, marginTop:10, cursor:'pointer'}} src={reader.img || '/images/nopic2.png'} size={50}/>
                                                </Tooltip>
                                            );
                                        })
                                    }
                                </div>
                            }
                            {
                                data.otherBooks && data.otherBooks.length > 0 &&
                                <div className="otherBooksContainer">
                                    <p style={{width:'100%', textAlign:'center', fontSize:20, color:'rgba(0,0,0,0.6)', fontWeight:600}}>{t('Diğer Baskılar')}</p>
                                    {
                                        data.otherBooks.map( otherBook => {
                                            return(
                                                <NavLink key={otherBook.id} to={t('/kitap')+'/'+otherBook.slug} className={"otherBookItem"}>
                                                    <Image
                                                        preview={false}
                                                        className="bookImg"
                                                        src={otherBook.img}
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
                        </>
                    }
                    rightColumnBody={
                        <>
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('yazarlar')}:{
                                    data.writers && data.writers.map( (writer) => {
                                        return(
                                            <NavLink 
                                                className={'urlRouter'} 
                                                key={writer.id} 
                                                to={t('/yazar')+'/'+writer.slug}
                                            >
                                                {writer.name}
                                            </NavLink>
                                        )
                                    })
                                }</span>
                            </div>
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('yayinevi')}: <NavLink className={'urlRouter'} to={t('/yayinevi') + '/' + data.publisher.slug } state={{publisherID:data.publisher.id, name:data.publisher.name}} >{data.publisher.name}</NavLink></span>
                            </div>
                            {
                                data.translators.length > 0 
                                &&
                                <div>
                                    <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('çevirmenler')}:{
                                        data.translators.map( (translator, index) => {
                                            return(
                                                <NavLink 
                                                    className={'urlRouter'} 
                                                    key={translator.id} 
                                                    to={t('/cevirmen')+'/'+translator.slug}
                                                >
                                                    {translator.name}
                                                </NavLink>
                                            )
                                        })
                                    }</span>
                                </div>
                            }
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('kategoriler')}:{
                                    data.categories.map( (category, index) => {
                                        return(
                                            <NavLink 
                                                className={'urlRouter'} 
                                                key={category.id} 
                                                to={t('/kitaplar')+'/'+ (i18n.language === 'tr' ? category.slug : category.slugEN) }
                                                state={{categoryID:category.id, name:i18n.language === 'tr' ? category.name : category.nameUS}}
                                            >
                                                {i18n.language === 'tr' ? category.name : category.nameUS}
                                            </NavLink>
                                        );
                                    })
                                }</span>
                            </div>
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}> {t('sayfasayisi')}: </span>{data.page}
                            </div>
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}> {t('kitapdili')}: </span>{t(data.lang)}
                            </div>
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}> {t('basimtarihi')}: </span>{data.date}
                            </div>
                            {
                                data.isbn &&
                                <div>
                                    <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}> ISBN No:</span> {data.isbn}
                                </div>
                            }
                            {
                                data.format &&
                                <div>
                                    <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}>{t('format')}: </span>{data.format}
                                </div>
                            }
                            <div>
                                <span style={{color:'rgba(0,0,0,0.8)', fontWeight:600}}> {t('kitapaciklamasi')}: </span><span style={{lineHeight:'35px'}}>{data.content}</span>
                            </div>
                        </>
                    }
                    rightColumnHeader={ 
                        <span> 
                            {data.name} 
                            {
                                user.token &&
                                <Tooltip
                                    title={t('kutuphaneye_ekle')}
                                    style={{padding:0}}
                                    placement="bottom"
                                >
                                    <span style={{cursor:'pointer', margin:'0 10px', color:'red'}} onClick={ async () => { 

                                        const request = await apiRequest({endpoint:'/book-switch-for-profile/'+data.id, headers:{Authorization:user.token}});
                                        if (request.error || request.responseData.status === false) {
                                            throwNotification({
                                                message:t('bir_hata_olustu'),
                                                type:'error',
                                                duration:4
                                            });
                                        }
                                        else{
                                            throwNotification({
                                                message:t('kitap_kutuphaneye_eklendi'),
                                                type:'success',
                                                duration:4
                                            });
                                        }
                                     }}>

                                        <PlusOutlined className={'add_library_icon'} />
                                        <span>{t('kutuphaneye_ekle')}</span>

                                    </span>
                                </Tooltip>
                            }
                             
                        </span>
                    }
                />
            }
        </>
    )
}
export default KitapSayfasi;