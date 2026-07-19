import React from "react";
import { Spin, Table } from 'antd';
import {DeleteOutlined} from "@ant-design/icons";
import ChangerInputComponent from "../../../../../GeneralComponents/ChangerInputComponent";
import ButtonComponent from "../../../../../GeneralComponents/ButtonComponent";
import throwNotification from "../../../../../GeneralFunctions/throwNotification";
import UpdatePictureComponent from "../../../../../GeneralComponents/UpdatePictureComponent";
import { useUserAuth } from "../../../../../Context/UserAuthContext";
import apiRequest from "../../../../../services";

const RozetTable = ( { loading, data, setData, query, setQuery, selected, setSelected } ) => {

    const {user} = useUserAuth();
    const onSelectChange = (newSelectedRowKeys, rowSelectedItems) => {
        setSelected(rowSelectedItems);
    };
    const rowSelection = {
        selected,
        onChange: onSelectChange,
    };

    const handleUpdate = async ({mode, newValue, id}) => {

        const formData = new FormData();
        formData.append( mode, newValue);
        formData.append('mode', mode);

        const request = await apiRequest({endpoint:'/badge/update/'+id, body:formData, method:'POST', headers:{Authorization:user.token}});

        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: request.responseData ?  request.responseData.message : 'Rozet güncellenirken sunucu taraflı hata oluştu ',
                duration:3
            });
            request.errorMessage && console.error('Alınan hata : ', request.errorMessage );
            return false;
        }
        else{
            throwNotification({
                type:'success',
                message:'İşlem Başarılı',
                description: 'Rozet Güncelleme İşlemi Başarılı',
                duration:3
            });
            setData({ ...data, badges: data.badges.map( badge => {
                if ( badge.id === id ) {
                    badge = request.responseData.response
                }
                return badge;
            })});
            return true;
        }
    }

    const columns = [
        {
            title:'ID',
            dataIndex : 'id',
            key:'id',
            render : ( id ) => { return <span key={id} >{id}</span> },
            width:'10%'
        },
        {
            title:'Rozet İsmi',
            dataIndex : 'name',
            key:'name',
            render : ( name, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={name} value={name} max={50} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Rozet adı boş olamaz',
                        description : 'Rozet adı mecbur dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }

                return await handleUpdate({mode:'name', newValue:newValue, id:row.id});
            }} />
        },
        {
            title:'Rozet İsmi İngilizce',
            dataIndex : 'nameUS',
            key:'nameUS',
            render : ( nameUS, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={nameUS || 'Girilmemiş'} max={50} action={ async (newValue) => {
                return await handleUpdate({mode:'nameUS', newValue:newValue, id:row.id});
            }} />
        },
        {
            title:'Rozet Açıklaması',
            dataIndex : 'comment',
            key:'comment',
            render : ( comment, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={comment} value={comment} max={255} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Rozet açıklaması boş olamaz',
                        description : 'Rozet açıklaması mecbur dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                return await handleUpdate({mode:'comment', newValue:newValue, id:row.id});
            }} />
        },
        {
            title:'Rozet Açıklaması İngilizce',
            dataIndex : 'commentUS',
            key:'commentUS',
            render : ( commentUS, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={commentUS || 'Girilmemiş' } max={255} action={ async (newValue) => {
                return await handleUpdate({mode:'commentUS', newValue:newValue, id:row.id});
            }} />
        },
        {
            title: 'Resim',
            dataIndex: 'img',
            key: 'img',
            render:( img, row ) => <UpdatePictureComponent img={img} removeMode={false}
                beforeUploadAction={ async ({file, setViewImg}) => {
                    if ( ! ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ){
                        throwNotification({
                            type:'warning',
                            duration:4,
                            description:'İzin verilen resim formatları : png, jfif, jpg, jpeg, webp',
                            message: 'Yanlış dosya formatı'
                        });
                        return false;
                    }
                    const formData = new FormData();
                    formData.append('img', file);
                    formData.append('mode', 'img');

                    const request = await apiRequest({endpoint:'/badge/update/'+row.id, body:formData, method:'POST', headers:{Authorization:user.token}});

                    if ( request.error || !request.responseData.status ) {
                        throwNotification({
                            type:'error',
                            message:'Bir hata oluştu',
                            description: request.responseData ?  request.responseData.message : 'Rozet güncellenirken sunucu taraflı hata oluştu ',
                            duration:3
                        });
                        request.errorMessage && console.error('Alınan hata : ', request.errorMessage );
                    }
                    else{
                        throwNotification({
                            type:'success',
                            message:'İşlem Başarılı',
                            description: 'Rozet Güncelleme İşlemi Başarılı',
                            duration:3
                        });
                        setData({ ...data, badges: data.badges.map( badge => {
                            if ( badge.id === row.id ) { badge = request.responseData.response }
                            return badge;
                        })});
                    }
                    return false;
                }}
            />,
            width:'10%'
        },
        {
            title:'Aksiyonlar',
            width:'15%',
            render:({id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red'}} onClick = { async () => {

                const request = await apiRequest({endpoint:'/badge/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});
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
                        scroll          = { { y:600 } }
                        rowSelection={rowSelection}
                        dataSource={ data.badges.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            showSizeChanger : true,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize }); setSelected([]) }
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

export default RozetTable;