import React from "react";
import {Select, Spin, Table} from 'antd';
import apiRequest from "../../../../services";
import throwNotification from "../../../../GeneralFunctions/throwNotification";
import ChangerInputComponent from "../../../../GeneralComponents/ChangerInputComponent";
import { useUserAuth } from "../../../../Context/UserAuthContext";
import ButtonComponent from "../../../../GeneralComponents/ButtonComponent";
import { DeleteOutlined } from "@ant-design/icons";


const YoutubeVideosTable = ( { loading, data, setData, query, setQuery} ) => {

    const {user} = useUserAuth();

    const update = async ({id, newValue, mode, setter = null}) => {

        const body = JSON.stringify({
            'mode'     : mode, 
            'newValue' : newValue
        });

        const request = await apiRequest({ endpoint:'/youtube/update/'+id, body:body, method:'PUT', headers:{Authorization:user.token}})
        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                duration:6,
                description: 'Güncelleme yapılırken bir hata meydana geldi',
                message:'Başarısız'                        
            });
            console.error('Error : ', request.errorMessage || request.responseData.message );
            return false;
        }
        throwNotification({
            type:'success',
            duration:3,
            description:'Güncelleme yapıldı',
            message:'Başarılı'                        
        });
        if ( !setter ) {
            setQuery({...query});
        }
        else{
            setter();
        }
       
        return true;
    }

    const columns = [
        { 
            title:'ID',
            dataIndex : 'id',
            key:'id',
            render : ( id, row ) => { return <span key={id}> {id} </span> },
            width:70,
            fixed:'left',
        },
        {
            title:'Video Başlığı',
            dataIndex : 'title',
            key:'title',
            width:200,
            fixed:'left',
            render : ( title, row ) => <ChangerInputComponent key={title} type="textarea" value={title || 'Girilmemiş'} max={255} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'İsim Boş olamaz',
                        description : 'Video Başlığı Dolu Olmalı',
                        duration    : 6
                    });
                    return false;
                }
                return await update({id:row.id, mode:'title', newValue:newValue});
            }} />
        },
        {
            title:'Gösterge Sayısı',
            dataIndex : 'view',
            key:'view',
            width:130,
            render : ( view, row ) => <Select 
                style={{width:130}}
                options = {[
                    {value:0, label:'Gösterilmiyor'}, 
                    {value:1, label:'1.Video'}, 
                    {value:2, label:'2.Video'},
                ]}
                defaultValue={view || 0}
                onChange={ async (selectedValue, fullProps) => {
                    const updateRequest = await update({id:row.id, mode:'view', newValue:selectedValue});
                    if (!updateRequest) {
                        setQuery({...query});
                    }
                }}
            />
        },
        {
            title: 'Gömülü Kod',
            dataIndex: 'embededCode',
            key: 'embededCode',
            width:300,
            render: ( embededCode, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={ embededCode || 'Girilmemiş' } max={2000} action={ async (newValue) => {
                if ( newValue.trim() === ''){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Gömülü Kod Boş olamaz',
                        description : 'Gömülü Kod dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                if ( embededCode === newValue ) {
                    return false;
                }
                return await update({id:row.id, mode:'embededCode', newValue:newValue});
            }} />
        },
        {
            title:'#',
            width:100,
            fixed:'right',
            render:({id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {
                const request = await apiRequest({endpoint:'/youtube/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});
                if ( request.error || ! request.responseData.status  ){
                    throwNotification({
                        type:'error',
                        message:'İşlem Başarısız',
                        description:request.errorMessage || request.responseData.message
                    });
                    console.error( 'Error : ', request.errorMessage || request.responseData.message );
                    return false;
                }
                throwNotification({
                    type:'success',
                    message:'Başarılı',
                    description:'Silme İşlemi Başarılı'
                });
                setQuery({...query});
            }}> <DeleteOutlined/> </ButtonComponent>},
        },
    ]

    return(
        <>
            {
                !loading
                ?
                    <Table
                        columns={columns}
                        scroll          = {{ y:600 }}
                        dataSource={ data.videos.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            showSizeChanger : true,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize });},
                        }}
                    />
                :
                <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                    <Spin/>
                </div>
            }
        </>
    )
}

export default YoutubeVideosTable;