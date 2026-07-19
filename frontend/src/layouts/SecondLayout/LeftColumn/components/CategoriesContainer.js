import { Badge, Spin } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import apiRequest from "../../../../services";
import throwNotification from "../../../../GeneralFunctions/throwNotification";

const CategoriesContainer = () => {

    const [loading, setLoading] = React.useState(false);
    const [categories, setCategories] = React.useState([]) 
    const { t, i18n } = useTranslation();

    const getCategories = React.useCallback( async () => {

        setLoading(true);
        
        const request = await apiRequest({endpoint:'/category/get-for-client'});

        if ( request.error || !request.responseData || !request.responseData.status ) {
            throwNotification({
                type:'error',
                message:'Bir hata oluştu',
                description: (request.responseData && request.responseData.message) ? request.responseData.message : 'Sunucu taraflı bir hata oluştu',
                duration:3
            });
            console.error('Alınan hata : ', request.errorMessage);
        }
        else{
            setCategories(request.responseData.response);
        }

        setLoading(false);

    }, []);


    React.useEffect(() => {
        getCategories();
    }, [getCategories])

    return(
        <>
            {
                loading ?
                <Spin style={{margin:'20px 0'}}/>
                :
                <div className='categoriesContainer dkBox'>
                    <h3 style={{color:'#424242'}}>{t('kategoriler')}</h3>
                    <span style={{width:'100%', height:1, display:'block', backgroundColor:'var(--dkGray)', margin:'10px auto'}}></span>
                    {
                        categories.map( (item) => {
                            return(
                                <NavLink 
                                    key={item.id}
                                    className={'categoriesItem'} 
                                    to={t('/kitaplar')+'/'+ (i18n.language === 'tr' ? item.slugTR : item.slugEN) }
                                    state={{categoryID:item.id, name:i18n.language === 'tr' ? item.categoryTR : item.categoryEN}}
                                >
                                    {
                                        i18n.language === 'tr' ? item.categoryTR : item.categoryEN
                                    } 
                                    <Badge count={item.bookCount} overflowCount={10000}/>
                                </NavLink>
                            );
                        })
                    }
                </div>
            }
        </>
    )
}
export default React.memo(CategoriesContainer);