import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';


const MailSablon = () => {



    return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <Helmet>
                <title>Mail Şablonları</title>
            </Helmet>
            Mail Şablonu Sayfası
        </motion.div>
    );
}

export default MailSablon;