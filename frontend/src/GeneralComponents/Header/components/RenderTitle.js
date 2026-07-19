import React from "react";
import { BookOutlined, EditOutlined, HomeOutlined, UserOutlined, ZhihuOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";


const RenderTitle = (title, type) => {
    
    const { t } = useTranslation();
    
    return <div key={type} style={{display:'flex', flexDirection:'row', justifyContent:'space-between'}}>
        <span>{t(title)}</span>
        <span>
            {
                type === 'user'
                ?
                <UserOutlined />
                :
                (
                    type === 'writer'
                    ?
                    <EditOutlined />
                    :
                    (
                        type === 'translator'
                        ?
                        <ZhihuOutlined/>
                        :
                        (
                            type === 'book'
                            ?
                            <BookOutlined/>
                            :
                            <HomeOutlined/>
                        )
                    )

                )
            }
        </span>
    </div>
};
export default RenderTitle;