import React, {useContext, createContext, useEffect } from "react";
import apiRequest from "../services";
import throwNotification from "../GeneralFunctions/throwNotification";

const ProfileContext = createContext()
const useProfile = () => {return useContext(ProfileContext)}

const ProfileContextProvider = ({children}) => {

    const [ profileData, setProfileData ] = React.useState({
        userID:-1, // hedef kullanıcı profilinin id'si
        show:false,
        currentUserIsFallow:false,
        name:'',
        surname:'',
        username:'',
        birthDate:'',
        birthPlace:'',
        password:'',
        image:'',
        livingCity:null,//ikonlu
        createdDate:'',
        biyo:'',
        sex:'',
        edu:'',
        job:'',
        badges:[],  
        liked:{ writers:[],translators:[]  },
        blogs:[],
        followers:[],
        follow:[],
        library:[],
        read:{
            readdedList:[],
            currentlyReadingList:[],
            futureReadingList:[],
            readTarget:0,
            oldReadedList:[]
        },
        store:[],
        currentUserToken:null
    })

    const data = {profileData, setProfileData};

    useEffect(() => {
        if (profileData.show && profileData.userID !== -1) {
            getProfile();
        }
    }, [profileData.userID, profileData.show]);

    const getProfile = async () => {
        // UserID'yi temizle - sadece sayıları al, özel karakterleri kaldır
        let cleanUserID = profileData.userID;
        if (cleanUserID) {
            // String'e çevir ve sadece sayıları al
            cleanUserID = String(cleanUserID).replace(/[^\d]/g, '');
        }
        
        // Geçersiz ID kontrolü
        if (!cleanUserID || cleanUserID === '' || cleanUserID === '0' || cleanUserID === '-1') {
            console.log('Geçersiz UserID:', profileData.userID, '->', cleanUserID);
            setProfileData({...profileData, userID:-1, show:false});
            return;
        }
        
        console.log('API çağrısı yapılıyor:', '/profile/' + cleanUserID);
        
        try {
            const request = await apiRequest({ 
                headers:{Authorization: profileData.currentUserToken}, 
                endpoint:'/profile/'+cleanUserID 
            });
            
        if ( request.error || !request.responseData || !request.responseData.status ) {
                throwNotification({
                    type:'error',
                    message:'Profil yüklenemedi',
                    description: 'Kullanıcı profili bulunamadı veya sunucu hatası',
                    duration:4
                });
                setProfileData({...profileData, userID:-1, show:false});
            }
            else{
                const response = request.responseData.response;
                // Güvenli veri kontrolü
                const safeResponse = {
                    ...response,
                    userID: cleanUserID, // Temizlenmiş ID'yi kaydet
                    username: response.username?.toString() || '',
                    name: response.name?.toString() || '',
                    surname: response.surname?.toString() || '',
                    biyo: response.biyo?.toString() || '',
                    createdDate: response.createdDate?.toString() || '',
                    read: response.read || {
                        readdedList: [],
                        currentlyReadingList: [],
                        futureReadingList: [],
                        readTarget: 0,
                        oldReadedList: []
                    },
                    followers: Array.isArray(response.followers) ? response.followers : [],
                    follow: Array.isArray(response.follow) ? response.follow : [],
                    library: Array.isArray(response.library) ? response.library : [],
                    badges: Array.isArray(response.badges) ? response.badges : [],
                    blogs: Array.isArray(response.blogs) ? response.blogs : [],
                    store: Array.isArray(response.store) ? response.store : []
                };
                setProfileData({...profileData, ...safeResponse})
            }
        } catch (error) {
            console.error('Profile API Error:', error);
            throwNotification({
                type:'error',
                message:'Bağlantı hatası',
                description: 'Sunucuya bağlanılamadı',
                duration:4
            });
            setProfileData({...profileData, userID:-1, show:false});
        }
    }


    return(
        <ProfileContext.Provider value={ data }>
            {children}
        </ProfileContext.Provider>
    )
}
export{
    useProfile,
    ProfileContextProvider
}