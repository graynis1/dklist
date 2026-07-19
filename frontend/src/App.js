import React from 'react';
import AdminPanel from './layouts/AdminPanel';
import { ConfigProvider } from 'antd';
import './global-improvements.css';
import './firefox-compatibility.css';
import './firefox-polyfills.js';
import tr_TR from 'antd/locale/tr_TR';
import en_US from 'antd/locale/en_US';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Bulten, EksikKitap, IletiAyarlar, Iletiler, Kitaplar, Kullanicilar, MailAyarlari, MailSablon, Rozetler, Youtube, Kategori, YayinEvi, Yazar, Cevirmen, BookImport } from './Pages/AdminPanel/adminpanelpages';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import ProtectedRoute from './GeneralComponents/ProtectedRoute';
import DKListMainLayout from './layouts/DKListMainLayout';
import AkisSayfasi from './Pages/DKList/AkisSayfasi/AkisSayfasi';
import KitaplarSayfasi from './Pages/DKList/KitaplarSayfasi/KitaplarSayfasi';
import YayinEvleriSayfasi from './Pages/DKList/YayinEvleriSayfasi/YayinEvleriSayfasi';
import CevirmenlerSayfasi from './Pages/DKList/CevirmenlerSayfasi/CevirmenlerSayfasi';
import DKListSecondLayout from './layouts/SecondLayout/DKListSecondLayout';
import YazarlarSayfasi from "./Pages/DKList/YazarlarSayfasi/YazarlarSayfasi";
import KitapSayfasi from './Pages/DKList/KitapSayfasi/KitapSayfasi';
import CevirmenSayfasi from './Pages/DKList/CevirmenSayfasi/CevirmenSayfasi';
import YazarSayfasi from './Pages/DKList/YazarSayfasi/YazarSayfasi';
import VideolarSayfasi from './Pages/DKList/VideolarSayfasi/VideolarSayfasi';
import AskidaKitaplarSayfasi from './Pages/DKList/AskidaKitaplarSayfasi/AskidaKitaplarSayfasi';
import AskidaKitapSayfasi from './Pages/DKList/AskidaKitapSayfasi/AskidaKitapSayfasi';
import MyRouter from './Pages/MyRouter';
import BildirimSayfasi from './Pages/DKList/BildirimSayfasi/BildirimSayfasi';
import ChatSayfasi from './Pages/DKList/ChatSayfasi/ChatSayfasi';
import BlogSayfasi from './Pages/DKList/BlogSayfasi/BlogSayfasi';
import BloglarSayfasi from './Pages/DKList/BloglarSayfasi/BloglarSayfasi';
import Blog from './Pages/AdminPanel/Blog/Blog';

