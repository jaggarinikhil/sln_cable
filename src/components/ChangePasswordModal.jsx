import { useState } from 'react';
import { KeyRound, X, Save } from 'lucide-react';
import { storage } from '../utils/storage';

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

export default ChangePasswordModal;
