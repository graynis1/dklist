import React from "react";
import {Select, Spin, Table, Tooltip} from 'antd';
import ButtonComponent from "../../../../../../GeneralComponents/ButtonComponent";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import {DeleteOutlined, StarOutlined} from "@ant-design/icons";
import ChangerInputComponent from "../../../../../../GeneralComponents/ChangerInputComponent";
import UpdatePictureComponent from "../../../../../../GeneralComponents/UpdatePictureComponent";
import apiRequest from "../../../../../../services";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";


const KitapTable = ( { loading, data, setData, query, setQuery, selectOptions, setSelectOptions} ) => {

    const {user} = useUserAuth();

    const update = async ({id, newValue, mode, setViewImg = null, setter = null}) => {
        const formData = new FormData();
        formData.append('mode',mode);
        formData.append('newValue', newValue);
        const request = await apiRequest({ endpoint:'/book/update/'+id, body:formData, method:'POST', headers:{Authorization:user.token}})
        if ( request.error || !request.responseData.status ) {
            throwNotification({
                type:'error',
                duration:6,
                description: request.responseData.message,
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
            setData( { ...data, books:data.books.map( book => book.id === id ? {...request.responseData.response} : book ) } );
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
            render : ( id, row ) => { return <span key={id}> {id} {row.isOriginal && <Tooltip children={<StarOutlined/>} title='Bu orjinal kayıttır' />}  </span> },
            width:120,
            fixed:'left',
        },
        {
            title:'Kitap Adı',
            dataIndex : 'name',
            key:'name',
            width:200,
            fixed:'left',
            render : ( name, row ) => <ChangerInputComponent key={name} type="textarea" value={name || 'Girilmemiş'} max={150} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'İsim Boş olamaz',
                        description : 'Kitap adı dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                return await update({id:row.id, mode:'name', newValue:newValue});
            }} />
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
            title:'Dil',
            dataIndex : 'lang',
            key:'lang',
            width:150,
            render : ( lang, row ) => <Select 
                style={{width:100}}
                options = {[
                    {value:'Türkçe', label:'Türkçe'}, 
                    {value:'İngilizce', label:'İngilizce'},
                    {value:'Hintçe', label:'Hintçe'},
                    {value:'İspanyolca', label:'İspanyolca'},
                    {value:'Fransızca', label:'Fransızca'},
                    {value:'Arapça', label:'Arapça'},
                    {value:'Bengalce', label:'Bengalce'},
                    {value:'Portekizce', label:'Portekizce'},
                    {value:'Rusça', label:'Rusça'},
                    {value:'Almanca', label:'Almanca'},
                    {value:'Japonca', label:'Japonca'},
                    {value:'Çince', label:'Çince'},
                    {value:'İtalyanca', label:'İtalyanca'},
                    {value:'Korece', label:'Korece'},
                    {value:'Farsça', label:'Farsça'},
                    {value:'Lehçe', label:'Lehçe'},
                    {value:'Yunanca', label:'Yunanca'},
                    {value:'Bulgarca', label:'Bulgarca'},
                    {value:'Danca', label:'Danca'},
                    {value:'Felemenkçe', label:'Felemenkçe'},
                    {value:'Macarca', label:'Macarca'},
                    {value:'Çekçe', label:'Çekçe'},
                ]}
                defaultValue={row.lang}
                onChange={ async (selectedValue, fullProps) => {
                    const updateRequest = await update({id:row.id, mode:'lang', newValue:selectedValue});
                    if (!updateRequest) {
                        setQuery({...query});
                    }
                }}
            />
        },
        {
            title:'Sayfa Sayısı',
            dataIndex : 'pageNumber',
            key:'pageNumber',
            width:150,
            render : ( pageNumber, row ) => <ChangerInputComponent type="number" key={row.id} value = {pageNumber || -1} action={ async (newValue) => {
                if ( pageNumber === newValue ) {
                    return false;
                }
                return await update({id:row.id, mode:'pageNumber', newValue:newValue});
            }} />
        },
        {
            title: 'Kitap Açıklaması',
            dataIndex: 'content',
            key: 'content',
            width:250,
            render: ( content, row ) => <ChangerInputComponent empty={true} type={'textarea'} key={row.id} value={content || 'Girilmemiş'} max={1000} action={ async (newValue) => {
                if ( newValue.trim() === ''){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Kitap Açıklaması Boş olamaz',
                        description : 'Kitap Açıklaması dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                if ( content === newValue ) {
                    return false;
                }
                return await update({id:row.id, mode:'content', newValue:newValue});
            }} />
        },
        {
            title:'Kategori',
            dataIndex : 'categories',
            key:'categories',
            width:240,
            render : ( categories, row ) => <Select 
                mode='multiple'
                showSearch = { false }
                style={{width:200}}
                options={ selectOptions.categories.map( item => {return { value:item.id, label:item.name }} ) }
                value = {[...categories.map(item => item.id)]}
                onChange={ async (activeIDs,selectedValues) => {
                    if ( selectedValues.length < 1 ) {
                        throwNotification({
                            description:'En az bir kategori seçili olmalı!',
                            type:'warning',
                            duration:4
                        })
                        return;
                    }
                    return await update({
                        id:row.id, 
                        mode:'category', 
                        newValue:JSON.stringify(activeIDs),
                        setter:() => {
                            // setData({...data, books:data.books.map(item => {
                            //     if ( ( item.id === row.id ) || ( row.isOriginal && item.parentID === row.id ) || (row.parentID === item.id || item.parentID === row.parentID) ) {
                            //         return {...item, categories:selectedValues.map( selectedItem => { return {category:selectedItem.label, id:selectedItem.value} } )}
                            //     }
                            //     return item;
                            // })})
                            setQuery({...query});
                        }
                    });
                }}
            />
        },
        {
            title:'Yazarlar',
            dataIndex : 'writers',
            key:'writers',
            width:240,
            render : ( writers, row ) => {

                return <Select 
                mode='multiple'
                style={{width:200}}
                showSearch
                filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={ selectOptions.writers.map( item => {return { value:item.id, label:item.name }} ) }
                value = {[...writers.map(item => item.id)]}
                onChange={ async (activeIDs,selectedValues) => {
                    if ( selectedValues.length < 1 ) {
                        throwNotification({
                            description:'En az bir yazar seçili olmalı!',
                            type:'warning',
                            duration:4
                        })
                        return;
                    }
                    return await update({
                        id:row.id, 
                        mode:'writer', 
                        newValue:JSON.stringify(activeIDs),
                        setter:() => { 
                            setQuery({...query});
                        }
                    });
                }}
            />
            }
        },
        {
            title:'Çevirmenler',
            dataIndex : 'translators',
            key:'translators',
            width:240,
            render : ( translators, row ) => <Select 
                mode='multiple'
                allowClear
                showSearch
                filterOption ={ (input, option) =>(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                style={{width:200}}
                options={ selectOptions.translators.map( item => {return { value:item.id, label:item.name }} ) }
                value = {translators.map(item => item.id)}
                onChange={ async (activeIDs,selectedValues) => {
                    return await update({
                        id:row.id, 
                        mode:'translator', 
                        newValue:JSON.stringify(activeIDs),
                        setter:() => {
                            setData({...data, books:data.books.map(item => {
                                if ( item.id === row.id ) {
                                    return {...item, translators:selectedValues.map( selectedItem => { return {category:selectedItem.label, id:selectedItem.value} } )}
                                }
                                return item;
                            })});
                        }
                    });
                }}
            />
        },
        {
            title:'Kitap Formatı',
            dataIndex : 'format',
            key:'format',
            width:200,
            render : ( format, row ) => <ChangerInputComponent type="textarea" empty={true} key={row.id} value={format || 'Girilmemiş'} max={50} action={ async (newValue) => {
                if ( newValue.trim() === '' ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Format Boş olamaz',
                        description : 'Format dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                return await update({id:row.id, mode:'format', newValue:newValue});
            }} />
        },
        {
            title:'ISBN',
            dataIndex : 'isbn',
            key:'isbn',
            width:150,
            render : ( isbn, row ) => <ChangerInputComponent type="textarea" empty={true} key={row.id} value={isbn || 'Girilmemiş'} max={50} action={ async (newValue, setInputVal) => {
                if ( ! newValue ){
                    if ( ! isbn  ) {
                        return false;
                    }
                    newValue = 'remove';
                    setInputVal('Girilmemiş');
                }
                else if( newValue === isbn ){
                    return false;
                }
                return await update({id:row.id, mode:'isbn', newValue:newValue});
            }} />
        },
        {
            title: 'Basım Tarihi',
            dataIndex: 'date',
            key: 'date',
            width:200,
            render: ( date, row ) => <ChangerInputComponent empty={true} type={'date'} key={row.id} value={ date || 'Girilmemiş' } max={-1} action={ async (newValue, setNewValue) => {
                if ( ! newValue ){
                    throwNotification({
                        type        : 'warning',
                        message     : 'Basım Tarihi Boş olamaz',
                        description : 'Basım Tarihi dolu olmalıdır !',
                        duration    : 6
                    });
                    return false;
                }
                return await update({id:row.id, mode:'date', newValue:newValue});
            }} />
        },
        {
            title:'Onay',
            dataIndex : 'approved',
            key:'approved',
            width:150,
            fixed:'right',
            render : ( approved, row ) => <Select 
                style={{width:125}}
                options = {[
                    {value:1, label:'Onaylı'}, 
                    {value:0, label:'Onay Bekliyor'},
                ]}
                defaultValue={row.approved ? 1 : 0}
                onChange={ async (selectedValue, fullProps) => {
                    const updateRequest = await update({id:row.id, mode:'approve', newValue:selectedValue === 1 ? true : false });
                    if (!updateRequest) {
                        setQuery({...query});
                    }
                }}
            />
        },
        {
            title:'#',
            width:100,
            fixed:'right',
            render:({id}) => { return <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {
                const request = await apiRequest({endpoint:'/book/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});
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
                        dataSource={ data.books.map( item => { return { ...item, key:item.id }} ) || [] }
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

export default KitapTable;