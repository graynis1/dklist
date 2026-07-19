import { notification } from 'antd';


const throwNotification =  ({ message, description, type, duration }) => {

    if (duration === undefined) {
        duration = 5
    }
    
    // Güvenli string dönüşümü
    const safeMessage = (() => {
        if (!message) return '';
        if (typeof message === 'string') return message;
        if (message instanceof Error) return message.message || 'Bir hata oluştu';
        if (typeof message === 'object' && message.message) return String(message.message);
        return String(message);
    })();
    
    const safeDescription = (() => {
        if (!description) return '';
        if (typeof description === 'string') return description;
        if (description instanceof Error) return description.message || 'Detay bulunamadı';
        if (typeof description === 'object' && description.message) return String(description.message);
        return String(description);
    })();
    switch (type) {
        case 'success':
            notification.success({
                description:safeDescription,
                message:safeMessage,
                placement:'bottomRight',
                duration:duration
            })
            break;
        case 'error':
            notification.error({
                description:safeDescription,
                message:safeMessage,
                placement:'bottomRight',
                duration:duration
            })
            break;
        case 'warning':
            notification.warning({
                description:safeDescription,
                message:safeMessage,
                placement:'bottomRight',
                duration:duration
            })
            break;
        default:
            notification.info({
                description:safeDescription,
                message:safeMessage,
                placement:'bottomRight',
                duration:duration
            })
            break;
    }
}
export default throwNotification;