import React from "react";
import { Spin, Table } from 'antd';
import ChangerInputComponent from "../../../../../../GeneralComponents/ChangerInputComponent";
import { DeleteOutlined } from "@ant-design/icons";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import ButtonComponent from "../../../../../../GeneralComponents/ButtonComponent";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";
import apiRequest from "../../../../../../services";

const YayinEviTable = ( { loading, data, setData, query, setQuery, selected, setSelected } ) => {

    const {user} = useUserAuth()
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
            width:'20%',
            render : ( id ) => { return <span key={id} >{id}</span> }
        },
        {
            title:'Yayın Evi',
            dataIndex : 'name',
            key:'name',
            render : ( name, {id} ) => <ChangerInputComponent max={255} key={id} type="input" value={name} action={ async ( newValue ) => {

                const request = await apiRequest({endpoint:'/publisher/update/'+id, body:JSON.stringify({newPublisher:newValue}), method:'PUT', headers:{Authorization:user.token}});

                if ( request.error || ! request.responseData.status  ){
                    throwNotification({
                        type:'error',
                        message:'Güncelleme esnasında bir hata oluştu',
                        description:request.errorMessage || request.responseData.message
                    });
                    console.error( 'Error : ', request.errorMessage || request.responseData.message );
                    return false;
                }
                throwNotification({
                    type:'success',
                    message:'Başarılı',
                    description:'Yayınevi Güncelleme İşlemi Başarılı'
                });
                setData({ ...data, publishers:data.publishers.map( item => {
                    if ( item.name === name ) {
                        return { id:item.id, name:newValue }
                    }
                    return item;
                } )});
                return true;
            }}/>
        },
        {
            title:'Aksiyonlar',
            render:({name,id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red'}} onClick = { async () => {
                
                const request = await apiRequest({endpoint:'/publisher/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});

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
                setSelected([]);
            }}> <DeleteOutlined/> </ButtonComponent>},
            width:'20%',
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
                        dataSource={ data.publishers.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            showSizeChanger : true,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize }); setSelected([]) }
                        }}
                        style           = { { width:800 } }
                        scroll          = { { y:600 } }
                        size            = 'medium'
                        // rowSelection={rowSelection}
                        rowSelection={null}
                    />
                :
                    <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                        <Spin/>
                    </div>
            }
        </>
    )
}

export default YayinEviTable;