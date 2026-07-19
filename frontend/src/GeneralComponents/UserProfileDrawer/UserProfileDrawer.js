import './style.css';
import { useProfile } from '../../Context/UserProfileContext';
import React from 'react';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { Drawer, Modal, Select, Spin, Tooltip } from 'antd';
import ImageComponent from './components/ImageComponent';
import { useUserAuth } from '../../Context/UserAuthContext';
import ActionsComponent from './components/ActionsComponent';
import UserBiyoComponent from './components/UserBiyoComponent';
import UserReadStatusesComponent from './components/UserReadStatusesComponent';
import UserFollowContainer from './components/UserFollowContainer/UserFollowContainer';
import LikedContainer from './components/LikedContainer/LikedContainer';
import { useScreenSize } from '../../Context/ResponsiveContext';
import BadgeContainer from './components/BadgeContainer';
import SettingsModal from './components/SettingsModal';
import { useTranslation } from 'react-i18next';
import BookListComponent from './components/BookListComponent/BookListComponent';
import apiRequest from '../../services';
import throwNotification from '../../GeneralFunctions/throwNotification';
import ButtonComponent from '../ButtonComponent';
import BlogContainer from './components/BlogsContainer';
import StoreContainer from './components/StoreContainer';

const UserProfileDrawer = () => {

    const { profileData, setProfileData } = useProfile(); 
    const { user } = useUserAuth();
    const {screenSize} = useScreenSize();
    const [ settingsModalShow, setSettingsModalShow ] = React.useState(false);
    const { t } = useTranslation();

    const [show, setShow] = React.useState(false);
    const [ books, setBooks ] = React.useState([]);
    const [ bookLoading, setBookLoading ] = React.useState(false);
    const [ selectedBook, setSelectedBook ] = React.useState(-1);

    return (
        <Drawer  width={300} placement="right" closable={screenSize<400} bodyStyle={{padding:0, margin:0}} onClose={() => {setProfileData({...profileData, show:false, currentUserToken:user.token})}} open={profileData.show}>
            <div className='profileDrawerContainer'>
                {
                    ( Number(user.id) === Number(profileData.userID) ) &&  
                    <Tooltip title={t('ayarlar')}>
                        <SettingOutlined className='settingsIcon' onClick={() => {setSettingsModalShow(true)}}/>
                    </Tooltip>
                }
                {
                    profileData && profileData.username && profileData.createdDate ?
                    <>
                        <ImageComponent image={profileData.image} />
                        {
                            user.token && Number(user.id)!==Number(profileData.userID) && <ActionsComponent currentUserIsFallow={ profileData.currentUserIsFallow } />
                        }
                        <UserBiyoComponent/>
                        <BadgeContainer/>
                        { profileData.read && profileData.read.readdedList && <UserReadStatusesComponent/> }

                        { profileData.followers && profileData.follow && <UserFollowContainer/>}
                        <LikedContainer/>
                        { <BookListComponent data={profileData.library || []} header = { () => { return <span> {t('kutuphane')} {
                            Number(user.id) === Number(profileData.userID) && <PlusOutlined onClick={()=>{setShow(true)}} className='addBookToLibraryButton'/> 
                        } </span> } }/>}
                        { profileData && profileData.read && profileData.read.currentlyReadingList && profileData.read.currentlyReadingList.length > 0 && <BookListComponent data={profileData.read.currentlyReadingList} title={t('suan_okuduklari')}/> }
                        { profileData && profileData.read  && profileData.read.futureReadingList && profileData.read.futureReadingList.length > 0 && <BookListComponent data={profileData.read.futureReadingList} title={t('okuyacaklari')}/>}
                        { profileData && profileData.read  && profileData.read.readdedList && profileData.read.readdedList.length > 0 && <BookListComponent data={profileData.read.readdedList} title={t('okuduklari')}/>}
                        { profileData && profileData.store && profileData.store.length > 0 && <StoreContainer/>}
                        { profileData && profileData.blogs && profileData.blogs.length>0 && <BlogContainer/>}
                    </>
                    :
                    <Spin size='large' style={{margin:'60% auto'}}/>
                }
                <SettingsModal setShow={setSettingsModalShow} show={settingsModalShow}/>
                <Modal
                    open={show}
                    onCancel={() => {setShow(false)}}
                    onOk={()=>{setShow(false)}}
                    footer={null}
                >
                    <span>{t('kitap_sec')}</span>
                    <Select
                        style={{width:'100%', margin:'20px 0'}}
                        showSearch
                        filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        onChange={ (value) => {setSelectedBook(value)}}
                        onClick={async () => {

                            setBookLoading(true);

                            const request = await apiRequest({endpoint:'/get-all-books-for-library', headers:{Authorization:user.token}});

                            if (request.error || request.responseData.status === false) {
                                throwNotification({
                                    message:t('bir_hata_olustu'),
                                    type:'error',
                                    duration:4
                                });
                            }
                            else{
                                setBooks(request.responseData.response)
                            }
                            setBookLoading(false)
                        }}
                        loading = {bookLoading}
                        options={books}
                    />

                    <ButtonComponent 
                        disabled = {selectedBook === -1}
                        onClick = { async() => {

                            if (selectedBook === -1 || Number(profileData.userID) !== Number(user.id)) {
                                return;
                            }

                            // TODO buradaki istek switch tarzı çalışır, ileride kütüphanedek kitap kaldırmak istersem ilgili yere bu butonu koyabilirim
                            const request = await apiRequest({endpoint:'/book-switch-for-profile/'+selectedBook, headers:{Authorization:user.token}});

                            if (request.error || request.responseData.status === false) {
                                throwNotification({
                                    message:t('bir_hata_olustu'),
                                    type:'error',
                                    duration:4
                                });
                            }
                            else if(request.responseData.response){
                                setProfileData({...profileData, library:[...profileData.library, request.responseData.response]})
                            }
                            else{
                                setProfileData({...profileData, library:profileData.library.filter( book => book.id !== selectedBook )})
                            }
                        }}
                    >
                        {t('kaydet')}
                    </ButtonComponent>
                    

                </Modal>
            </div>
        </Drawer>
    );
};
export default UserProfileDrawer;