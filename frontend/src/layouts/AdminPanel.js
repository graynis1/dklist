import React from 'react';
import { UserOutlined, CommentOutlined, MailOutlined, YoutubeOutlined, SmileOutlined, ReadOutlined, NotificationOutlined, HomeOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
const { Content, Sider } = Layout;

const ADMIN_PANEL_BASE = '/admin/';

const generateMenu = ( menu ) => {
    
    return menu.map( ( item ) => {
        return {
            key      : item.key,
            icon     : item.icon && React.createElement( item.icon ),
            label    : item.label,
            onClick  : item.onClick,
            children : item.children && item.children.map( ( subitem ) => {
                return{
                    key     : subitem.key,
                    label   : subitem.label,
                    onClick : subitem.onClick
                }   
            }) 
        };
    });
}

const renderBreadcrumbItem = ( path ) => {
    let view = '';
    switch (path) {
        case 'kitaplar':
            view = 'Kitaplar';
            break;
        case 'bildirilen-kitaplar':
            view = 'Bildirilen Kitaplar';
            break;
        case 'kullanicilar':
            view = 'Kullanıcılar';
            break;
        case 'iletiler':
            view = 'İletiler';
            break;
        case 'ileti-ayarlari':
            view = 'İleti Ayarları';
            break;
        case 'e-bulten':
            view = 'E Bülten';
            break;
        case 'mail-ayarlari':
            view = 'Mail Ayarları';
            break;
        case 'mail-sablonu':
            view = 'Mail Şablonu';
            break;
        case 'youtube':
            view = 'Youtube';
            break;
        case 'rozetler':
            view = 'Rozetler';
            break;
        case 'kategoriler':
            view = 'Kategoriler';
            break;
        case 'yazar':
            view = 'Yazarlar';
            break;
        case 'yayin-evi':
            view = 'Yayın Evleri';
            break;
        case 'cevirmen':
            view = 'Çevirmen';
            break;   
        case 'book-import':
            view = 'Toplu Kitap İçe Aktarma';
            break;
        case 'bloglar':
            view = 'Bloglar';
            break;            
            
        default:
            break;
    }
    return <Breadcrumb.Item>{view}</Breadcrumb.Item>
}

const AdminPanel = () => {
    
    const { token: { colorBgContainer } } = theme.useToken();
    const navigate = useNavigate();
    const location = useLocation();

    const menu = [ 
        { key:'envanter', icon:ReadOutlined, label:'Envanter', children:[
            { key:'kitaplar'              , onClick:() => { navigate(ADMIN_PANEL_BASE+'kitaplar') }             , label:'Kitaplar' },
            // { key:'bildirilen-kitaplar'   , onClick:() => { navigate(ADMIN_PANEL_BASE+'bildirilen-kitaplar') }  , label:'Bildirilenler' },
            { key:'kategoriler'           , onClick:() => { navigate(ADMIN_PANEL_BASE+'kategoriler') }          , label:'Kategori' },
            { key:'yazar'                 , onClick:() => { navigate(ADMIN_PANEL_BASE+'yazar') }                , label:'Yazar' },
            { key:'yayin-evi'             , onClick:() => { navigate(ADMIN_PANEL_BASE+'yayin-evi') }            , label:'Yayın Evi' },
            { key:'cevirmen'              , onClick:() => { navigate(ADMIN_PANEL_BASE+'cevirmen') }             , label:'Çevirmen' },
            { key:'book-import'           , onClick:() => { navigate(ADMIN_PANEL_BASE+'book-import') }          , label:'Toplu İçe Aktarma' },
        ]},
        { key:'kullanicilar', onClick:() => { navigate(ADMIN_PANEL_BASE+'kullanicilar') }, icon:UserOutlined   , label:'Kullanıcılar'},
        { key:'iletiler-genel'    , icon:CommentOutlined, label:'İleti İşlemleri', children:[// yorum, alıntı, yorum, alt yorum ve blog içeriğinin yönetimi
            { key:'iletiler'       , onClick:() => { navigate(ADMIN_PANEL_BASE+'iletiler') }      , label:'İletiler' },
            // { key:'ileti-ayarlari' , onClick:() => { navigate(ADMIN_PANEL_BASE+'ileti-ayarlari')} , label:'Ayarlar'  }
        ]},
        { key:'e-bulten', onClick:() => { navigate(ADMIN_PANEL_BASE+'e-bulten') }, label:'E - Bülten', icon:NotificationOutlined },
        // { key:'mail'  , label:'Mail', icon:MailOutlined, children:[
        //     { key:'mail-test' , onClick:() => { navigate(ADMIN_PANEL_BASE+'mail-test') } , label:'Mail Test'  },
        //     { key:'mail-ayarlari' , onClick:() => { navigate(ADMIN_PANEL_BASE+'mail-ayarlari') } , label:'Mail Ayarları'  },
        //     { key:'mail-sablonu'  , onClick:() => { navigate(ADMIN_PANEL_BASE+'mail-sablonu') }  , label:'Şablon'         },
        // ] },
        { key:'youtube' , onClick:() => {  navigate(ADMIN_PANEL_BASE+'youtube') }  , label:'Youtube',  icon:YoutubeOutlined },
        { key:'rozetler', onClick:() => {  navigate(ADMIN_PANEL_BASE+'rozetler') } , label:'Rozetler', icon:SmileOutlined },
        { key:'bloglar' , onClick:() => {  navigate(ADMIN_PANEL_BASE+'bloglar') }  , label:'Bloglar',  icon:SmileOutlined },
    ];

    return (
        <Layout>
            <Sider
                width={220}
                style={{
                    background: colorBgContainer,
                    height: '100vh',
                    overflow:'auto',
                    position:'relative'
                }}
            >
                <div style={{width:'100%', height:100, position:'sticky', top:0, backgroundColor:'white', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1}}>
                    <img alt='Dklist Logosu' src='/images/dklist.png' style={{width:'60%', height:'60%', objectFit:'contain', cursor:'pointer'}} onClick={() => {navigate('/')}}/>
                </div>

                <Menu
                    mode="inline"
                    defaultOpenKeys={['envanter']}
                    selectedKeys={[location.pathname.replace('/', '') !== '' ? location.pathname.replace('/', '') : 'kitaplar']}
                    style={{
                        borderRight: 0,
                    }}
                    items={ generateMenu( menu ) }
                /> 

            </Sider>
            <Layout style={{ padding: '0 24px 24px' }} >
                <Breadcrumb style={{ height:50, display:'flex', justifyContent:'flex-start', alignItems:'center'}} >
                    <Breadcrumb.Item><NavLink to={ADMIN_PANEL_BASE+'kitaplar'}><HomeOutlined/> Admin Panel</NavLink></Breadcrumb.Item>
                    {
                        renderBreadcrumbItem( location.pathname.replace('/admin/', '') )
                    }
                </Breadcrumb>
                <Content className='contentContainer' style={{ padding: 24, margin: 0, background: colorBgContainer, overflow:'auto', borderRadius:20 }}>
                    <Outlet/>
                </Content>
            </Layout>
        </Layout>
    );
};
export default AdminPanel;