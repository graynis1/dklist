import React from "react";
import {useTranslation} from "react-i18next";
import "./style.css";
import { Carousel, Spin } from "antd";
import { NavLink } from "react-router-dom";
import { StarOutlined } from '@ant-design/icons';
import throwNotification from "../../GeneralFunctions/throwNotification";
import apiRequest from "../../services";
const RightColumn = () => {

    const { t } = useTranslation();

    const [loading, setLoading] = React.useState(true);
    const [ data, setData ] = React.useState({
        books: [],
        writers: [],
        blogs: [],
        youtube1: '',
        youtube2: ''
    })

    const getTopItems = React.useCallback( async () => {

        setLoading(true);
        
        const request = await apiRequest({endpoint:'/get-top-items'});



        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                duration:3
            });

        }
        else{
            const response = request.responseData.response || {};
            setData({
                books: Array.isArray(response.books) ? response.books : [],
                writers: Array.isArray(response.writers) ? response.writers : [],
                blogs: Array.isArray(response.blogs) ? response.blogs : [],
                youtube1: response.youtube1 || '',
                youtube2: response.youtube2 || ''
            });
        }
        setLoading(false);
    }, []);

    React.useEffect(() => {
        getTopItems();
    }, [getTopItems])

    React.useEffect(() => {
        if (!loading) {
            if (data) {
                if (data.youtube1) {
                    document.querySelector('.rightColumnItem-youtube1').innerHTML = data.youtube1;
                }
                if (data.youtube2) {
                    document.querySelector('.rightColumnItem-youtube2').innerHTML = data.youtube2;
                }
            }
        }
    }, [loading]);

    return(
        <div className='rightColumn'>
            {
                data &&
                <>
                    {
                        loading ?
                        <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        <div className="iframe rightColumnItem-youtube1"></div>
                    }
                    {
                        loading ?
                        <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        <div className="iframe rightColumnItem-youtube2"></div>
                    }
                    {
                        loading ?
                        <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        data.books && data.books.length > 0 &&
                        <div className="rightColumnResponsiveTemp">
                            <NavLink to={t('/kitaplar')} style={{width:'100%', textAlign:'center', color:'#007bff', cursor:'pointer', display:'block', textDecoration:'none'}}> {t('yukselenKitaplar')} </NavLink>
                            <Carousel draggable dots={false} autoplay autoplaySpeed={5000}>
                            {
                                data.books.map( book => {
                                    return(
                                        <div key={book.id} className="rightColumnItem rightColumnItem-book">
                                            <div className="rightColumnItemShadowContainer">
                                                <NavLink to={t('/kitap')+'/'+book.slug}>
                                                {
                                                    book.image ?
                                                    <img style={{width:80, height:130}} src={book.image} alt={book.name}/>
                                                    :
                                                    <img style={{width:80, height:130}} alt={book.name} src={'/images/nopic.jpg'}/>
                                                }
                                                </NavLink>
                                                <div className="rightColumnItemShadowBox">
                                                    <div style={{display:'flex', alignItems:'center'}}><StarOutlined style={{marginRight:5}}/> {book.score.toFixed(1)}</div>
                                                </div>
                                            </div>
                                            <NavLink to={t('/kitap')+'/'+book.slug} className="rightColumnItemTitle"> {book.name} </NavLink>
                                        </div>
                                    )
                                } )
                            }
                            </Carousel>
                        </div>
                    }
                    {
                        loading ?
                        <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        data.writers && data.writers.length > 0 &&
                        <div className="rightColumnResponsiveTemp">
                            <p style={{width:'100%', textAlign:'center', color:'#007bff'}}> {t('yukselen_yazarlar')} </p>
                            <Carousel draggable dots={false} autoplay autoplaySpeed={5000}>
                                {
                                    data.writers.map( writer => {
                                        return(
                                            <div key={writer.id} className="rightColumnItem rightColumnItem-writer">
                                                <div className="rightColumnItemShadowContainer">
                                                    <NavLink to={t('/yazar')+'/' + writer.slug}>
                                                    {
                                                        writer.image ?
                                                        <img style={{width:80, height:130}} src={writer.image} alt={writer.name}/>
                                                        :
                                                        <img style={{width:80, height:130}} alt={writer.name} src={'/images/nopic.jpg'}/>
                                                    }
                                                    </NavLink>
                                                    <div className="rightColumnItemShadowBox">
                                                        <div style={{display:'flex', alignItems:'center'}}><StarOutlined style={{marginRight:5}}/> {writer.score.toFixed(1)}</div>
                                                    </div>
                                                </div>
                                                <NavLink to={t('/yazar')+'/' + writer.slug} className="rightColumnItemTitle"> {writer.name} </NavLink>
                                            </div>
                                        )
                                    })
                                }
                            </Carousel>
                        </div>
                    }
                    {
                        loading ?
                            <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        data.blogs && data.blogs.length > 0 &&
                        <div className="rightColumnResponsiveTemp">
                            <div className="rightColumnItem rightColumnItem-book">
                                <div className="rightColumnItemShadowContainer">
                                    <NavLink to={t('/blog')+'/'+data.blogs[0]?.slug}>
                                    {
                                        data.blogs[0]?.image ?
                                        <img style={{width:80, height:130}} src={data.blogs[0].image} alt={data.blogs[0].title}/>
                                        :
                                        <img style={{width:80, height:130}} alt={data.blogs[0]?.title || ''} src={'/images/nopic.jpg'}/>
                                    }
                                    </NavLink>
                                </div>
                                <NavLink to={t('/blog')+'/'+data.blogs[0]?.slug} className="rightColumnItemTitle"> {data.blogs[0]?.title} </NavLink>
                                {data.blogs[0]?.preview && data.blogs[0].preview.length > 70 ? data.blogs[0].preview.slice(0,70)+'...' : data.blogs[0]?.preview}
                                <NavLink to={t('/blog')+'/'+data.blogs[0]?.slug} style={{color:'var(--softBlue)', width:'100%'}}> {t('devamini_oku')} </NavLink>
                            </div>
                        </div>
                    }
                    {
                        loading ?
                            <div style={{width:'100%', height:60, display:'flex', justifyContent:'center', alignItems:'center', margin:'30px 0'}}><Spin size="large"/></div>
                        :
                        data.blogs && data.blogs.length > 1 &&
                        <div className="rightColumnResponsiveTemp">
                            <div className="rightColumnItem rightColumnItem-book">
                                <div className="rightColumnItemShadowContainer">
                                    <NavLink to={t('/blog')+'/'+data.blogs[1]?.slug}>
                                    {
                                        data.blogs[1]?.image ?
                                        <img style={{width:80, height:130}} src={data.blogs[1].image} alt={data.blogs[1].title}/>
                                        :
                                        <img style={{width:80, height:130}} alt={data.blogs[1]?.title || ''} src={'/images/nopic.jpg'}/>
                                    }
                                    </NavLink>
                                </div>
                                <NavLink to={t('/blog')+'/'+data.blogs[1]?.slug} className="rightColumnItemTitle"> {data.blogs[1]?.title} </NavLink>
                                {data.blogs[1]?.preview && data.blogs[1].preview.length > 70 ? data.blogs[1].preview.slice(0,70)+'...' : data.blogs[1]?.preview}
                                <NavLink to={t('/blog')+'/'+data.blogs[1]?.slug} style={{color:'var(--softBlue)', width:'100%'}}> {t('devamini_oku')} </NavLink>
                            </div>
                        </div>
                    }
                </>
            }
        </div>
    )
}
export default React.memo(RightColumn);