import React from "react";
import {Popover, Upload} from "antd";
import ButtonComponent from "./ButtonComponent";
import throwNotification from "../GeneralFunctions/throwNotification";
import { useTranslation } from "react-i18next";

const UpdatePictureComponent = ( {img, popoverAction, beforeUploadAction, removeMode = true, imageStyle= {width:40, height:40, objectFit:'contain', cursor:'pointer'} } ) => {

    const [ viewImg, setViewImg ] = React.useState(img);
    const { t } = useTranslation();

    const popoverContent = (
        <ButtonComponent style={{backgroundColor: 'red'}} onClick={ async () => { await popoverAction({setViewImg:setViewImg}); }}><span style={{ color:'white', margin:0, padding:0 }}>Resmi Kaldır</span></ButtonComponent>
    )

    const RenderUpload = () => {
        return(
            <Upload maxCount={1} showUploadList={false} beforeUpload={ async (file) => {

                if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
                    throwNotification({
                        type:'warning',
                        duration:4,
                        description:t('İzin verilen resim formatları : png, jfif, jpg, jpeg, webp'),
                    });
                }
                else{
                    await beforeUploadAction({file:file, setViewImg:setViewImg});
                }
                return false;
            }}>
                {
                    viewImg === '' || viewImg === null ?
                        <img alt='DK - List' src={'/images/nopic.jpg'} style={imageStyle}/>
                    :
                        <img alt='DK - List' src={img} style={imageStyle}/>
                }
            </Upload>
        ); 
    }

    return(
        <>
            {
                removeMode ?
                <Popover placement={"right"} content={ viewImg === '' || viewImg === null ? '' : popoverContent }>
                    {
                        RenderUpload()
                    }
                </Popover>
                :
                RenderUpload()
            }
        </>
    )
}
export default UpdatePictureComponent;