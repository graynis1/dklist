import React from "react";
import { useProfile } from "../../../Context/UserProfileContext";
import { useTranslation } from "react-i18next";
import { Avatar, Tooltip } from "antd";




const BadgeContainer = () => {

    const { profileData } = useProfile();
    const {i18n} = useTranslation();

    return(
        <div className="badgeContainer">
            {
                profileData.badges && profileData.badges.map( (badge,index) => {
                    return(
                        <Tooltip
                            key={index}
                            title={ i18n.language==='tr' ? badge.name + ' - ' + badge.comment :  badge.nameUS + ' - ' + badge.commentUS }
                        >
                            <Avatar
                                size={"large"}
                                src={badge.image}
                            />
                        </Tooltip>
                    );
                })
            }
        </div>
    );
}

export default BadgeContainer;