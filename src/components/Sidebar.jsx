import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Receipt, CreditCard, HardHat,
    Clock, Banknote, FileText, UserCog, LogOut, History, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', perm: 'viewDashboard' },
        { to: '/customers', icon: <Users size={20} />, label: 'Customers', perm: 'viewCustomers' },
        { to: '/billing', icon: <Receipt size={20} />, label: 'Billing', perm: 'viewCustomers' },
        { to: '/payments', icon: <CreditCard size={20} />, label: 'Payments', perm: 'viewCustomers' },
        { to: '/history', icon: <History size={20} />, label: 'Financial History', perm: 'viewCustomers' },
        { to: '/complaints', icon: <HardHat size={20} />, label: 'Complaints', perm: 'viewComplaints' },
        { to: '/work-hours', icon: <Clock size={20} />, label: 'Work Hours', perm: 'logOwnHours' },
        { to: '/salary', icon: <Banknote size={20} />, label: 'Salary', perm: 'viewOwnSalary' },
        { to: '/reports', icon: <FileText size={20} />, label: 'Reports', perm: 'viewReports' },
        { to: '/users', icon: <UserCog size={20} />, label: 'Users', perm: 'manageUsers' },
    ];

    return (
        <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            <div className="sidebar-logo">
                <div className="sidebar-logo-mark">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <span className="logo-text">SLN CABLE</span>
                <button className="sidebar-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => {
                    if (item.perm && !user.permissions[item.perm]) return null;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon-wrap">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user?.name}</span>
                        <span className="sidebar-user-role">{user?.role}</span>
                    </div>
                </div>
                <button className="logout-btn" onClick={logout}>
                    <span className="nav-icon-wrap"><LogOut size={18} /></span>
                    <span className="nav-label">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
