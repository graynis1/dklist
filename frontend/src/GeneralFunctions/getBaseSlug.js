
const getBaseSlug = (type, t) => {
    switch (type) {
        case 'writer':
            return t('/yazar')+'/';
            break;
        case 'book':
            return t('/kitap')+'/';
            break;
        case 'translator':
            return t('/cevirmen')+'/';
            break;
        default:
            return t('/cevirmen')+'/';
            break;
    }
}

export default getBaseSlug;