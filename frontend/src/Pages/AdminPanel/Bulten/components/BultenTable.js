import { Spin, Table } from "antd";
import { useUserAuth } from "../../../../Context/UserAuthContext";
import ButtonComponent from "../../../../GeneralComponents/ButtonComponent";
import ChangerInputComponent from "../../../../GeneralComponents/ChangerInputComponent";
import { DeleteOutlined } from "@ant-design/icons";
import apiRequest from "../../../../services";
import throwNotification from "../../../../GeneralFunctions/throwNotification";


const BultenTable = ( { loading, data, setData, query, setQuery} ) => {

    const {user} = useUserAuth();

    const columns = [
        {
            title:'ID',
            dataIndex:'id',
            render:(id) => <div key={id}>{id}</div>,
            width:'10%'
        },
        {
            title:'Mail',
            dataIndex:'mail',
            render:(mail, {id}) => <ChangerInputComponent max={255} key={id}  value={mail} action={ async ( newValue ) => { return true; }}/>,
            width:'75%'
        },
        {
            title:'#',
            render:({id}) => (
                <>
                    <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {
                        const request = await apiRequest({endpoint:'/newsletter/delete/'+id, method:'DELETE', headers:{Authorization:user.token}});
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
                            setData({...data, newsletters:data.newsletters.filter( newsletter => newsletter.id !== id )});
                            throwNotification({
                                type:'success',
                                message:'Silme İşlemi Başarılı',
                                description: 'İlgili mail bültenden başarıyla kaldırıldı.',
                                duration:3
                            });
                        }
                    }}> <DeleteOutlined/> </ButtonComponent>
                </>
            ),
            width:'15%',
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
                        dataSource={ data.newsletters.map( item => { return { ...item, key:item.id }} ) || [] }
                        pagination={{
                            total       : data.meta.filteredCount ? data.meta.filteredCount : 0,
                            position    : ['none', 'bottomRight'],
                            showSizeChanger : true,
                            current     : query ? query.page : 0,
                            pageSize    : query ? query.pagePerSize : 10,
                            onChange    : ( targetPage, pagePerSize ) => { setQuery({ ...query, page:targetPage, pagePerSize:pagePerSize }); }
                        }}
                        scroll          = { { y:600 } }
                        size            = 'medium'
                    />
                :
                    <div style={{width:'100%', height:'100%', display:'flex', justifyContent:'center', alignItems:'center'}}>
                        <Spin/>
                    </div>
            }
        </>
    )

}
export default BultenTable;
