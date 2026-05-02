import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, Receipt, CreditCard, HardHat,
    Clock, Banknote, FileText, UserCog, LogOut, History, X,
    KeyRound, Save, Wallet, User, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { storage } from '../utils/storage';
import Logo from './Logo';

/* ─── Change Password Modal ─────────────────────────────────── */
const ChangePasswordModal = ({ user, onClose }) => {
    const [current, setCurrent] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const users = storage.getUsers();
        const found = users.find(u => u.id === user.userId);
        if (!found || found.password !== current) { setError('Current password is incorrect.'); return; }
        if (newPwd.length < 4) { setError('New password must be at least 4 characters.'); return; }
        if (newPwd !== confirm) { setError('New passwords do not match.'); return; }
        const updated = users.map(u => u.id === user.userId
            ? { ...u, password: newPwd, updatedAt: new Date().toISOString() }
            : u
        );
        storage.setUsers(updated);
        setSuccess(true);
        setTimeout(onClose, 1200);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="cp-modal">
                <div className="cp-header">
                    <div className="cp-header-icon"><KeyRound size={18} /></div>
                    <div>
                        <div className="cp-title">Change Password</div>
                        <div className="cp-sub">{user.name}</div>
                    </div>
                    <button className="cp-close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                {success ? (
                    <div className="cp-body" style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, padding: '28px 18px' }}>
                        Password updated successfully!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="cp-body">
                        <div className="form-group">
                            <label>Current Password</label>
                            <input type="password" value={current} placeholder="••••••••"
                                onChange={e => { setCurrent(e.target.value); setError(''); }} required />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" value={newPwd} placeholder="••••••••"
                                onChange={e => { setNewPwd(e.target.value); setError(''); }} required />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input type="password" value={confirm} placeholder="••••••••"
                                onChange={e => { setConfirm(e.target.value); setError(''); }} required />
                        </div>
                        {error && <p className="cp-error">{error}</p>}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                            <button type="submit" className="btn-primary"><Save size={15} /> Update Password</button>
                        </div>
                    </form>
                )}
                <style>{`
                    .cp-modal {
                        background: var(--bg-card); border: 1px solid var(--border-bright);
                        border-radius: 18px; width: 92%; max-width: 380px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.6); animation: modalSlide 0.22s ease;
                        overflow: hidden;
                    }
                    .cp-header {
                        display: flex; align-items: center; gap: 12px; padding: 18px 18px 14px;
                        border-bottom: 1px solid var(--border);
                        background: rgba(99,102,241,0.07);
                    }
                    .cp-header-icon {
                        width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
                        background: rgba(99,102,241,0.15); color: var(--accent);
                        display: flex; align-items: center; justify-content: center;
                    }
                    .cp-title { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
                    .cp-sub { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
                    .cp-close-btn {
                        margin-left: auto; background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                        color: var(--text-secondary); cursor: pointer; padding: 7px; border-radius: 10px;
                        display: flex; transition: all 0.2s;
                    }
                    .cp-close-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }
                    .cp-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
                    .cp-error { font-size: 0.78rem; color: #f87171; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; padding: 8px 12px; margin: 0; }
                `}</style>
            </div>
        </div>
    );
};

const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', perm: 'viewDashboard' },
    { to: '/customers', icon: <Users size={18} />, label: 'Customers', perm: 'viewCustomers' },
    { to: '/billing', icon: <Receipt size={18} />, label: 'Billing', perm: 'viewCustomers' },
    { to: '/payments', icon: <CreditCard size={18} />, label: 'Payments', perm: 'recordPayment' },
    { to: '/history', icon: <History size={18} />, label: 'History', perm: 'viewCustomers' },
    { to: '/complaints', icon: <HardHat size={18} />, label: 'Complaints', perm: 'viewComplaints' },
    { to: '/work-hours', icon: <Clock size={18} />, label: 'Work Hours', perm: 'logOwnHours' },
    { to: '/salary', icon: <Banknote size={18} />, label: 'Salary', perm: 'viewOwnSalary' },
    { to: '/reports', icon: <FileText size={18} />, label: 'Reports', perm: 'viewReports' },
    { to: '/users', icon: <UserCog size={18} />, label: 'Users', perm: 'manageUsers' },
    { to: '/expenses', icon: <Wallet size={18} />, label: 'Business Expenses', perm: 'manageUsers' },
    { to: '/personal', icon: <User size={18} />, label: 'Personal', perm: 'manageUsers' },
];

