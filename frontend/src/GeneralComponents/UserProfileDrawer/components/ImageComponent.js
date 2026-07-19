import { Image, Tooltip, Upload } from "antd";
import React from "react";
import throwNotification from '../../../GeneralFunctions/throwNotification';
import { t } from "i18next";
import { useUserAuth } from "../../../Context/UserAuthContext";
import { useProfile } from "../../../Context/UserProfileContext";
import apiRequest from "../../../services";


const ImageComponent = ({image}) => {

    const [imageUrl, setImageUrl]   = React.useState(image);
    const [loading, setLoading]     = React.useState(false);
    const { user }                  = useUserAuth();
    const { profileData }           = useProfile();
    
    React.useEffect(() => {
        setImageUrl(image)
    }, [image])

    return(
        <div style={{width:'min-content'}}>
            {
                Number(user.id) === Number(profileData.userID) ?
                <Tooltip title={t('resimdegistir')}>
                    <Upload
                        name="avatar"
                        listType="picture-circle"
                        showUploadList={false}
                        style={{borderRadius:'100%'}}
                        beforeUpload={ async (file) => {
                            if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
                                throwNotification({
                                    type:'warning',
                                    duration:4,
                                    description:t('İzin verilen resim formatları : png, jfif, jpg, jpeg, webp'),
                                });
                            }
                            else{
                                const formData = new FormData();
                                formData.append('img', file);
                                const request = await apiRequest({headers:{Authorization:user.token}, endpoint:'/update-profile-pic', method:'POST', body:formData});
                                if ( request.error || !request.responseData || !request.responseData.status ) {
                                    throwNotification({
                                        description:t('bir_hata_olustu'),
                                        type:'error',
                                        duration:2
                                    });
                                }
                                else{
                                    setImageUrl(request.responseData.response);
                                }
                            }
                            return false;
                        }}
                    >
                        <img src={imageUrl || '/images/nopic2.png'} alt="avatar" style={{width:'100%', borderRadius:'100%', height:'100%', objectFit:'cover'}}/>
                    </Upload>
                </Tooltip>
                :
                <Image src={imageUrl || '/images/nopic2.png'} alt="avatar" style={{width:100, borderRadius:'100%', height:100, objectFit:'cover'}}/>

            }
        </div>
    )
}
export default ImageComponent;