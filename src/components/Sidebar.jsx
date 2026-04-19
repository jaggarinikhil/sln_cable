import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Receipt, HardHat,
    Clock, Banknote, FileText, UserCog, LogOut, Search, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', perm: 'viewDashboard' },
        { to: '/customers', icon: <Users size={20} />, label: 'Customers', perm: 'viewCustomers' },
        { to: '/billing', icon: <Receipt size={20} />, label: 'Billing', perm: 'viewCustomers' },
        { to: '/history', icon: <History size={20} />, label: 'Financial History', perm: 'viewCustomers' },
        { to: '/complaints', icon: <HardHat size={20} />, label: 'Complaints', perm: 'viewComplaints' },
        { to: '/work-hours', icon: <Clock size={20} />, label: 'Work Hours', perm: 'logOwnHours' },
        { to: '/salary', icon: <Banknote size={20} />, label: 'Salary', perm: 'viewOwnSalary' },
        { to: '/reports', icon: <FileText size={20} />, label: 'Reports', perm: 'viewReports' },
        { to: '/users', icon: <UserCog size={20} />, label: 'Users', perm: 'manageUsers' },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-text">SLN CABLE</span>
            </div>
            <nav className="sidebar-nav">
                {navItems.map(item => {
                    if (item.perm && !user.permissions[item.perm]) return null;
                    return (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            {item.icon}
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>
            <div className="sidebar-footer">
                <button className="logout-btn" onClick={logout}>
                    <LogOut size={20} />
                    <span className="nav-label">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
