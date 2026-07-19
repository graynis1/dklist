import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';


const MailAyarlari = () => {



    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
             <Helmet>
                <title>Mail Ayarları</title>
            </Helmet>
            Mail Ayarlari Sayfası
        </motion.div>
    );
}

export default MailAyarlari;