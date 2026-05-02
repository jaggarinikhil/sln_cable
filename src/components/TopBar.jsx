import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Users, Receipt, CreditCard, HardHat,
    Clock, Banknote, FileText, UserCog, LogOut, History, Menu, X, Wallet, User, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const navItems = [
    { to: '/customers', icon: <Users size={16} />, label: 'Customers', perm: 'viewCustomers' },
    { to: '/billing', icon: <Receipt size={16} />, label: 'Billing', perm: 'viewCustomers' },
    { to: '/payments', icon: <CreditCard size={16} />, label: 'Payments', perm: 'recordPayment' },
    { to: '/history', icon: <History size={16} />, label: 'History', perm: 'viewCustomers' },
    { to: '/complaints', icon: <HardHat size={16} />, label: 'Complaints', perm: 'viewComplaints' },
    { to: '/work-hours', icon: <Clock size={16} />, label: 'Work Hours', perm: 'logOwnHours' },
    { to: '/salary', icon: <Banknote size={16} />, label: 'Salary', perm: 'viewOwnSalary' },
    { to: '/reports', icon: <FileText size={16} />, label: 'Reports', perm: 'viewReports' },
    { to: '/expenses', icon: <Wallet size={16} />, label: 'Business Expenses', perm: 'manageUsers' },
    { to: '/personal', icon: <User size={16} />, label: 'Personal', perm: 'manageUsers' },
    { to: '/settings', icon: <SettingsIcon size={16} />, label: 'Settings', perm: null },
];

const TopBar = () => {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const allowed = navItems.filter(item => !item.perm || user?.permissions?.[item.perm]);

    return (
        <>
            <nav className="topnav">
                {/* Logo */}
                <NavLink to="/dashboard" className="topnav-brand" style={{ textDecoration: 'none' }}>
                    <div className="topnav-logo-mark" style={{ background: 'transparent', padding: 0 }}>
                        <Logo size={32} />
                    </div>
                    <span className="topnav-logo-text">SLN Cable &amp; Networks</span>
                </NavLink>

                {/* Desktop nav links */}
                <div className="topnav-links">
                    {allowed.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `topnav-link ${isActive ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Right: user + logout (desktop) + hamburger (mobile) */}
                <div className="topnav-right">
                    <div className="topnav-user">
                        <div className="topnav-avatar">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="topnav-username">{user?.name}</span>
                    </div>
                    <button className="topnav-logout" onClick={logout} title="Logout">
                        <LogOut size={16} />
                    </button>
                    <button className="topnav-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </nav>

            {/* Mobile drawer */}
            {menuOpen && (
                <div className="topnav-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="topnav-drawer" onClick={e => e.stopPropagation()}>
                        {/* Profile at top */}
                        <div className="topnav-drawer-user">
                            <div className="topnav-avatar" style={{ width: 40, height: 40, fontSize: '1rem', flexShrink: 0 }}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
                            </div>
                        </div>
                        {/* Nav links fill remaining space, scroll if needed */}
                        <div className="topnav-drawer-links">
                            {allowed.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) => `topnav-drawer-link ${isActive ? 'active' : ''}`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                        {/* Actions pinned at bottom */}
                        <div className="topnav-drawer-bottom">
                            <button className="topnav-drawer-logout" onClick={logout}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TopBar;
