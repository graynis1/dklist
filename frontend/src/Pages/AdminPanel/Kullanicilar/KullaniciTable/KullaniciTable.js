import React from "react";
import throwNotification from "../../../../GeneralFunctions/throwNotification";
import { Badge, Select, Spin, Table, Tooltip } from "antd";
import { DeleteOutlined } from "@ant-design/icons"
import apiRequest from "../../../../services";
import ButtonComponent from '../../../../GeneralComponents/ButtonComponent';
import UpdatePictureComponent from '../../../../GeneralComponents/UpdatePictureComponent';
import { useUserAuth } from '../../../../Context/UserAuthContext';
import './style.css'

const KullaniciTable = ( { loading, data, setData, query, setQuery, selectOptions, selectedRows, setSelectedRows } ) => {

    const {user} = useUserAuth();

    const onSelectChange = (newSelectedRowKeys, rowSelectedItems) => {
        setSelectedRows(rowSelectedItems);
    };
    const rowSelection = {
        selectedRows,
        onChange: onSelectChange,
    };

    const [ publishers, setPublishers ] = React.useState([]);

    const getPublishers = async () => {

        const request = await apiRequest({ endpoint:'/get-all-publishers-for-user'})
        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                duration:6,
                description: request.responseData.message || 'Güncelleme yapılırken bir hata meydana geldi',
                message:'Başarısız'                        
            });
            console.error('Error : ', request.errorMessage || request.responseData.message );
        }
        else{
            setPublishers(request.responseData.response)
        }
        
    }

    React.useEffect( () => {
        getPublishers();
    }, []);

    const update = async ({id, newValue, mode, setViewImg = null, setter = null}) => {

        const formData = new FormData();
        formData.append('mode',mode);
        formData.append('newValue', newValue);
        const request = await apiRequest({ endpoint:'/user/update-user-admin/'+id, body:formData, method:'POST', headers:{Authorization:user.token}})
        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                duration:6,
                description: request.responseData.message || 'Güncelleme yapılırken bir hata meydana geldi',
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
            setData( { ...data, users:data.users.map( user => user.id === id ? {...request.responseData.response} : user ) } );
        }
        else{
            setter();
        }
        if ( setViewImg !== null ) {
            setViewImg(request.responseData.response.img);
        }
        return true;
    }
    const columns = [
        { 
            title:'ID',
            dataIndex : 'id',
            key:'id',
            render : ( id, row ) => { 
                return <span key={id}>
                        <Tooltip children={<Badge status={ row.auth ? "success" : ( row.auth === false ? "processing" : "error" )} text={id} />} title={row.auth ? "Doğrulama Yapılmış" : ( row.auth === false ? "Doğrulama Bekleniyor" : "Doğrulamada Hata Oluştu" )} />
                    </span> 
                },
            width:120,
            fixed:'left',
        },
        {
            title:'Kullanıcı Adı',
            dataIndex : 'username',
            key:'username',
            width:200,
            fixed:'left',
        },
        {
            title: 'İsim',
            dataIndex: 'name',
            key: 'name',
            width:175,
        },
        {
            title: 'Soyisim',
            dataIndex: 'surname',
            key: 'surname',
            width:175,
        },
        {
            title: 'Resim',
            dataIndex: 'img',
            key: 'img',
            width:100,
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
                    await update({id:row.id, mode:'img', newValue:file, setViewImg:setViewImg})
                    return false;
                }}
                popoverAction={ async ({setViewImg}) => {
                    if (await update({id:row.id, mode:'img', newValue:'remove'})) {
                        setViewImg(null);
                    }
                }}
            />,
        },
        {
            title:'Rozetler',
            dataIndex : 'badges',
            key:'badges',
            width:400,
            render:(badges, row) => {
                return <Select
                    style={{width:350}}
                    mode="multiple"
                    // defaultValue={ badges.length > 0 ? badges.map(badge => badge.id) : []}
                    value={[...badges.map(item => item.id)]}
                    onChange={ async (activeIDs, selectedValues) => {
                        const updateRequest = await update({
                            id:row.id, 
                            mode:'badge', 
                            newValue:JSON.stringify(activeIDs),
                            setter:() => {
                                setData({...data, users:data.users.map(item => {
                                    if ( ( item.id === row.id ) ) {
                                        return {...item, badges:selectedValues.map( selectedItem => { return {name:selectedItem.label, id:selectedItem.value, img:selectedItem.children.props.children[0].props.src } } )}
                                    }
                                    return item;
                                })})
                            }
                        });
                        if ( !updateRequest ) {
                            setQuery({...query});
                        }
                    }}
                >
                    {
                        selectOptions.badges.map( badge => {
                            return <Select.Option value={badge.id} key={badge.id} style={{ height: 50 }}>
                                <div style={{display:"flex", alignItems:'center'}}>
                                    <img alt="Resim" src={badge.image} style={{ height: 20, marginRight: 20 }}/>
                                    <span>{badge.name}</span>
                                </div>
                            </Select.Option>
                        })
                    }
                </Select>
            }
        },
        {
            title:'Mail Adresi',
            dataIndex : 'mail',
            key:'mail',
            width:250
        },
        {
            title:'Doğum Tarihi',
            dataIndex : 'birthDate',
            key:'birthDate',
            width:150,
        },
        {
            title:'Katılma Tarihi',
            dataIndex : 'createdDate',
            key:'createdDate',
            width:150,
        },
        {
            title:'Kullanıcı Tipi',
            dataIndex : 'userType',
            key:'userType',
            width:200,
            fixed:'right',
            render : ( userType, row) => <Select
                style={{width:150}}
                defaultValue={{value:userType, label:userType}}
                options={[{label:'Mod', value:'Mod'}, {label:'Admin', value:'Admin'}, {label:'Üye', value:'Üye'}, {label:'Blog Yazarı', value:'Blog_Yazari'} ]}
                onChange={ async ( selectedValue, fullProps ) => {
                    const updateRequest = await update({id:row.id, mode:'userType', newValue:selectedValue});
                    if (!updateRequest) {
                        setQuery({...query});
                    }
                }}
            />
        },
        {
            title:'Yayın Evi',
            dataIndex : 'publisher',
            key:'publisher',
            width:200,
            fixed:'right',
            render : ( publisher, row) => <Select
                style={{width:150}}
                defaultValue={{value:publisher ? publisher.value : 'remove' , label:publisher ? publisher.label : 'Seçilmemiş'}}
                options={ [ {value:'remove', label:'Seçilmemiş'} ,...publishers] || []}
                onChange={ async ( selectedValue, fullProps ) => {
                    const updateRequest = await update({id:row.id, mode:'publisher', newValue:selectedValue});
                    // if (!updateRequest) {
                    //     setQuery({...query});
                    // }
                }}
            />
        },
        {
            title:'#',
            fixed:'right',
            width:200,
            render:({disabled, id}) => { 
                return <div style={{display:'flex', flexDirection:'row'}}>
                    <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {
                        const request = await apiRequest({endpoint:'/user/delete-user-admin/'+id, method:'DELETE', headers:{Authorization:user.token}});
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
                    }}> <DeleteOutlined/> </ButtonComponent>
                    <ButtonComponent type={'primary'} style={{ backgroundColor: disabled ? 'green' : 'red' , margin:'0 5px' }} onClick = { async () => {
                        const updateRequest = await update({
                            id:id, 
                            mode:'disabled', 
                            newValue:!user.disabled,
                            setter:() => {
                                setData({...data, users:data.users.map(user => {
                                    if ( ( user.id === id ) ) {
                                        return { ...user, disabled:!user.disabled }
                                    }
                                    return user;
                                })});
                            }
                        });
                        if ( !updateRequest ) {
                            setQuery({...query});
                        }
                    } } > { disabled ? 'Yasağı Kaldır' : 'Yasakla'} </ButtonComponent>
                </div> 
            },
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
                        dataSource={ data.users.map( item => { return { ...item, key:item.id }} ) || [] }
                        rowSelection={ rowSelection }
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

export default KullaniciTable;