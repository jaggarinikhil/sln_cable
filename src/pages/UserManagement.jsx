import React, { useState, useMemo } from 'react';
import { storage } from '../utils/storage';
import { PERMISSIONS, OWNER_PRESET, WORKER_PRESET } from '../utils/permissions';
import { X, Save, Shield, UserPlus, Lock, Edit2, CheckCircle, XCircle, Crown, Wrench, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Reset Password Modal ──────────────────────────────────── */
const ResetPasswordModal = ({ user: targetUser, onClose, onSave }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newPassword.length < 4) { setError('Password must be at least 4 characters.'); return; }
        if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
        onSave(newPassword);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="rp-modal">
                <div className="rp-header">
                    <div className="rp-header-icon"><KeyRound size={18} /></div>
                    <div>
                        <div className="rp-title">Reset Password</div>
                        <div className="rp-sub">for {targetUser.name}</div>
                    </div>
                    <button className="um-close-btn" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="rp-body">
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" value={newPassword} placeholder="••••••••"
                            onChange={e => { setNewPassword(e.target.value); setError(''); }} required />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input type="password" value={confirm} placeholder="••••••••"
                            onChange={e => { setConfirm(e.target.value); setError(''); }} required />
                    </div>
                    {error && <p className="rp-error">{error}</p>}
                    <div className="um-modal-actions" style={{ padding: 0, marginTop: 4 }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary"><Save size={15} /> Save Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─── User Modal ────────────────────────────────────────────── */
const UserModal = ({ user: editingUser, onClose, onSave }) => {
    const [formData, setFormData] = useState(editingUser || {
        username: '', password: '', name: '',
        role: 'worker', permissions: WORKER_PRESET, active: true, isSuperAdmin: false,
        monthlySalary: ''
    });
    const [preset, setPreset] = useState(editingUser?.role === 'owner' ? 'owner' : 'worker');

    const handlePresetChange = (p) => {
        setPreset(p);
        setFormData(prev => ({
            ...prev,
            role: p,
            permissions: p === 'owner' ? OWNER_PRESET : WORKER_PRESET
        }));
    };

    const handlePermissionChange = (key, val) => {
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: val } }));
        setPreset('custom');
    };

    const sections = {
        Dashboard: ['viewDashboard'],
        Customers: ['viewCustomers', 'createCustomer', 'editCustomer', 'deleteCustomer'],
        Bills: ['generateBill', 'editBill', 'deleteBill'],
        Payments: ['recordPayment', 'editPayment', 'deletePayment'],
        Complaints: ['viewComplaints', 'createComplaint', 'updateComplaintStatus', 'deleteComplaint'],
        'Work Hours': ['logOwnHours', 'viewAllHours', 'editAnyHours'],
        Salary: ['recordSalary', 'editSalary', 'viewOwnSalary', 'viewAllSalary'],
        Reports: ['viewReports', 'viewWorkerCollections', 'viewOwnCollections'],
        Admin: ['recordHandover', 'manageUsers', 'canOverrideGeneratedBy', 'canOverrideReceivedBy']
    };

    const enabledCount = Object.values(formData.permissions).filter(Boolean).length;

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="um-modal">

                {/* Header banner */}
                <div className="um-modal-banner">
                    <div className="um-modal-banner-avatar">
                        {editingUser ? getInitials(formData.name) : <UserPlus size={22} />}
                    </div>
                    <div className="um-modal-banner-text">
                        <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
                        <p>
                            <Shield size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {enabledCount} of {Object.keys(PERMISSIONS).length} permissions enabled
                        </p>
                    </div>
                    <button onClick={onClose} className="um-close-btn"><X size={20} /></button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>

                    {/* Basic info */}
                    <div className="um-section">
                        <p className="um-section-label">Basic Info</p>
                        <div className="um-form-grid">
                            <div className="form-group">
                                <label>Display Name</label>
                                <input type="text" value={formData.name} placeholder="Full name"
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    required />
                            </div>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" value={formData.username} placeholder="login username"
                                    onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                                    required />
                            </div>
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" value={formData.password} placeholder="••••••••"
                                        onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                        required />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Role</label>
                                <select value={formData.role}
                                    onChange={e => handlePresetChange(e.target.value)}
                                    disabled={!!editingUser?.isSuperAdmin}>
                                    <option value="owner">Owner</option>
                                    <option value="worker">Worker</option>
                                </select>
                            </div>
                            {formData.role !== 'owner' && (
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Salary Cycle Start Day</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
                                            const selected = (formData.salaryStartDay || 1) === day;
                                            return (
                                                <button key={day} type="button"
                                                    onClick={() => setFormData(p => ({ ...p, salaryStartDay: day }))}
                                                    style={{
                                                        width: 34, height: 34, borderRadius: 8,
                                                        border: selected ? '2px solid #6366f1' : '1px solid var(--border)',
                                                        background: selected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                                                        color: selected ? '#6366f1' : 'var(--text-secondary)',
                                                        fontWeight: selected ? 800 : 500,
                                                        fontSize: '0.78rem', cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}>
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: 4, display: 'block' }}>
                                        Salary cycle starts on day <strong style={{ color: '#6366f1' }}>{formData.salaryStartDay || 1}</strong> of each month
                                    </small>
                                </div>
                            )}
                            {formData.role !== 'owner' && (
                                <div className="form-group">
                                    <label>Monthly Salary (₹)</label>
                                    <input type="number" min="0"
                                        value={formData.monthlySalary || ''}
                                        onChange={e => setFormData(p => ({ ...p, monthlySalary: parseFloat(e.target.value) || 0 }))}
                                        placeholder="e.g. 15000" />
                                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Expected salary per cycle</small>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="um-section">
                        <div className="um-perms-header">
                            <p className="um-section-label" style={{ margin: 0 }}>Permissions</p>
                            <div className="um-preset-pills">
                                <button type="button"
                                    className={`um-preset-pill ${preset === 'owner' ? 'active-owner' : ''}`}
                                    onClick={() => handlePresetChange('owner')}>
                                    <Crown size={12} /> Owner preset
                                </button>
                                <button type="button"
                                    className={`um-preset-pill ${preset === 'worker' ? 'active-worker' : ''}`}
                                    onClick={() => handlePresetChange('worker')}>
                                    <Wrench size={12} /> Worker preset
                                </button>
                            </div>
                        </div>

                        <div className="um-perms-list">
                            {Object.entries(sections).map(([section, perms]) => (
                                <div key={section} className="um-perm-section">
                                    <p className="um-perm-section-title">{section}</p>
                                    {perms.map(p => {
                                        const enabled = !!formData.permissions[p];
                                        return (
                                            <div key={p} className={`um-toggle-row ${enabled ? 'on' : ''}`}
                                                onClick={() => !editingUser?.isSuperAdmin && handlePermissionChange(p, !enabled)}>
                                                <span className="um-toggle-label">{p.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                                                <div className={`um-toggle-switch ${enabled ? 'on' : ''} ${editingUser?.isSuperAdmin ? 'locked' : ''}`}>
                                                    <div className="um-toggle-knob" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="um-modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">
                            <Save size={16} /> Save User
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .um-modal {
                    background: #0d1526; border: 1px solid var(--border-bright);
                    border-radius: 24px; width: 92%; max-width: 680px;
                    max-height: 92vh; overflow-y: auto; box-shadow: 0 30px 60px rgba(0,0,0,0.85);
                    animation: modalSlide 0.28s cubic-bezier(0.4,0,0.2,1);
                    display: flex; flex-direction: column;
                }

                /* Banner header */
                .um-modal-banner {
                    display: flex; align-items: center; gap: 16px;
                    padding: 22px 22px 18px;
                    background: linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.1) 100%);
                    border-bottom: 1px solid var(--border);
                    position: sticky; top: 0; z-index: 2;
                    border-radius: 24px 24px 0 0;
                    backdrop-filter: blur(12px);
                }
                .um-modal-banner-avatar {
                    width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
                    background: var(--accent-gradient);
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 800; font-size: 1rem;
                    box-shadow: 0 4px 12px rgba(99,102,241,0.4);
                }
                .um-modal-banner-text { flex: 1; }
                .um-modal-banner-text h2 { font-size: 1.1rem; font-weight: 800; }
                .um-modal-banner-text p { font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px; display: flex; align-items: center; }
                .um-close-btn {
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    color: var(--text-secondary); cursor: pointer; padding: 7px; border-radius: 10px;
                    display: flex; transition: all 0.2s;
                }
                .um-close-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }

                /* Sections */
                .um-section { padding: 18px 22px; border-bottom: 1px solid var(--border); }
                .um-section-label {
                    font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 14px;
                }

                .um-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

                /* Permissions header */
                .um-perms-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
                .um-preset-pills { display: flex; gap: 6px; }
                .um-preset-pill {
                    display: flex; align-items: center; gap: 5px;
                    padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
                    border: 1.5px solid var(--border); background: rgba(255,255,255,0.04);
                    color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
                }
                .um-preset-pill:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .um-preset-pill.active-owner { background: rgba(99,102,241,0.15); border-color: var(--accent); color: var(--accent); }
                .um-preset-pill.active-worker { background: rgba(16,185,129,0.12); border-color: #10b981; color: #10b981; }

                /* Permissions list */
                .um-perms-list { display: flex; flex-direction: column; gap: 20px; max-height: 320px; overflow-y: auto; padding-right: 2px; }
                .um-perm-section { }
                .um-perm-section-title {
                    font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em;
                    color: var(--accent); margin-bottom: 8px; padding-bottom: 6px;
                    border-bottom: 1px solid rgba(99,102,241,0.15);
                }

                /* Toggle rows */
                .um-toggle-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 8px 10px; border-radius: 8px; cursor: pointer;
                    transition: background 0.15s; gap: 12px;
                }
                .um-toggle-row:hover { background: rgba(255,255,255,0.04); }
                .um-toggle-row.on { background: rgba(99,102,241,0.06); }
                .um-toggle-label {
                    font-size: 0.82rem; color: var(--text-secondary);
                    text-transform: capitalize; flex: 1;
                }
                .um-toggle-row.on .um-toggle-label { color: var(--text-primary); }

                /* Toggle switch */
                .um-toggle-switch {
                    width: 36px; height: 20px; border-radius: 10px;
                    background: rgba(255,255,255,0.1); border: 1.5px solid var(--border);
                    position: relative; transition: all 0.2s; flex-shrink: 0;
                }
                .um-toggle-switch.on { background: var(--accent); border-color: var(--accent); }
                .um-toggle-switch.locked { opacity: 0.5; cursor: not-allowed; }
                .um-toggle-knob {
                    width: 14px; height: 14px; border-radius: 50%; background: white;
                    position: absolute; top: 2px; left: 2px;
                    transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.4);
                }
                .um-toggle-switch.on .um-toggle-knob { transform: translateX(16px); }

                .um-modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding: 16px 22px; }

                @media (max-width: 640px) {
                    /* Bottom-sheet style for um-modal */
                    .modal-overlay { align-items: flex-end; padding: 0; }
                    .um-modal {
                        border-radius: 20px 20px 0 0;
                        max-width: 100% !important;
                        width: 100% !important;
                        max-height: 92vh;
                    }
                    .um-modal-banner { border-radius: 20px 20px 0 0; }
                    /* Bottom-sheet for reset password modal */
                    .rp-modal {
                        border-radius: 20px 20px 0 0;
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                }

                @media (max-width: 600px) {
                    .um-modal { width: 100%; max-height: 95vh; }
                    .um-form-grid { grid-template-columns: 1fr; }
                    .um-modal-actions { flex-direction: column-reverse; }
                    .um-modal-actions button { width: 100%; justify-content: center; }
                    .um-perms-header { flex-direction: column; align-items: flex-start; }
                    .um-perms-list { max-height: 240px; }
                    .um-perm-section-title { font-size: 0.62rem; }
                    /* Inputs: prevent iOS zoom */
                    .um-modal input, .um-modal select, .rp-modal input { font-size: 16px !important; }
                    /* Salary cycle day buttons: smaller on mobile */
                    .um-form-grid button[type="button"][style*="width: 34px"],
                    .um-form-grid button[type="button"] { width: 30px !important; height: 30px !important; font-size: 0.72rem !important; }
                }

            `}</style>
        </div>
    );
};

/* ─── User Management Page ──────────────────────────────────── */
const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState(storage.getUsers());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [resetPasswordUser, setResetPasswordUser] = useState(null);
    const isOwner = currentUser?.role?.toLowerCase() === 'owner';

    // Load salary records and compute per-worker balance
    const allSalaries = useMemo(() => {
        try { return (storage.getSalary() || []).map(r => {
            // Migrate old format
            if (r.cashAmount !== undefined || r.digitalAmount !== undefined || r.type === 'advance') return r;
            const amt = parseFloat(r.amount || 0);
            const isDigital = r.paymentMode && r.paymentMode !== 'Cash';
            return { ...r, type: 'salary', cashAmount: isDigital ? 0 : amt, digitalAmount: isDigital ? amt : 0, advanceDeduction: 0 };
        }); } catch { return []; }
    }, []);

    const getWorkerSalaryInfo = (worker) => {
        const startDay = worker.salaryStartDay || 1;
        const today = new Date();
        const todayD = today.getDate(), y = today.getFullYear(), m = today.getMonth();
        let cycleStart;
        if (todayD >= startDay) {
            cycleStart = new Date(y, m, startDay);
        } else {
            cycleStart = new Date(y, m - 1, startDay);
        }
        const cycleStartStr = cycleStart.toLocaleDateString('en-CA');
        const cycleLabel = `${cycleStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – Today`;

        const workerRecs = allSalaries.filter(s => s.workerId === worker.id);
        const cycleRecs = workerRecs.filter(s => s.type === 'salary' && (s.paymentDate || '') >= cycleStartStr);
        const paidThisCycle = cycleRecs.reduce((sum, s) => sum + (s.cashAmount || 0) + (s.digitalAmount || 0), 0);

        const totalAdvanceGiven = workerRecs.filter(s => s.type === 'advance').reduce((sum, s) => sum + (s.advanceAmount || 0), 0);
        const totalAdvanceDeducted = workerRecs.filter(s => s.type === 'salary').reduce((sum, s) => sum + (s.advanceDeduction || 0), 0);
        const outstandingAdvance = totalAdvanceGiven - totalAdvanceDeducted;

        const monthlySalary = parseFloat(worker.monthlySalary) || 0;
        const balance = monthlySalary - paidThisCycle;

        return { paidThisCycle, outstandingAdvance, balance, monthlySalary, cycleLabel };
    };

    const handleSaveUser = (userData) => {
        let updated;
        if (editingUser) {
            updated = users.map(u => u.id === editingUser.id ? {
                ...u, ...userData, updatedAt: new Date().toISOString(), updatedBy: currentUser.username
            } : u);
        } else {
            updated = [...users, {
                ...userData, id: Date.now().toString(),
                createdAt: new Date().toISOString(), createdBy: currentUser.username
            }];
        }
        storage.setUsers(updated);
        setUsers(updated);
        setModalOpen(false);
        setEditingUser(null);
    };

    const toggleUserActive = (id) => {
        const u = users.find(u => u.id === id);
        if (u?.isSuperAdmin) return;
        const updated = users.map(u => u.id === id ? { ...u, active: !u.active } : u);
        storage.setUsers(updated);
        setUsers(updated);
    };

    const handleResetPassword = (newPassword) => {
        const updated = users.map(u => u.id === resetPasswordUser.id
            ? { ...u, password: newPassword, updatedAt: new Date().toISOString() }
            : u
        );
        storage.setUsers(updated);
        setUsers(updated);
        setResetPasswordUser(null);
    };

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

    const avatarColors = [
        'linear-gradient(135deg,#6366f1,#a855f7)',
        'linear-gradient(135deg,#06b6d4,#3b82f6)',
        'linear-gradient(135deg,#10b981,#059669)',
        'linear-gradient(135deg,#f59e0b,#ef4444)',
    ];
    const getAvatarColor = (id) => avatarColors[(parseInt(id) || 0) % avatarColors.length];

    return (
        <div className="um-page">
            <div className="um-header">
                <div>
                    <h1 className="um-title">Users</h1>
                    <p className="um-sub">{users.length} users · {users.filter(u => u.active).length} active</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
                    <UserPlus size={18} /> Add User
                </button>
            </div>

            <div className="um-list">
                {users.map(u => {
                    const enabledPerms = Object.values(u.permissions || {}).filter(Boolean).length;
                    const totalPerms = Object.keys(PERMISSIONS).length;
                    return (
                        <div key={u.id} className={`um-card ${!u.active ? 'um-card-inactive' : ''}`}>
                            <div className="um-card-left">
                                <div className="um-avatar" style={{ background: getAvatarColor(u.id) }}>
                                    {getInitials(u.name)}
                                </div>
                                <div className="um-card-info">
                                    <div className="um-card-name-row">
                                        <span className="um-card-name">{u.name}</span>
                                        {u.isSuperAdmin && (
                                            <span className="um-locked-badge"><Lock size={11} /> Locked</span>
                                        )}
                                    </div>
                                    <span className="um-card-username">@{u.username}</span>
                                    <div className="um-card-meta">
                                        <span className={`um-role-badge ${u.role}`}>
                                            {u.role === 'owner' ? <Crown size={11} /> : <Wrench size={11} />}
                                            {u.role}
                                        </span>
                                        <span className="um-perms-count">
                                            <Shield size={11} /> {enabledPerms}/{totalPerms} perms
                                        </span>
                                        {u.role === 'worker' && (
                                            <span className="um-cycle-badge">
                                                Cycle: {u.salaryStartDay || 1}
                                            </span>
                                        )}
                                    </div>
                                    {u.role === 'worker' && (() => {
                                        const info = getWorkerSalaryInfo(u);
                                        return (
                                            <div className="um-salary-row" style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                {info.monthlySalary > 0 && (
                                                    <span className="um-salary-chip">
                                                        ₹{info.monthlySalary.toLocaleString('en-IN')}/cycle
                                                    </span>
                                                )}
                                                {info.paidThisCycle > 0 && (
                                                    <span className="um-salary-chip um-paid">
                                                        Paid: ₹{info.paidThisCycle.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                                {info.monthlySalary > 0 && info.balance > 0 && (
                                                    <span className="um-salary-chip um-balance">
                                                        Due: ₹{info.balance.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                                {info.monthlySalary > 0 && info.balance < 0 && (
                                                    <span className="um-salary-chip um-excess">
                                                        Excess: ₹{Math.abs(info.balance).toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                                {info.outstandingAdvance > 0 && (
                                                    <span className="um-salary-chip um-advance">
                                                        Advance: ₹{info.outstandingAdvance.toLocaleString('en-IN')}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="um-card-right">
                                <button
                                    className={`um-status-btn ${u.active ? 'active' : 'inactive'}`}
                                    onClick={() => toggleUserActive(u.id)}
                                    disabled={u.isSuperAdmin}
                                    title={u.isSuperAdmin ? 'Super Admin cannot be disabled' : (u.active ? 'Click to disable' : 'Click to enable')}
                                >
                                    {u.active
                                        ? <><CheckCircle size={14} /> Active</>
                                        : <><XCircle size={14} /> Disabled</>
                                    }
                                </button>
                                {isOwner && (
                                    <button
                                        className="um-pwd-btn"
                                        onClick={() => setResetPasswordUser(u)}
                                        title="Reset password"
                                    >
                                        <KeyRound size={14} />
                                    </button>
                                )}
                                <button
                                    className="um-edit-btn"
                                    onClick={() => { setEditingUser(u); setModalOpen(true); }}
                                >
                                    <Edit2 size={15} /> Edit
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {modalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => { setModalOpen(false); setEditingUser(null); }}
                    onSave={handleSaveUser}
                />
            )}

            {resetPasswordUser && (
                <ResetPasswordModal
                    user={resetPasswordUser}
                    onClose={() => setResetPasswordUser(null)}
                    onSave={handleResetPassword}
                />
            )}

            <style>{`
                .um-page { padding: 28px 32px; }

                .um-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
                .um-title {
                    font-size: 1.8rem; font-weight: 800;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
                }
                .um-sub { font-size: 0.85rem; color: var(--text-secondary); margin-top: 3px; }

                .um-list { display: flex; flex-direction: column; gap: 12px; }

                .um-card {
                    background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
                    padding: 18px 20px; display: flex; align-items: center; justify-content: space-between;
                    gap: 16px; transition: all 0.2s;
                }
                .um-card:hover { border-color: var(--border-bright); }
                .um-card-inactive { opacity: 0.55; }

                .um-card-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }

                .um-avatar {
                    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 800; font-size: 0.9rem;
                }

                .um-card-info { min-width: 0; }
                .um-card-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                .um-card-name { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); }
                .um-card-username { font-size: 0.78rem; color: var(--text-secondary); display: block; margin-top: 1px; }
                .um-locked-badge {
                    display: inline-flex; align-items: center; gap: 4px;
                    background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25);
                    color: #f59e0b; font-size: 0.68rem; font-weight: 700;
                    padding: 2px 7px; border-radius: 6px;
                }

                .um-card-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }

                .um-role-badge {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 3px 10px; border-radius: 7px; font-size: 0.73rem; font-weight: 700; text-transform: capitalize;
                }
                .um-role-badge.owner { background: rgba(99,102,241,0.12); color: var(--accent); border: 1px solid rgba(99,102,241,0.25); }
                .um-role-badge.worker { background: rgba(148,163,184,0.1); color: var(--text-secondary); border: 1px solid var(--border); }

                .um-perms-count { display: flex; align-items: center; gap: 4px; font-size: 0.73rem; color: var(--text-secondary); }
                .um-cycle-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.73rem; color: #f59e0b; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); padding: 2px 8px; border-radius: 6px; font-weight: 700; }

                .um-card-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

                .um-status-btn {
                    display: flex; align-items: center; gap: 5px;
                    border: 1px solid; padding: 6px 12px; border-radius: 8px;
                    font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap;
                }
                .um-status-btn.active { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.25); }
                .um-status-btn.inactive { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.25); }
                .um-status-btn:disabled { cursor: not-allowed; opacity: 0.6; }
                .um-status-btn:not(:disabled):hover { filter: brightness(1.2); }

                .um-edit-btn {
                    display: flex; align-items: center; gap: 6px;
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: var(--text-secondary); padding: 6px 14px; border-radius: 8px;
                    font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
                }
                .um-edit-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.08); }

                .um-pwd-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 32px; height: 32px; border-radius: 8px;
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    color: var(--text-secondary); cursor: pointer; transition: all 0.2s; flex-shrink: 0;
                }
                .um-pwd-btn:hover { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.1); }

                /* Reset password modal */
                .rp-modal {
                    background: var(--bg-card); border: 1px solid var(--border-bright);
                    border-radius: 18px; width: 92%; max-width: 380px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.6); animation: modalSlide 0.22s ease;
                    overflow: hidden;
                }
                .rp-header {
                    display: flex; align-items: center; gap: 12px; padding: 18px 18px 14px;
                    border-bottom: 1px solid var(--border);
                    background: rgba(245,158,11,0.07);
                }
                .rp-header-icon {
                    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
                    background: rgba(245,158,11,0.15); color: #f59e0b;
                    display: flex; align-items: center; justify-content: center;
                }
                .rp-title { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
                .rp-sub { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
                .rp-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
                .rp-error { font-size: 0.78rem; color: #f87171; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; padding: 8px 12px; margin: 0; }

                .um-salary-row { }
                .um-salary-chip {
                    display: inline-flex; align-items: center; gap: 4px;
                    font-size: 0.7rem; font-weight: 700;
                    padding: 2px 8px; border-radius: 6px;
                    background: rgba(255,255,255,0.05); color: var(--text-secondary);
                    border: 1px solid var(--border);
                }
                .um-salary-chip.um-paid { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.25); }
                .um-salary-chip.um-balance { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.25); }
                .um-salary-chip.um-excess { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.25); }
                .um-salary-chip.um-advance { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.25); }

                @media (max-width: 640px) {
                    .um-page { padding: 12px; }
                    .um-card { flex-direction: column; align-items: flex-start; }
                    .um-card-right { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
                    .um-status-btn, .um-edit-btn { flex: 1; justify-content: center; }
                    .um-salary-row { gap: 6px; }
                    .um-salary-chip { font-size: 0.65rem; }
                }
            `}</style>
        </div>
    );
};

export default UserManagement;