const Sidebar = ({ collapsed = false, onToggleCollapse, mobileOpen = false, onMobileClose, isMobile = false }) => {
    const { user, logout } = useAuth();
    const { theme, toggle: toggleTheme } = useTheme();
    const [changePwdOpen, setChangePwdOpen] = useState(false);

    const allowed = navItems.filter(item => !item.perm || user?.permissions?.[item.perm]);

    // On mobile, force expanded inside drawer
    const isCollapsed = isMobile ? false : collapsed;

    const sidebarClass = [
        'app-sidebar',
        isCollapsed ? 'collapsed' : '',
        isMobile ? 'mobile' : '',
        isMobile && mobileOpen ? 'mobile-open' : '',
    ].filter(Boolean).join(' ');

    const handleNavClick = () => {
        if (isMobile && onMobileClose) onMobileClose();
    };

    const sidebar = (
        <aside className={sidebarClass}>
            {/* Top: brand + collapse */}
            <div className="sb-header">
                <NavLink to="/dashboard" className="sb-brand" onClick={handleNavClick}>
                    <div className="sb-logo-mark" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                        <Logo size={36} />
                    </div>
                    {!isCollapsed && <span className="sb-brand-text">SLN Cable &amp; Networks</span>}
                </NavLink>
                {isMobile ? (
                    <button className="sb-icon-btn" onClick={onMobileClose} title="Close">
                        <X size={18} />
                    </button>
                ) : (
                    <button className="sb-icon-btn sb-collapse-btn" onClick={onToggleCollapse} title={isCollapsed ? 'Expand' : 'Collapse'}>
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                )}
            </div>

            {/* Middle: nav */}
            <nav className="sb-nav">
                {allowed.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={handleNavClick}
                        title={isCollapsed ? item.label : ''}
                        className={({ isActive }) => `sb-nav-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="sb-nav-icon">{item.icon}</span>
                        {!isCollapsed && <span className="sb-nav-label">{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom: actions */}
            <div className="sb-footer">
                <button
                    className="sb-action"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                    <span className="sb-nav-icon">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>
                    {!isCollapsed && <span className="sb-nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button
                    className="sb-action"
                    onClick={() => { setChangePwdOpen(true); if (isMobile && onMobileClose) onMobileClose(); }}
                    title="Change Password"
                >
                    <span className="sb-nav-icon"><KeyRound size={18} /></span>
                    {!isCollapsed && <span className="sb-nav-label">Change Password</span>}
                </button>

                <div className="sb-user" title={user?.name}>
                    <div className="sb-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                    {!isCollapsed && (
                        <div className="sb-user-info">
                            <div className="sb-user-name">{user?.name}</div>
                            <div className="sb-user-role">{user?.role}</div>
                        </div>
                    )}
                </div>

                <button className="sb-action sb-logout" onClick={logout} title="Logout">
                    <span className="sb-nav-icon"><LogOut size={18} /></span>
                    {!isCollapsed && <span className="sb-nav-label">Logout</span>}
                </button>
            </div>

            <style>{`
                .app-sidebar {
                    position: fixed;
                    top: 0; left: 0; bottom: 0;
                    width: 240px;
                    background: var(--bg-card);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    transition: width 0.22s ease, transform 0.25s ease;
                    overflow: hidden;
                }
                .app-sidebar.collapsed { width: 64px; }
                .app-sidebar.mobile {
                    width: 260px;
                    transform: translateX(-100%);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                }
                .app-sidebar.mobile.mobile-open { transform: translateX(0); }

                .sb-header {
                    display: flex; align-items: center; gap: 8px;
                    padding: 14px 12px;
                    border-bottom: 1px solid var(--border);
                    min-height: 60px;
                }
                .sb-brand {
                    display: flex; align-items: center; gap: 10px;
                    text-decoration: none; color: var(--text-primary);
                    flex: 1; min-width: 0; overflow: hidden;
                }
                .sb-logo-mark {
                    width: 36px; height: 36px; flex-shrink: 0;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--accent), var(--accent-2, #8b5cf6));
                    color: #fff;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 1rem;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.35);
                }
                .sb-brand-text {
                    font-weight: 800; letter-spacing: 0.5px;
                    font-size: 0.95rem; color: var(--text-primary);
                    white-space: nowrap;
                }
                .sb-icon-btn {
                    background: rgba(127,127,127,0.08);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    width: 30px; height: 30px;
                    border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; flex-shrink: 0;
                    transition: all 0.2s;
                }
                .sb-icon-btn:hover { color: var(--text-primary); background: rgba(127,127,127,0.16); }
                .app-sidebar.collapsed .sb-collapse-btn { margin: 0 auto; }

                .sb-nav {
                    flex: 1;
                    padding: 12px 8px;
                    display: flex; flex-direction: column; gap: 2px;
                    overflow-y: auto; overflow-x: hidden;
                }
                .sb-nav-link {
                    display: flex; align-items: center; gap: 12px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    text-decoration: none;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.18s;
                    white-space: nowrap;
                }
                .sb-nav-link:hover {
                    color: var(--text-primary);
                    background: rgba(127,127,127,0.08);
                }
                .sb-nav-link.active {
                    background: linear-gradient(135deg, var(--accent), var(--accent-2, #8b5cf6));
                    color: #fff;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.35);
                }
                .sb-nav-link.active:hover { color: #fff; }
                .sb-nav-icon {
                    display: flex; align-items: center; justify-content: center;
                    width: 20px; flex-shrink: 0;
                }
                .sb-nav-label {
                    overflow: hidden; text-overflow: ellipsis;
                }
                .app-sidebar.collapsed .sb-nav-link {
                    justify-content: center;
                    padding: 10px;
                }

                .sb-footer {
                    border-top: 1px solid var(--border);
                    padding: 8px;
                    display: flex; flex-direction: column; gap: 2px;
                }
                .sb-action {
                    display: flex; align-items: center; gap: 12px;
                    padding: 9px 12px;
                    border-radius: 10px;
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 0.85rem; font-weight: 600;
                    cursor: pointer;
                    text-align: left;
                    width: 100%;
                    transition: all 0.18s;
                    white-space: nowrap;
                }
                .sb-action:hover {
                    background: rgba(127,127,127,0.08);
                    color: var(--text-primary);
                }
                .app-sidebar.collapsed .sb-action {
                    justify-content: center;
                    padding: 9px;
                }
                .sb-logout:hover {
                    background: rgba(239,68,68,0.1);
                    color: #f87171;
                }

                .sb-user {
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 12px;
                    margin: 6px 0;
                    border-radius: 10px;
                    background: rgba(99,102,241,0.08);
                }
                .app-sidebar.collapsed .sb-user {
                    justify-content: center; padding: 8px;
                }
                .sb-user-avatar {
                    width: 32px; height: 32px; flex-shrink: 0;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--accent), var(--accent-2, #8b5cf6));
                    color: #fff;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 700; font-size: 0.85rem;
                }
                .sb-user-info { min-width: 0; flex: 1; }
                .sb-user-name {
                    font-size: 0.82rem; font-weight: 700;
                    color: var(--text-primary);
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .sb-user-role {
                    font-size: 0.7rem; color: var(--text-secondary);
                    text-transform: capitalize;
                }
            `}</style>
        </aside>
    );

    return (
        <>
            {sidebar}
            {changePwdOpen && (
                <ChangePasswordModal user={user} onClose={() => setChangePwdOpen(false)} />
            )}
        </>
    );
};

export default Sidebar;
