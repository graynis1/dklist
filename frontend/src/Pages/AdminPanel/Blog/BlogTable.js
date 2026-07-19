import { Select, Spin, Table } from "antd";
import { useUserAuth } from "../../../Context/UserAuthContext";
import throwNotification from "../../../GeneralFunctions/throwNotification";
import apiRequest from "../../../services";
import ButtonComponent from "../../../GeneralComponents/ButtonComponent";
import { DeleteOutlined } from "@ant-design/icons";


const BlogTable = ( { loading, data, setData, query, setQuery} ) => {

    const {user} = useUserAuth();

    const update = async ({ id, selected }) => {

        const body = JSON.stringify({selected:selected ? 'approve' : 'reject' });
        const request = await apiRequest({endpoint:'/blog/'+id, method:'PUT', headers:{Authorization:user.token}, body:body});
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
        return true;
    }

    const columns = [
        {
            title:'ID',
            dataIndex:'id',
            width:120,
            render:(id) => <div key={id}>{id}</div>,
        },
        {
            title:'Başlık',
            dataIndex:'title',
            render:(title, {id, slug, approved}) => {
                if (approved) {
                    return <a href={'https://dklist.com/blog/'+slug} target="_blank" key={id}>{title}</a>;
                } else {
                    return <a href={'#'} onClick={async () => {
                        const request = await apiRequest({endpoint:'/blog/admin/'+id, headers:{Authorization:user.token}});
                        if (request.responseData && request.responseData.status) {
                            const blogData = request.responseData.response;
                            // Modal açarak blog içeriğini göster
                            const newWindow = window.open('', '_blank');
                            newWindow.document.write(`
                                <html>
                                    <head>
                                        <title>${blogData.title} - Önizleme</title>
                                        <style>
                                            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                                            .header { border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; }
                                            .status { padding: 10px; border-radius: 5px; margin-bottom: 20px; }
                                            .unapproved { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
                                            .approved { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
                                            .content { line-height: 1.6; }
                                            img { max-width: 100%; height: auto; }
                                        </style>
                                    </head>
                                    <body>
                                        <div class="header">
                                            <h1>${blogData.title}</h1>
                                            <p><strong>Yazar:</strong> ${blogData.user ? blogData.user.username : 'Bilinmiyor'}</p>
                                            <p><strong>Tarih:</strong> ${blogData.createdData}</p>
                                            <div class="status ${blogData.approved ? 'approved' : 'unapproved'}">
                                                <strong>Durum:</strong> ${blogData.approved ? 'Onaylandı' : 'Onay Bekliyor'}
                                            </div>
                                        </div>
                                        <div class="content">
                                            <h3>Önizleme:</h3>
                                            <p>${blogData.preview}</p>
                                            <h3>İçerik:</h3>
                                            <div>${blogData.content}</div>
                                        </div>
                                    </body>
                                </html>
                            `);
                        }
                    }} key={id} style={{color: '#dc3545', cursor: 'pointer'}}>{title} (Önizleme)</a>;
                }
            },
        },
        {
            title:'Önizleme',
            dataIndex:'preview',
            render:(preview, {id}) => <div key={id}>{preview}</div>,
        },
        {
            title:'Onay',
            dataIndex : 'approved',
            key:'approved',
            width:150,
            render : ( approved, row ) => <Select
                options = {[
                    {value:true, label:'Onaylı'}, 
                    {value:false, label:'Onay Bekliyor'},
                ]}
                defaultValue={row.approved}
                onChange={ async (selectedValue, fullProps) => {
                    const req = await update({id:row.id, selected:selectedValue});
                    if (!req) {
                        setQuery({...query})                        
                    }
                }}
                key={row.id}
                style={{width:125}}
            />
        },
        {
            title:'#',
            width:100,
            render:({id}) => (
                <>
                    <ButtonComponent type={'primary'} style={{backgroundColor:'red', padding:0}} onClick = { async () => {
                        const request = await apiRequest({endpoint:'/blog/'+id, method:'DELETE', headers:{Authorization:user.token}});
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
                            setData({...data, blogs:data.blogs.filter( newsletter => newsletter.id !== id )});
                            throwNotification({
                                type:'success',
                                message:'Silme İşlemi Başarılı',
                                description: 'İlgili Blog Silindi',
                                duration:3
                            });
                        }
                    }}> <DeleteOutlined/> </ButtonComponent>
                </>
            ),
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
                        dataSource={ data.blogs.map( item => { return { ...item, key:item.id }} ) || [] }
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
export default BlogTable;
