import React from "react";
import {Spin, Table} from 'antd';
import ButtonComponent from "../../../../../../GeneralComponents/ButtonComponent";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import {DeleteOutlined} from "@ant-design/icons";
import ChangerInputComponent from "../../../../../../GeneralComponents/ChangerInputComponent";
import UpdatePictureComponent from "../../../../../../GeneralComponents/UpdatePictureComponent";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";
import apiRequest from "../../../../../../services";

const YazarTable = ( { loading, data, setData, query, setQuery, selected, setSelected } ) => {

    const {user} = useUserAuth();
    const onSelectChange = (newSelectedRowKeys, rowSelectedItems) => {
        setSelected(rowSelectedItems);
    };
    const rowSelection = {
        selected,
        onChange: onSelectChange,
    };

    const columns = [
        { 
            title:'ID',
            dataIndex : 'id',
            key:'id',
            render : ( id ) => { return <span key={id} >{id}</span> },
            width:'10%'
        },
        {
            title:'İsim',
            dataIndex : 'name',
            key:'name',
            render : ( name, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={name} value={name} max={50} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'İsim Boş olamaz',
                        description : 'Yazar ismi mecbur dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                const body = JSON.stringify({ mode:'name', newValue:newValue });
                const request = await apiRequest( { endpoint:'/writer/update/'+row.id, body:body, method:'PUT', headers:{Authorization:user.token} } );
                if ( request.error || ! request.responseData.status ){
                    throwNotification({
                        type        : 'error',
                        message     : 'Güncelleme Başarısız',
                        description : request.errorMessage || request.responseData.message,
                        duration    : 4
                    });
                    return false;
                }
                else{
                    throwNotification({
                        type        : 'success',
                        message     : 'Güncelleme Başarılı',
                        description : 'Yazar güncelleme işlemi başarılı',
                        duration    : 4
                    });
                    setData( { ...data, writers:data.writers.map( writer => {
                        if ( writer.id !== row.id ) {
                            return writer;
                        }
                        else{
                            return({ ...writer, name:newValue });
                        }
                    } ) } );
                    return true;
                }
            }} />
        },
        {
            title: 'Doğum Tarihi',
            dataIndex: 'date',
            key: 'date',
            width:'20%',
            render: ( date, row ) => <ChangerInputComponent empty={true} type={'date'} key={row.id} value={ date || 'Girilmemiş' } max={-1} action={ async (newValue, setNewValue) => {
                
                if ( newValue === null ){
                    if ( !date ) {
                        return false;
                    }
                    newValue = 'remove';
                }

                const body = JSON.stringify({ mode:'date', newValue:newValue });
                const request = await apiRequest( { endpoint:'/writer/update/'+row.id, body:body, method:'PUT', headers:{Authorization:user.token} } );

                if ( request.error || ! request.responseData.status ){
                    throwNotification({
                        type        : 'error',
                        message     : 'Güncelleme Başarısız',
                        description : request.errorMessage || request.responseData.message,
                        duration    : 4
                    });
                    return false;
                }
                else{
                    throwNotification({
                        type        : 'success',
                        message     : 'Güncelleme Başarılı',
                        description : 'Yazar güncelleme işlemi başarılı',
                        duration    : 4
                    });
                    setData({ ...data, writers: data.writers.map( writer => {
                        if ( writer.id === row.id ) {
                            writer.date = newValue === 'remove' ? 'Girilmemiş' : newValue ;
                        }
                        return writer;
                    })});
                    setNewValue(newValue === 'remove' ? 'Girilmemiş' : newValue)
                    return true;
                }
            }} />
        },
        {
            title: 'Biyografi',
            dataIndex: 'biyo',
            key: 'biyo',
            render: ( biyo, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={biyo || 'Girilmemiş'} max={500} action={ async (newValue, setInputVal) => {

                if ( ! newValue ){
                    if ( ! biyo  ) {
                        return false;
                    }
                    newValue = 'remove';
                }
                else if( newValue === biyo ){
                    return false;
                }

                const body = JSON.stringify({ mode:'biyo', newValue:newValue });
                const request = await apiRequest( { endpoint:'/writer/update/'+row.id, body:body, method:'PUT', headers:{Authorization:user.token} } );

                if ( request.error || ! request.responseData.status ){
                    throwNotification({
                        type        : 'error',
                        message     : 'Güncelleme Başarısız',
                        description : request.errorMessage || request.responseData.message,
                        duration    : 4
                    });
                    return false;
                }
                else{
                    throwNotification({
                        type        : 'success',
                        message     : 'Güncelleme Başarılı',
                        description : 'Yazar güncelleme işlemi başarılı',
                        duration    : 4
                    });
                    setData( { ...data, writers:data.writers.map( writer => {
                        if ( writer.id !== row.id ) {
                            return writer;
                        }
                        else{
                            return({ ...writer, biyo:newValue === 'remove' ? 'Girilmemiş' : newValue });
                        }
                    } ) } );
                    setInputVal(newValue === 'remove' ? 'Girilmemiş' : newValue);
                    return true;
                }
            }} />
        },
        {
            title: 'Resim',
            dataIndex: 'img',
            key: 'img',
            render:( img, row ) => <UpdatePictureComponent img={img} 
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
                    const request = await apiRequest({ endpoint:'/writer/update/image/'+row.id, body:formData, headers:{Authorization:user.token}, method:'POST' });
                    if ( request.error || !request.responseData.status ){
                        throwNotification({
                            type:'error',
                            duration:5,
                            message:'Resim güncellenirken hata oluştu',
                            description:request.errorMessage || request.responseData.message
                        });
                    }
                    else{
                        throwNotification({
                            type:'success',
                            duration:3,
                            message:'Resim güncellendi',
                            description:request.responseData.message
                        });
                        setData({ ...data, writers : data.writers.map( writer => {
                                if (writer.id === row.id) {
                                    writer.img = request.responseData.response;
                                }
                                return writer;
                            })
                        });
                        setViewImg(request.responseData.response);
                    }
                    return false;
                }}
                popoverAction={ async ({setViewImg}) => {
                
                    const request = await apiRequest({ endpoint:'/writer/update/'+row.id, body:JSON.stringify({mode:'removeImage', newValue:'removeImage'}), method:'PUT', headers:{Authorization:user.token} });

                    if ( request.error || !request.responseData.status ){
                        throwNotification({
                            type:'error',
                            duration:5,
                            message:'Resim kaldırılırken hata oluştu',
                            description:request.errorMessage || request.responseData.message
                        });
                    }
                    else{
                        throwNotification({
                            type:'success',
                            duration:3,
                            message:'Resim kaldırıldı',
                            description:request.responseData.message
                        });
                        setViewImg(null);
                    }
                }}
            />,
            width:'10%'
        },
        {
            title:'Aksiyonlar',
            width:'15%',
            render:({writer,id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red'}} onClick = { async () => {

                const request = await apiRequest({endpoint:'/writer/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});

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
                        style           = { { width:800 } }
                        scroll          = { { y:600 } }
                        size            = 'small'
                        rowSelection={rowSelection}
                        dataSource={ data.writers.map( item => { return { ...item, key:item.id }} ) || [] }
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

export default YazarTable;