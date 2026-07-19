import { PlusOutlined } from '@ant-design/icons';
import { FloatButton, Input, Pagination, Spin } from 'antd';
import React, { useRef } from 'react'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import { useUserAuth } from '../../../Context/UserAuthContext';
import './style.css';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';
import AddBlogModal from './AddBlogModal';
import apiRequest from '../../../services';
import throwNotification from '../../../GeneralFunctions/throwNotification';
import { useProfile } from '../../../Context/UserProfileContext';

const BloglarSayfasi = () => {

    const { profileData, setProfileData } = useProfile();
    const { i18n, t } = useTranslation(); 
    const [ query, setQuery ] = React.useState({
        pagePerSize:10,
        page:1,
        sortBy:'id',
        orderBy:'DESC',
        search:'',
    });
    const navigate = useNavigate();
    const initialMeta = { page:1, firstPage:1, lastPage:1, pagePerSize:10, filteredCount:0, orderBy:'ASC', sortBy:'id', viewCount:0 };
    const [loading, setLoading] = React.useState(false);
    const [show, setShow] = React.useState(false);
    const { user } = useUserAuth();
    const [ data, setData ] = React.useState({ blogs:[], meta:initialMeta });

    const getAllBlogs = React.useCallback( async () => {

        setLoading(true);
        let params = '?search='+query.search+'&pagePerSize='+query.pagePerSize+'&page='+query.page+'&orderBy='+query.orderBy+'&sortBy='+query.sortBy;
       
        const request = await apiRequest({endpoint:'/blog'+params});
        
        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            const meta = request.responseData.response.meta;
            const data = request.responseData.response.data;
            setData( { blogs:data, meta:meta } );
        }

        setLoading(false);

    }, [query]);

    React.useEffect(() => {
        getAllBlogs();
    }, [query, getAllBlogs])

    const debouncedHandleChange = React.useMemo(() => {
        return debounce((value) => {
            setQuery( { ...query, search: value, page:1 } );
        }, 700);
    }, [setQuery, query]);

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    const navigateBlog = (slug) => { navigate(t('/blog')+'/'+slug) }

    return(
        <>
            <Helmet>
                <title>{t('BloglarSayfasi')}</title>
            </Helmet>

            <div className='bloglarContainer dkBox'>

                <div className="bloglarHeader">
                    <h2 style={{color:'rgba(0, 0, 0, 0.7)'}}> {t('Bloglar')} </h2>
                    <Input onChange={(e) => { debouncedHandleChange(e.target.value); }} placeholder={t('blogAra')}/>
                    <div style={{width:'100%', height:1, backgroundColor:'rgba(0, 0, 0, 0.2)'}}></div>
                </div>

                <div className='bloglarBody'>
                    {
                        loading ?
                        <div style={{width:'100%', height:150, display:'flex', justifyContent:'center', alignItems:'center'}}> <Spin size='large'/> </div>
                        :
                        data.blogs && data.blogs.length > 0 && data.blogs.map( blog => {

                            return(
                                <div className='blogItem' key={blog.id}>

                                    <img style={{cursor:'pointer'}} onClick={() => navigateBlog(blog.slug)} alt='DK - List' src={ blog.img || '/images/nopic.png'} className='blogItemImg'/>
                                    
                                    <div className='blogItemContent'>
                                        <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--softBlue)'}}>
                                            {
                                                blog.user 
                                                &&
                                                <div className="subCommentContainerHeaderLeft"  onClick={() => { setProfileData({...profileData, show:true, userID:blog.user.id, currentUserToken:user.token}) }}>
                                                    <img src={ blog.user.image || '/images/nopic2.png' } alt="DK - List Comment Avatar" className="commentAvatar" style={{width:20, height:20}}/>
                                                    <div className="subCommentOwnerUsername" style={{fontSize:14}}>{blog.user.username }</div>
                                                </div>
                                            }
                                            <div className='blogItemContentDate' >{blog.createdData}</div>
                                        </div>
                                        <div className='blogItemContentTitle' onClick={() => navigateBlog(blog.slug)}>{blog.title.length > 30 ? blog.title.slice(0,33)+' ...' : blog.title}</div>
                                        <div className='blogItemContentText'> {blog.preview} </div>
                                        <div className='blogItemContentMore'><span style={{cursor:'pointer'}} onClick={() => navigateBlog(blog.slug)}>{t('devamini_oku')}</span></div>
                                    </div>
                                  
                                </div>
                            );

                        })
                    }
                </div>
                
                <Pagination
                    total           = {data.meta.filteredCount ? data.meta.filteredCount : 0}
                    current         = {query ? query.page : 0}
                    pageSize        = {query ? query.pagePerSize : 10}
                    onChange        = {( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });}}
                    showSizeChanger = {true}
                    style={{marginRight:40, width:'100%', marginBottom:30, textAlign:'right'}}
                />

                {
                    user.userType && ['Blog_Yazari', 'Admin', 'SuperAdmin', 'Mod'].includes(user.userType) && <FloatButton onClick={() => {setShow(true)}} style={{right:75, width:60, height:60}} icon = {<PlusOutlined/>}/>   
                }

                <AddBlogModal show={show} setShow={setShow} query={query} setQuery={setQuery}/>

            </div>
        </>
    )
}
export default BloglarSayfasi