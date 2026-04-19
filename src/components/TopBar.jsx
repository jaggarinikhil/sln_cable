import React from 'react';
import { Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TopBar = () => {
    const { user } = useAuth();

    return (
        <div className="topbar">
            <div className="search-box">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Global search..." />
            </div>
            <div className="user-info">
                <div className="user-details text-right">
                    <p className="user-name">{user.name}</p>
                    <p className="user-role">{user.role.toUpperCase()}</p>
                </div>
                <div className="user-avatar">
                    <User size={20} />
                </div>
            </div>
        </div>
    );
};

export default TopBar;
