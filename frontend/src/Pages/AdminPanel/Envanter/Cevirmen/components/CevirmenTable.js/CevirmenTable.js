import React from "react";
import { Spin, Table } from 'antd';
import ChangerInputComponent from "../../../../../../GeneralComponents/ChangerInputComponent";
import { DeleteOutlined } from "@ant-design/icons";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import ButtonComponent from "../../../../../../GeneralComponents/ButtonComponent";
import UpdatePictureComponent from '../../../../../../GeneralComponents/UpdatePictureComponent';
import apiRequest from "../../../../../../services";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";

const CevirmenTable = ( { loading, data, setData, query, setQuery, selected, setSelected } ) => {

    const {user} = useUserAuth();

    const onSelectChange = (newSelectedRowKeys, rowSelectedItems) => {
        setSelected(rowSelectedItems);
    };
    const rowSelection = {
        selected,
        onChange: onSelectChange,
    };

    const handleUpdate = async ({mode, newValue, id, setViewImg = null, setInputVal = null}) => {

        const formData = new FormData();
        formData.append('mode', mode);
        formData.append('newValue', newValue);

        const request = await apiRequest( { endpoint:'/translator/update/'+id, body:formData, method:'POST', headers:{Authorization:user.token} } );

        if ( request.error || ! request.responseData.status ){
            throwNotification({
                type        : 'error',
                message     : 'Güncelleme Başarısız',
                description : request.responseData.message || 'Çevirmen güncellemesi sırasında sunucu taraflı hata oluştu', 
                duration    : 4
            });
            request.errorMessage && console.error('Alınan Hata : ',request.errorMessage);
            return false;
        }
        else{
            throwNotification({
                type        : 'success',
                message     : 'Güncelleme Başarılı',
                description : 'Çevirmen güncelleme işlemi başarılı',
                duration    : 4
            });
            setData( { ...data, translators:data.translators.map( translator => translator.id === id ? {...request.responseData.response} : translator ) } );
            if ( setViewImg !== null ) {
                setViewImg(request.responseData.response.img)
            }
            if ( setInputVal !== null ) {
                setInputVal(newValue === 'remove' ? 'Girilmemiş' : newValue);
            }
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
            title:'İsim',
            dataIndex : 'name',
            key:'name',
            render : ( name, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={name} max={255} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'İsim Boş olamaz',
                        description : 'Çevirmen ismi mecbur dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                return await handleUpdate({ id:row.id, newValue:newValue, mode:'name' });
            }} />
        },
        {
            title: 'Biyografi',
            dataIndex: 'biyo',
            key: 'biyo',
            render: ( biyo, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={ biyo || 'Girilmemiş' } max={500} action={ async (newValue, setInputVal) => {
                if ( ! newValue ) {
                    newValue = 'remove';
                }
                return await handleUpdate({ id:row.id, newValue:newValue, mode:'biyo', setInputVal:setInputVal });
            }} />
        },
        {
            title: 'Resim',
            dataIndex: 'img',
            key: 'img',
            width:70,
            align:'center',
            render:( img, row ) => <UpdatePictureComponent key={row.id} img={img} 
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
                    await handleUpdate({id:row.id, mode:'img', newValue:file, setViewImg:setViewImg})
                    return false;
                }}
                popoverAction={ async ({setViewImg}) => {
                    if (await handleUpdate({id:row.id, mode:'img', newValue:'remove'})) {
                        setViewImg(null);
                    }
                }}
            />
        },
        {
            title: 'Doğum Tarihi',
            dataIndex: 'birthDate',
            key: 'birthDate',
            width:'10%',
            align:'center',
            render: ( birthDate, row ) => <ChangerInputComponent empty={true} type={'date'} key={row.id} value={ birthDate || 'Girilmemiş' } max={-1} action={ async (newValue, setInputVal) => {
                if ( newValue === null ){
                    if ( !birthDate ) {
                        return false;
                    }
                    newValue = 'remove';
                }
                return await handleUpdate({id:row.id, mode:'birthDate', newValue:newValue, setInputVal:setInputVal});
            }} />
        },
        {
            title: 'Ölüm Tarihi',
            dataIndex: 'deathDate',
            key: 'deathDate',
            width:'10%',
            align:'center',
            render: ( deathDate, row ) => <ChangerInputComponent empty={true} type={'date'} key={row.id} value={ deathDate || 'Girilmemiş' } max={-1} action={ async (newValue, setInputVal) => {
                if ( newValue === null ){
                    if ( !deathDate ) {
                        return false;
                    }
                    newValue = 'remove';
                }
                return await handleUpdate({id:row.id, mode:'deathDate', newValue:newValue, setInputVal:setInputVal});
            }} />
        },
        {
            title:'Aksiyonlar',
            width:'7%',
            render:({writer,id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red'}} onClick = { async () => {

                const request = await apiRequest({endpoint:'/translator/delete/'+id, headers:{Authorization:user.token}, method:'DELETE' });

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
                        bordered = { true }
                        columns={ columns }
                        dataSource={ data.translators.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            showSizeChanger : true,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize }); setSelected([]) }
                        }}
                        scroll          = { { y:600 } }
                        size            = 'small'
                        rowSelection={rowSelection}
                    />
                :
                    <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center', marginTop:20}}>
                        <Spin/>
                    </div>
            }
        </>
    )
}

export default CevirmenTable;