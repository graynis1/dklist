import React from 'react'
import {Spin, Table} from "antd";
import ButtonComponent from '../../../../../../GeneralComponents/ButtonComponent';
import ChangerInputComponent from '../../../../../../GeneralComponents/ChangerInputComponent';
import { DeleteOutlined } from '@ant-design/icons';
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import apiRequest from '../../../../../../services';
import { useUserAuth } from '../../../../../../Context/UserAuthContext';


const KategoriTable = ( { loading, data, setData, query, setQuery, selected, setSelected } ) => {

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
            dataIndex:'id',
            render:(id) => <div key={id}>{id}</div>,
            width:'20%',
        },
        {
            title:'Kategori',
            dataIndex:'category',
            render:(category, {id}) => <ChangerInputComponent max={100} key={id}  value={category} action={ async ( newValue ) => {

                const request = await apiRequest({endpoint:'/category/update/'+id, body:JSON.stringify({newValue:newValue, mode:'tr'}), method:'PUT', headers:{Authorization:user.token}});

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
                    description:'Kategori Güncelleme İşlemi Başarılı'
                });
                setData({ ...data, categories:data.categories.map( item => {
                    if ( item.category === category ) {
                        return { id:item.id, category:newValue }
                    }
                    return item;
                } )});
                return true;
            }}/>
        },
        {
            title:'İngilizce',
            dataIndex:'categoryUS',
            render:(categoryUS, {id}) => <ChangerInputComponent max={100} key={id}  value={categoryUS || 'Girilmemiş'} action={ async ( newValue ) => {

                const request = await apiRequest({endpoint:'/category/update/'+id, body:JSON.stringify({newValue:newValue, mode:'us'}), method:'PUT', headers:{Authorization:user.token}});

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
                    description:'Kategori Güncelleme İşlemi Başarılı'
                });
                setData({ ...data, categories:data.categories.map( item => {
                    if ( item.categoryUS === categoryUS ) {
                        return { id:item.id, category:item.category, categoryUS:newValue }
                    }
                    return item;
                } )});
                return true;
            }}/>
        },
        {
            title:'#',
            render:({id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {

                const request = await apiRequest({endpoint:'/category/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});

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
            width:70,
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
                        dataSource={ data.categories.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            showSizeChanger : true,
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize }); setSelected([]) }
                        }}
                        style           = { { width:800 } }
                        scroll          = { { y:600 } }
                        size            = 'medium'
                        rowSelection={rowSelection}
                    />
                :
                    <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                        <Spin/>
                    </div>
            }
        </>
    )

}
export default KategoriTable;
