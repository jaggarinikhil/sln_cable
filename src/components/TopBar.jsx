import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Users, Receipt, CreditCard, HardHat,
    Clock, Banknote, FileText, UserCog, LogOut, History, Menu, X, KeyRound, Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';

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
    { to: '/customers', icon: <Users size={16} />, label: 'Customers', perm: 'viewCustomers' },
    { to: '/billing', icon: <Receipt size={16} />, label: 'Billing', perm: 'viewCustomers' },
    { to: '/payments', icon: <CreditCard size={16} />, label: 'Payments', perm: 'recordPayment' },
    { to: '/history', icon: <History size={16} />, label: 'History', perm: 'viewCustomers' },
    { to: '/complaints', icon: <HardHat size={16} />, label: 'Complaints', perm: 'viewComplaints' },
    { to: '/work-hours', icon: <Clock size={16} />, label: 'Work Hours', perm: 'logOwnHours' },
    { to: '/salary', icon: <Banknote size={16} />, label: 'Salary', perm: 'viewOwnSalary' },
    { to: '/reports', icon: <FileText size={16} />, label: 'Reports', perm: 'viewReports' },
    { to: '/users', icon: <UserCog size={16} />, label: 'Users', perm: 'manageUsers' },
];

const TopBar = () => {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [changePwdOpen, setChangePwdOpen] = useState(false);

    const allowed = navItems.filter(item => !item.perm || user?.permissions?.[item.perm]);

    return (
        <>
            <nav className="topnav">
                {/* Logo */}
                <NavLink to="/dashboard" className="topnav-brand" style={{ textDecoration: 'none' }}>
                    <div className="topnav-logo-mark">
                        {user?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <span className="topnav-logo-text">SLN CABLE</span>
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
                    <button className="topnav-logout" onClick={() => setChangePwdOpen(true)} title="Change Password">
                        <KeyRound size={16} />
                    </button>
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
                            <button className="topnav-drawer-logout" onClick={() => { setMenuOpen(false); setChangePwdOpen(true); }}>
                                <KeyRound size={16} /> Change Password
                            </button>
                            <button className="topnav-drawer-logout" onClick={logout}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {changePwdOpen && (
                <ChangePasswordModal user={user} onClose={() => setChangePwdOpen(false)} />
            )}
        </>
    );
};

export default TopBar;
