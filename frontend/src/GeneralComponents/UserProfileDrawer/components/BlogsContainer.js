import React from "react";
import { useProfile } from "../../../Context/UserProfileContext";
import { useTranslation } from "react-i18next";
import { Avatar, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";

const BlogContainer = () => {

    const { profileData } = useProfile();
    const {t} = useTranslation();
    const navigate = useNavigate();

    return(
        <div className="blogProfileContainer">

            <div style={{fontSize:20, lineHeight:'40px', marginBottom:20}}>{t('bloglari')}</div>

            {
                profileData.blogs && profileData.blogs.map( (blog,index) => {
                    return(
                        <div className="blogProfileItem" key={blog.id} onClick={ () => { navigate(t('/blog')+'/'+blog.slug) }}>
                            <div className="blogProfilePicture">
                                <img alt='DK List Profile Blog Pic' src={ blog.image || '/images/nopic.png'}/>
                            </div>

                            <div style={{marginBottom:15}}>
                                <span style={{cursor:'pointer', fontWeight:600}}>{blog.title}</span>
                            </div>

                        </div>
                    );
                })
            }
        </div>
    );
}

export default BlogContainer;