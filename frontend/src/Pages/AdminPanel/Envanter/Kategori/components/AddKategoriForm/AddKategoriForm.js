import TextArea from "antd/es/input/TextArea";
import React from "react";
import ButtonComponent from "../../../../../../GeneralComponents/ButtonComponent";
import throwNotification from "../../../../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../../../../services";
import { useUserAuth } from "../../../../../../Context/UserAuthContext";


const AddKategoriForm = ({data, setData, query, setQuery, loading}) => {
    
    const [ newCategories, setNewCategories ] = React.useState('');
    const {user} = useUserAuth();

    return(
        <>
            <TextArea value={newCategories} placeholder={'Eklemek istediğiniz kategorileri virgülle ayırarak girin girin'} style={{ height:60, resize:'none' }} allowClear showCount maxLength={100} onChange = { e => { setNewCategories(e.currentTarget.value) } }/>
            <ButtonComponent disabled={loading} type={'primary'}  onClick = { async () => {

                const categories = newCategories.split(',').map( item => item.trim() );

                const request = await apiRequest( { endpoint:'/category/add-multiple', body:JSON.stringify({ categories:categories }), method:'POST', headers:{Authorization:user.token} } );

                if ( request.error ) {
                    throwNotification({
                        type:'error',
                        message:'Bir hata oluştu',
                        description:request.errorMessage || 'Bir hata oluştu!'
                    })
                    return;
                }                                                           
                if ( !request.responseData || !request.responseData.status ) {
                    throwNotification({
                        type:'error',
                        message:'Bir hata oluştu',
                        description:request.responseData.message || 'Bir hata oluştu!'
                    })
                    return;
                }
                const addedItems = request.responseData.response;
                const addedItemsCount = addedItems.length;

                setData( { meta:{ ...data.meta, filteredCount:data.meta.filteredCount+addedItemsCount }, categories:[...data.categories, ...addedItems] } );
                setNewCategories('');
                throwNotification({
                    type:'success',
                    message:'İşlem Başarılı',
                    description:request.responseData.message || 'Kategoriler eklendi !'
                })
            }}>Kaydet</ButtonComponent>
        </>
    )
}
export default AddKategoriForm;