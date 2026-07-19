import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {BrowserRouter} from 'react-router-dom';
import { ResponsiveContextProvider } from './Context/ResponsiveContext';
import { UserAuthContextProvider } from './Context/UserAuthContext';
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(

    <ResponsiveContextProvider>
        <UserAuthContextProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
        </UserAuthContextProvider>
    </ResponsiveContextProvider>
);