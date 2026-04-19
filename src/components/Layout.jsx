import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <Sidebar />
            <div className="layout-main">
                <TopBar />
                <main className="content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
