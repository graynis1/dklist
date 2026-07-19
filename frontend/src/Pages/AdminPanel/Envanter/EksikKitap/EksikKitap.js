import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';


const EksikKitap = () => {

    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <Helmet>
                <title>Eksik Kitaplar</title>
            </Helmet>
            Eksik Kitap Sayfası
        </motion.div>
    );
}

export default EksikKitap;