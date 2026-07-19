import React from "react";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import { faCakeCandles, faUserGraduate, faLocationDot, faCalendarDays,  } from '@fortawesome/free-solid-svg-icons';
import { useProfile } from "../../../Context/UserProfileContext";
import { useTranslation } from "react-i18next";
const UserBiyoComponent = () => {
    const { profileData } = useProfile(); 
    const { t } = useTranslation();
    
    return(
        <div className="userBiyoContainer">
            <span>{'@'+(profileData.username || '')}</span>
            {
                profileData.name && <span>{ profileData.surname ? profileData.name + ' ' + profileData.surname : profileData.name } </span>
            }
            {
                profileData.edu &&<span><FontAwesomeIcon style={{marginRight:10}} icon={faUserGraduate}/>{profileData.edu}</span>
            }
            {
                (profileData.birthDate || profileData.birthPlace) && <span><FontAwesomeIcon style={{marginRight:10}} icon={faCakeCandles}/> { profileData.birthDate && profileData.birthPlace ? profileData.birthDate + ' ' +  profileData.birthPlace : profileData.birthDate ? profileData.birthDate : profileData.birthPlace} </span>
            }
            {
                profileData.livingCity && <span><FontAwesomeIcon style={{marginRight:10}} icon={faLocationDot}/> {profileData.livingCity}</span>
            }
            <span><FontAwesomeIcon style={{marginRight:10}} icon={faCalendarDays}/> {(profileData.createdDate || '')+' '+t('tarihindekatildi')} </span>
            <span>{profileData.biyo || ''}</span>
        </div>
    )
}

export default UserBiyoComponent;