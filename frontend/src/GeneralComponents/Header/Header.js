import './style.css';
import React from 'react';
import { AutoComplete, Avatar, Badge, Drawer, Select, Tooltip } from 'antd';
import { HomeOutlined, LoginOutlined, MessageOutlined, NotificationOutlined, UserAddOutlined, CloseOutlined, MenuOutlined} from '@ant-design/icons';
import RegisterModal from './components/RegisterModal';
import LoginModal from './components/LoginModal';
import { useUserAuth } from '../../Context/UserAuthContext';
import throwNotification from '../../GeneralFunctions/throwNotification';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faLanguage } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../../Context/UserProfileContext';
import debounce from "lodash.debounce"; 
import apiRequest from '../../services';
import getBaseSlug from '../../GeneralFunctions/getBaseSlug';
import RenderTitle from './components/RenderTitle';

const HeaderComponent = () => {

    const [ search, setSearch ] = React.useState('initial');
    const { t, i18n } = useTranslation();
    const { user, setUser, userLogin } = useUserAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { profileData, setProfileData } = useProfile();
    const [ notifyCounter, setNotifyCounter ] = React.useState(0);
    const [ messageCount,  setMessageCount ] = React.useState(0);

    const isMobile = window.innerWidth < 700 ? true : false;

    const [ showDrawer, setShowDrawer ] = React.useState(false);
    const [ showRegisterPopup, setShowRegisterPopup ] = React.useState(false);
    const [ showLoginPopup, setShowLoginPopup ] = React.useState(false);
    const [ options, setOptions] = React.useState([
        {
            label: RenderTitle('header1', 'user'),
            options: [],
            type:'user'
        },
        {
            label: RenderTitle('header2', 'book'),
            options: [],
            type:'book'
        },
        {
            label: RenderTitle('header3', 'writer'),
            options: [],
            type:'writer'
        },
        {
            label: RenderTitle('header4', 'translator'),
            options: [],
            type:'translator'
        }
    ]);
    
    const actions = {
        exitAction : async () => {
            localStorage.clear();
            setUser({username:null,token:null,img:null,id:null,userType:null});
            throwNotification({
                message:t('header6'),
                duration:3,
                type:'info'
            });
        },
        notificationAction : async () => {
            navigate(t('/bildirimler'));
        },
        messagesAction : async () => {
            navigate(t('/mesajlar'));
        },
        homepageAction : async () => {
            navigate('/');
        },
        loginAction : async () => {
            setShowLoginPopup(true);
        },
        registerAction : async () => {
            setShowRegisterPopup(true);
        },
        mobileDrawerAction : async () => {
            setShowDrawer(true);
        },
        switchLanguage : async (lang) => {
            await i18n.changeLanguage( lang );
            localStorage.setItem('lang', lang)
            setOptions([...options]);
            switch (location.pathname) {
                case '/books':
                    navigate('/kitaplar')
                    break;
                case '/kitaplar':
                    navigate('/books')
                    break;
                case '/akis':
                    navigate('/flow')
                    break;
                case '/flow':
                    navigate('/akis')
                    break;
                case '/cevirmenler':
                    navigate('/translators')
                    break;
                case '/translators':
                    navigate('/cevirmenler')
                    break;
                case '/yayin-evleri':
                    navigate('/publishers')
                    break;
                case '/publishers':
                    navigate('/yayin-evleri')
                    break;
                case '/yazarlar':
                    navigate('/writers')
                    break;
                case '/writers':
                    navigate('/yazarlar')
                    break;
                case '/videolar':
                    navigate('/videos')
                    break;
                case '/videos':
                    navigate('/videolar')
                    break;
                case '/askida-kitap':
                    navigate('/store')
                    break;
                case '/store':
                    navigate('/askida-kitap')
                    break;
                case '/mesajlar':
                    navigate('/messages')
                    break;
                case '/messages':
                    navigate('/mesajlar')
                    break;
                case '/bildirimler':
                    navigate('/notifications')
                    break;
                case '/notifications':
                    navigate('/bildirimler')
                    break;
                case '/bloglar':
                    navigate('/blogs')
                    break;
                case '/blogs':
                    navigate('/bloglar')
                    break;
                default:
                    if (location.pathname.includes('/yazar/')) {
                        navigate('/writer/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/writer/')){
                        navigate('/yazar/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/kitap/')) {
                        navigate('/book/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/book/')){
                        navigate('/kitap/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/cevirmen/')) {
                        navigate('/translator/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/translator/')){
                        navigate('/cevirmen/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/kullanici/')) {
                        navigate('/user/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/user/')){
                        navigate('/kullanici/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/askida-kitap/')) {
                        navigate('/store/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/store/')){
                        navigate('/askida-kitap/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/akis/')) {
                        navigate('/flow/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if(location.pathname.includes('/flow/')){
                        navigate('/akis/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else if (location.pathname.includes('/blog/')) {
                        navigate('/blog/'+location.pathname.split('/')[location.pathname.split('/').length-1]);
                    }
                    else{
                        navigate('/');
                    }
                    break;
            }
        }
    }

    const checkNotificationCount = async () => {

        if( ! user.token ){
            return;
        }

        const request = await apiRequest({endpoint:'/notify', headers:{Authorization:user.token}});

        if ( !request.error && (Number(request.responseData.response) !== Number(notifyCounter) || Number(request.responseData.response) === 0) ) {
            setNotifyCounter(Number(request.responseData.response))
        }
    }

    const checkMessageCount = async () => {

        if( ! user.token ){
            return;
        }

        const request = await apiRequest({endpoint:'/message/unview-count', headers:{Authorization:user.token}});

        if ( !request.error && (Number(request.responseData.response) !== Number(messageCount) || Number(request.responseData.response) === 0 ) ) {
            setMessageCount(Number(request.responseData.response))
        }
    }

    const handleAvatarClick = () => {
        if (user && user.id) {
            // UserID'yi agresif temizle - sadece sayıları al
            const cleanID = String(user.id).replace(/[^\d]/g, '');
            console.log('Avatar tıklandı - Orijinal ID:', user.id, '| Temizlenmiş ID:', cleanID);
            
            if (cleanID && cleanID !== '0' && cleanID !== '-1') {
                setProfileData({
                    userID: cleanID,
                    show: true,
                    currentUserToken: user.token
                });
            } else {
                console.error('Geçersiz User ID:', user.id, '->', cleanID);
            }
        }
    };

    const navigateToMyProfile = () => {
        if (user && user.id) {
            // UserID'yi agresif temizle - sadece sayıları al
            const cleanID = String(user.id).replace(/[^\d]/g, '');
            console.log('Profil menüsü tıklandı - Orijinal ID:', user.id, '| Temizlenmiş ID:', cleanID);
            
            if (cleanID && cleanID !== '0' && cleanID !== '-1') {
                setProfileData({
                    userID: cleanID,
                    show: true,
                    currentUserToken: user.token
                });
            } else {
                console.error('Geçersiz User ID:', user.id, '->', cleanID);
            }
        }
    };

    const normalItems =( 
        <>
            {
                !userLogin ?
                <div className='headerActionsGroup'>
                    <div className='headerActionItem' onClick={actions.loginAction}><FontAwesomeIcon icon={faRightToBracket} /> {t('header7')}</div>
                    <div className='headerActionItem' onClick={actions.registerAction}><UserAddOutlined /> {t('header8')}</div>
                    <Select
                        className='headerActionItem'
                        size={'small'}
                        onChange={(value)=>{actions.switchLanguage(value)}}
                        defaultValue={i18n.language}
                        options={[{label:t('Türkçe'), value:'tr'}, {label:t('İngilizce'), value:'en'}]}
                    />
                </div>
                :
                <div className='headerActionsGroup'>
                    <Badge className='headerActionItem' count={notifyCounter} offset={[10, 0]}><Tooltip title={t('header16')}><NotificationOutlined style={{fontSize:20}} onClick={actions.notificationAction}/></Tooltip></Badge>
                    <Badge className='headerActionItem' count={messageCount} offset={[10, 0]}><Tooltip title={t('header15')}><MessageOutlined style={{fontSize:20}} onClick={actions.messagesAction} /></Tooltip></Badge>
                    <div className='headerActionItem' onClick={actions.exitAction}> <CloseOutlined/></div>
                    <Select
                        className='headerActionItem'
                        size={'small'}
                        onChange={(value)=>{actions.switchLanguage(value)}}
                        defaultValue={i18n.language}
                        options={[{label:t('Türkçe'), value:'tr'}, {label:t('İngilizce'), value:'en'}]}
                    />
                    <div className='headerActionItem'>
                        <span onClick={handleAvatarClick}>
                            {
                                ! user.img ? 
                                <Avatar className='headerAvatar' style={{width:50, height:50, display:'flex', justifyContent:'center', alignItems:'center'}} >
                                    {user.username?.toString() || 'U'}
                                </Avatar>
                                :
                                <Avatar className='headerAvatarImg' style={{width:50, height:50}}  src={ <img style={{width:'100%', height:'100%', objectFit:'cover'}} src={ user.img } alt='DKList'/> }/>
                            }
                        </span>
                    </div>
                </div>
            }
        </>
    )

    const mobileItems = (
        <>
            {
                !userLogin ?
                <>
                    {
                        <MenuOutlined onClick={() => {setShowDrawer(true)}} className='hamburgerMenu'/>
                    }
                    <Drawer footer={t('header13')} footerStyle={{color:'gray'}} placement='left' onClose={() => { setShowDrawer(false) }} open={showDrawer} width={230}>
                        <div className='drawerItems'>
                            <div className='drawerItem' onClick={actions.loginAction}><LoginOutlined /> {t('header7')}</div>
                            <div className='drawerItem' onClick={actions.registerAction}><UserAddOutlined /> {t('header8')}</div>
                            <div className='drawerItem' onClick={actions.switchLanguage}><FontAwesomeIcon icon={faLanguage}/> {t('header9')}</div>
                        </div>
                    </Drawer>
                </>
                :
                <>
                    {
                        ! user.img ? 
                        <Avatar className='headerAvatar' style={{cursor:'pointer'}} size="large" onClick={actions.mobileDrawerAction}>
                            {user.username?.toString() || 'U'}
                        </Avatar>
                        :
                        <Avatar className='headerAvatarImg' style={{cursor:'pointer'}} size="large" src={ <img src={user.img} alt='DKList'/> } onClick={actions.mobileDrawerAction}/>
                    }
                    
                    <Drawer footer={t('header13')} footerStyle={{color:'gray'}} placement="right" onClose={() => { setShowDrawer(false) }} open={showDrawer} width={230}>
                        <div className='drawerItems'>
                            <div style={{cursor:'pointer'}} onClick={navigateToMyProfile}>
                                {
                                    ! user.img ?  
                                    <Avatar className='headerAvatar' style={{cursor:'pointer'}} size="small" onClick={actions.mobileDrawerAction}>
                                        {user.username?.toString() || 'U'}
                                    </Avatar>
                                    :
                                    <Avatar className='headerAvatarImg' style={{cursor:'pointer'}} size="small" src={ <img src={user.img} alt='DKList'/> } onClick={actions.mobileDrawerAction}/>
                                }
                                <span style={{marginLeft:10}}>{t('profili_gor')}</span>
                            </div>
                            <div className='drawerItem' onClick={actions.homepageAction}><HomeOutlined/> {t('header14')}</div>
                            <Badge className='drawerItem' count={notifyCounter} offset={[30, 5]}><span onClick={actions.notificationAction}><NotificationOutlined/> {t('header16')}</span> </Badge>
                            <Badge className='drawerItem' count={messageCount} offset={[30, 5]}><span onClick={actions.messagesAction}><MessageOutlined /> {t('header15')}</span></Badge>
                            <div className='drawerItem' onClick={actions.exitAction}> <CloseOutlined/> {t('header12')}  </div>
                        </div>
                    </Drawer>
                </>
            }
        </>
    )

    const debouncedHandleChange = React.useMemo(() => {
        return debounce((value) => {
            setSearch(value)
        }, 700);
    }, [setSearch]);

    const getResults = async () => {

        const request = await apiRequest({endpoint:'/search?search='+search });

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:t('arama_sırasında_hata_oluştu'),
                duration:4
            });

        }
        else{

            const data = request.responseData.response;

            setOptions([
                {label: options[0].label, type:'user',       options:data.users}, 
                {label: options[1].label, type:'book',       options:data.books}, 
                {label: options[2].label, type:'writer',     options:data.writers}, 
                {label: options[3].label, type:'translator', options:data.translators}, 
            ])
        }
    }

    React.useEffect(() => {
        checkNotificationCount();
        checkMessageCount();
        const intervalId = setInterval(() => {
            checkNotificationCount();
            checkMessageCount();
        }, 5000);
        return () => clearInterval(intervalId);
    }, [user]); 

    React.useEffect(() => {
        return () => {
            debouncedHandleChange.cancel();
        };
    }, [debouncedHandleChange]);

    React.useEffect( () => {
        if ( search !== 'initial' ) {
            getResults();
        }
    }, [search])

    return (
        <header className='header'>

            <div className='headerLogoContainer'>
                <img onClick={() => {navigate(t('/akis'))}} src='/images/dklist.png' className='headerLogo' alt='Dklist Logosu'/>
            </div>

            <AutoComplete 
                className='searchInput' 
                allowClear 
                onSelect={(value, object) => {
                    
                    if (object.type === 'user') {
                        setProfileData({...profileData, userID : object.target, show:true});
                    }
                    else if( ['writer', 'translator', 'book'].includes(object.type) ){
                        navigate(getBaseSlug(object.type, t)+object.target)
                    }
                    
                }}  
                onSearch={(value) => { debouncedHandleChange(value) }} 
                options={options.map((item) => { return { ...item, options:item.options.map( (subItem) => {
                    return { value: subItem.label, label: subItem.label, target:subItem.target, type:item.type, key:subItem.id } 
                })}})}
            />

            {
                isMobile 
                ?
                mobileItems
                :
                normalItems
            }
            <LoginModal show={showLoginPopup} setShow={setShowLoginPopup}/>
            <RegisterModal show={showRegisterPopup} setShow={setShowRegisterPopup}/>
        </header>
    );
};

export default HeaderComponent;