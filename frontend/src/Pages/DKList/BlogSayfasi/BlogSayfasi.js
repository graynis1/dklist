import React from 'react'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import { useUserAuth } from '../../../Context/UserAuthContext';
import { FloatButton, Spin } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import apiRequest from '../../../services';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import { useParams } from 'react-router-dom';
import './style.css';
import EditBlogModal from './BlogEditModal';
import ShareComponent from '../../../GeneralComponents/ShareComponent/ShareComponent';
import { useProfile } from '../../../Context/UserProfileContext';

const HTMLViewer = ({textHtml}) => {
    const ref = React.useRef();
    React.useLayoutEffect(() =>{ ref.current.innerHTML = textHtml; });
    return <div className='blogContainerBodyContent' ref={ref}></div>
}

const BlogSayfasi = () => {

    const { t } = useTranslation();
    const { user } = useUserAuth();
    const [loading, setLoading] = React.useState(false);
    const { slug } = useParams();
    const [data, setData] = React.useState({});
    const [show, setShow] = React.useState(false);
    const {profileData, setProfileData} = useProfile();

    const getBook = React.useCallback( async () => {
        
        setLoading(true);
        
        const request = await apiRequest({endpoint:'/blog/'+slug, headers:{Authorization:user.token}});
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('Bir hata oluştu'),
                duration:3
            });
            console.error('Alinan hata : ', request.errorMessage);
            setData(null)
        }
        else{
            const data = request.responseData.response;
            setData( data );
        }

        setLoading(false);

    }, [slug, user.token]);

    React.useEffect(() => {
        getBook();
    }, [slug]);

    React.useEffect(() => {
        user.token && data.id && apiRequest({endpoint:'/increament-view/'+data.id+'/blog', headers:{Authorization:user.token}})
    }, [data.id]);

    return(
        <>
            <Helmet>
                <title>{t('BlogSayfasi')}</title>
            </Helmet>

            {
                loading 
                ? 
                <div style={{width:'100%', height:300, display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <Spin size='large' />
                </div>
                :
                <div className='blogContainer'>

                    <div className='blogContainerBody'>

                        <div className='blogContainerBodyHeader'>
                            <div className='blogContainerBodyHeaderText' style={{display:'flex', alignItems:'center'}}> 
                                <span style={{marginRight:5}}>DKList | {data.createdData} |</span>
                                { 
                                    data.user 
                                    && 
                                    <div className="subCommentContainerHeaderLeft"  onClick={() => { setProfileData({...profileData, show:true, userID:data.user.id, currentUserToken:user.token}) }}>
                                        <img src={ data.user.image || '/images/nopic2.png' } alt="DK - List Comment Avatar" className="commentAvatar" style={{width:20, height:20}}/>
                                        <div className="subCommentOwnerUsername" style={{fontSize:14}}>{data.user.username }</div>
                                    </div>
                                }
                            </div>
                            <ShareComponent content={data.preview && data.preview.slice(0, 100)} /> 
                        </div>

                        <div className='blogContainerBodyTitle'> {data.title} </div>

                        <HTMLViewer textHtml={data.content}/>

                    </div>

                    <div className='blogContainerPictureSide'>
                        <img src={data.img} alt='Blog Picture'/>
                    </div>

                </div>
            }

            {
                data.user && ( (Number(user.id) === data.user.id || user.userType === 'SuperAdmin') && <FloatButton onClick={() => {setShow(true)}} style={{right:75, width:60, height:60}} icon = {<EditOutlined/>}/>)
            }

            { show && <EditBlogModal data={data} setData={setData} show={show} setShow={setShow} /> }
        </>
    )
}
export default BlogSayfasi