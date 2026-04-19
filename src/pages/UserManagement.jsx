import React, { useState } from 'react';
import { storage } from '../utils/storage';
import { PERMISSIONS, OWNER_PRESET, WORKER_PRESET } from '../utils/permissions';
import { X, Save, Shield, UserPlus, Lock } from 'lucide-react';
import { createPermissionHistory } from '../utils/audit';
import { useAuth } from '../context/AuthContext';

const UserModal = ({ user: editingUser, onClose, onSave }) => {
    const { user: currentUser } = useAuth();
    const [formData, setFormData] = useState(editingUser || {
        username: '',
        password: '',
        name: '',
        role: 'worker',
        permissions: WORKER_PRESET,
        active: true,
        isSuperAdmin: false
    });

    const [preset, setPreset] = useState(editingUser?.role === 'owner' ? 'owner' : 'worker');

    const handlePresetChange = (p) => {
        setPreset(p);
        if (p === 'owner') {
            setFormData({ ...formData, role: 'owner', permissions: OWNER_PRESET });
        } else if (p === 'worker') {
            setFormData({ ...formData, role: 'worker', permissions: WORKER_PRESET });
        }
    };

    const handlePermissionChange = (key, val) => {
        setFormData({
            ...formData,
            permissions: { ...formData.permissions, [key]: val }
        });
        setPreset('custom');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    // Group permissions for UI
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

    return (
        <div className="modal-overlay">
            <div className="modal-content user-modal">
                <div className="modal-header">
                    <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-form-grid">
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                                disabled={editingUser?.isSuperAdmin}
                            />
                        </div>
                        {!editingUser && (
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Display Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select
                                value={formData.role}
                                onChange={e => handlePresetChange(e.target.value)}
                                disabled={editingUser?.isSuperAdmin}
                            >
                                <option value="owner">Owner</option>
                                <option value="worker">Worker</option>
                            </select>
                        </div>
                    </div>

                    <div className="permissions-section">
                        <div className="section-header">
                            <h3><Shield size={18} /> Permissions</h3>
                            <div className="preset-selector">
                                <button
                                    type="button"
                                    className={preset === 'owner' ? 'active' : ''}
                                    onClick={() => handlePresetChange('owner')}
                                >Owner Preset</button>
                                <button
                                    type="button"
                                    className={preset === 'worker' ? 'active' : ''}
                                    onClick={() => handlePresetChange('worker')}
                                >Worker Preset</button>
                            </div>
                        </div>

                        <div className="permissions-grid">
                            {Object.entries(sections).map(([section, perms]) => (
                                <div key={section} className="permission-group">
                                    <h4>{section}</h4>
                                    {perms.map(p => (
                                        <label key={p} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions[p]}
                                                onChange={e => handlePermissionChange(p, e.target.checked)}
                                                disabled={editingUser?.isSuperAdmin}
                                            />
                                            <span>{p.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary"><Save size={18} /> Save User</button>
                    </div>
                </form>
            </div>
            <style>{`
        .user-modal { max-width: 800px; width: 90%; }
        .modal-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .permissions-section { border-top: 1px solid var(--border); padding-top: 20px; }
        .permissions-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
          gap: 20px; 
          max-height: 400px; 
          overflow-y: auto;
          margin-top: 16px;
          padding-right: 10px;
        }
        .permission-group h4 { font-size: 0.8rem; color: var(--accent); text-transform: uppercase; margin-bottom: 10px; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 6px; cursor: pointer; }
        .checkbox-label input { width: 16px; height: 16px; }
        .preset-selector { display: flex; gap: 10px; }
        .preset-selector button { 
          background: none; border: 1px solid var(--border); color: var(--text-secondary); 
          font-size: 0.75rem; padding: 4px 10px; border-radius: 4px; cursor: pointer; 
        }
        .preset-selector button.active { background: var(--accent); color: white; border-color: var(--accent); }
      `}</style>
        </div>
    );
};

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState(storage.getUsers());
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const handleSaveUser = (userData) => {
        let updatedUsers;
        if (editingUser) {
            updatedUsers = users.map(u => u.id === editingUser.id ? {
                ...u,
                ...userData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.username
            } : u);
        } else {
            updatedUsers = [...users, {
                ...userData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                createdBy: currentUser.username
            }];
        }
        storage.setUsers(updatedUsers);
        setUsers(updatedUsers);
        setModalOpen(false);
        setEditingUser(null);
    };

    const toggleUserActive = (id) => {
        const user = users.find(u => u.id === id);
        if (user.isSuperAdmin) return;
        const updated = users.map(u => u.id === id ? { ...u, active: !u.active } : u);
        storage.setUsers(updated);
        setUsers(updated);
    };

    return (
        <div className="page-header-container">
            <div className="section-header">
                <h1>User Management</h1>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    <UserPlus size={18} /> Add User
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Permissions</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div className="user-cell">
                                        <span className="user-name">{u.name}</span>
                                        <span className="user-username">@{u.username}</span>
                                    </div>
                                </td>
                                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                                <td>
                                    <button
                                        className={`status-toggle ${u.active ? 'active' : 'inactive'}`}
                                        onClick={() => toggleUserActive(u.id)}
                                        disabled={u.isSuperAdmin}
                                    >
                                        {u.active ? 'Active' : 'Disabled'}
                                    </button>
                                </td>
                                <td>
                                    <div className="perms-summary">
                                        {Object.values(u.permissions).filter(Boolean).length} / {Object.keys(PERMISSIONS).length} enabled
                                    </div>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button onClick={() => { setEditingUser(u); setModalOpen(true); }} className="btn-edit">Edit</button>
                                        {u.isSuperAdmin && <Lock size={16} title="Super Admin Locked" />}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => { setModalOpen(false); setEditingUser(null); }}
                    onSave={handleSaveUser}
                />
            )}

            <style>{`
        .user-cell { display: flex; flex-direction: column; }
        .user-username { font-size: 0.8rem; color: var(--text-secondary); }
        .role-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
        .role-badge.owner { background: rgba(59, 130, 246, 0.1); color: var(--accent); }
        .role-badge.worker { background: rgba(148, 163, 184, 0.1); color: var(--text-secondary); }
        .status-toggle { 
          border: none; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer;
          transition: all 0.2s;
        }
        .status-toggle.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-toggle.inactive { background: rgba(248, 113, 113, 0.1); color: #f87171; }
        .status-toggle:disabled { cursor: not-allowed; opacity: 0.7; }
        .perms-summary { font-size: 0.85rem; color: var(--text-secondary); }
        .action-btns { display: flex; align-items: center; gap: 10px; }
      `}</style>
        </div>
    );
};

export default UserManagement;
