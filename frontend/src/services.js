const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://dklist.com/api';

const apiRequest = async ( { method = 'GET', body = null, headers = null, endpoint = '' } ) => {

    let options = { method : method };

    if ( body ) {
        options.body = body;
    }
    if( headers ){
        if ( headers.Authorization ) {
            headers.Authorization = 'Bearer '+headers.Authorization;
        }
        options.headers = headers;
    }

    try{
        const req = await fetch( BASE_URL+endpoint, { ...options });
        
        // HTTP hata kodlarını kontrol et
        if (!req.ok) {
            const errorText = await req.text();
            return { 
                error: true, 
                errorMessage: `HTTP ${req.status}: ${req.statusText}`, 
                responseData: null 
            };
        }
        
        // Response'un JSON olup olmadığını kontrol et
        const contentType = req.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorText = await req.text();
            return { 
                error: true, 
                errorMessage: "Server returned non-JSON response", 
                responseData: null 
            };
        }
        
        const response = await req.json();
        return { error:false, errorMessage:null, responseData: response }
    }
    catch (e) {
        return { error:true, errorMessage:e.message || e.toString(), responseData:null }
    }
}

export default apiRequest;