const App = () => {
    
    const ADMIN_PANEL_BASE = '/admin/';
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {
        if ( location.pathname === '/' ) {
            navigate(t('/akis'));
        }
    }, [location])

    return (
        <ConfigProvider 
            locale={i18n.language==='tr' ? tr_TR : en_US}
            theme={{
                token: {
                    // Firefox uyumlu CSS properties
                    borderRadius: 6,
                    colorPrimary: '#1890ff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                },
                components: {
                    Button: {
                        // Firefox için button fixes
                        borderRadius: 6,
                        controlHeight: 32,
                    },
                    Input: {
                        // Firefox için input fixes
                        borderRadius: 6,
                        controlHeight: 32,
                    },
                    Select: {
                        // Firefox için select fixes
                        borderRadius: 6,
                        controlHeight: 32,
                    },
                    Card: {
                        // Firefox için card fixes
                        borderRadius: 8,
                    },
                    Modal: {
                        // Firefox için modal fixes
                        borderRadius: 12,
                    },
                    Table: {
                        // Firefox için table fixes
                        borderRadius: 6,
                    }
                }
            }}
        >
            <Helmet>
                <html lang={i18n.language} />
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
            </Helmet>
            <Routes>
                <Route path={ADMIN_PANEL_BASE} element={<ProtectedRoute homeUrl = {'/'} render={<AdminPanel/>}/>}>
                    <Route path={ADMIN_PANEL_BASE+''}                    element={ <Kitaplar/> }        />
                    <Route path={ADMIN_PANEL_BASE+'kitaplar'}            element={ <Kitaplar/> }        />
                    <Route path={ADMIN_PANEL_BASE+'bildirilen-kitaplar'} element={ <EksikKitap/> }      />
                    <Route path={ADMIN_PANEL_BASE+'kullanicilar'}        element={ <Kullanicilar/> }    />
                    <Route path={ADMIN_PANEL_BASE+'iletiler'}            element={ <Iletiler/> }        />
                    <Route path={ADMIN_PANEL_BASE+'ileti-ayarlari'}      element={ <IletiAyarlar/> }    />
                    <Route path={ADMIN_PANEL_BASE+'e-bulten'}            element={ <Bulten/> }          />
                    <Route path={ADMIN_PANEL_BASE+'mail-ayarlari'}       element={ <MailAyarlari/> }    />
                    <Route path={ADMIN_PANEL_BASE+'mail-sablonu'}        element={ <MailSablon/> }      />
                    <Route path={ADMIN_PANEL_BASE+'youtube'}             element={ <Youtube/> }         />
                    <Route path={ADMIN_PANEL_BASE+'rozetler'}            element={ <Rozetler/> }        />
                    <Route path={ADMIN_PANEL_BASE+'kategoriler'}         element={ <Kategori/> }        />
                    <Route path={ADMIN_PANEL_BASE+'yazar'}               element={ <Yazar/> }           />
                    <Route path={ADMIN_PANEL_BASE+'yayin-evi'}           element={ <YayinEvi/> }        />
                    <Route path={ADMIN_PANEL_BASE+'cevirmen'}            element={ <Cevirmen/> }        />
                    <Route path={ADMIN_PANEL_BASE+'book-import'}         element={ <BookImport/> }      />
                    <Route path={ADMIN_PANEL_BASE+'bloglar'}             element={ <Blog/> }            />
                </Route> 
                <Route element={<DKListMainLayout/>}>
                    <Route element={<DKListSecondLayout/>}>
                        <Route path={'/'} element={ <AkisSayfasi/> }/>
                        <Route path={t('/akis')} element={ <AkisSayfasi/> }/>
                        <Route path={t('/akis')+'/:commentID'} element={ <AkisSayfasi/> }/>
                        <Route path={t('/kitaplar')+'/:categorySlug'} element={ <KitaplarSayfasi/> }/>
                        <Route path={t('/kitaplar')} element={ <KitaplarSayfasi/> }/>
                        <Route path={t('/yayinevi')+'/:publisherSlug'} element={ <KitaplarSayfasi/> }/>
                        <Route path={t('/cevirmenler')} element={ <CevirmenlerSayfasi/> }/>
                        <Route path={t('/yayin-evleri')} element={ <YayinEvleriSayfasi/> }/>
                        <Route path={t('/yazarlar')} element={ <YazarlarSayfasi/> }/>
                        <Route path={t('/videolar')} element={ <VideolarSayfasi/> }/>
                        <Route path={t('/askida-kitap')} element={ <AskidaKitaplarSayfasi/> }/>
                        <Route path={t('/bloglar')} element={ <BloglarSayfasi/> }/>
                    </Route>
                    <Route path={t('/yazar') +'/:slug'} element={ <YazarSayfasi/> }/>
                    <Route path={t('/cevirmen') +'/:slug'} element={ <CevirmenSayfasi/> }/>
                    <Route path={t('/kitap') +'/:slug'} element={ <KitapSayfasi/> }/>
                    <Route path={t('/askida-kitap') +'/:slug'} element={ <AskidaKitapSayfasi/> }/>
                    <Route path={t('/bildirimler')} element={ <BildirimSayfasi/> }/>
                    <Route path={t('/mesajlar')} element={ <ChatSayfasi/> }/>
                    <Route path={t('/blog')+'/:slug'} element={ <BlogSayfasi/> }/>
                </Route>

                <Route path="*" element={<MyRouter/>} />
            </Routes>
        </ConfigProvider>
    );
};
export default App;