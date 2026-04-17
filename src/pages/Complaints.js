import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getComplaints, addComplaint, updateComplaintStatus } from '../utils/storage';
import './Dashboard.css';

const STATUSES = ['Pending', 'In Progress', 'Completed'];

const Complaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ customerName: '', phone: '', issue: '', address: '' });
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState(null);

  const loadComplaints = useCallback(() => setComplaints(getComplaints()), []);
  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addComplaint({ ...form, createdBy: user.username });
    showToast('Complaint registered!');
    setForm({ customerName: '', phone: '', issue: '', address: '' });
    loadComplaints();
  };

  const handleStatusChange = (id, status) => {
    updateComplaintStatus(id, status);
    loadComplaints();
    showToast(`Status updated to "${status}"`);
  };

  const filtered = [...complaints]
    .reverse()
    .filter(c => filter === 'All' || c.status === filter);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Complaints</h1>
        <p>Register and track customer complaints</p>
      </div>

      <div className="form-card">
        <h2>📝 New Complaint</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Customer Name *</label>
              <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Customer name" required />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" />
            </div>
            <div className="form-field">
              <label>Address</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Customer address" />
            </div>
            <div className="form-field" style={{ gridColumn: 'span 2' }}>
              <label>Issue Description *</label>
              <textarea value={form.issue} onChange={e => setForm({...form, issue: e.target.value})} placeholder="Describe the issue..." required />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-primary" type="submit">Register Complaint</button>
          </div>
        </form>
      </div>

      <div className="form-card">
        <div className="section-header">
          <h2>Complaints ({complaints.length})</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', ...STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  background: filter === s ? '#2563eb' : 'transparent',
                  color: filter === s ? '#fff' : '#94a3b8',
                  border: `1px solid ${filter === s ? '#2563eb' : '#334155'}`,
                  padding: '5px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="empty-msg">No complaints found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(c => (
              <div key={c.id} className="complaint-item">
                <div className="complaint-top">
                  <div>
                    <span className="complaint-name">{c.customerName}</span>
                    {c.phone && <span className="complaint-phone"> · {c.phone}</span>}
                    {c.address && <span className="complaint-phone"> · {c.address}</span>}
                  </div>
                  <span className={`status-badge status-${c.status.replace(' ', '-')}`}>{c.status}</span>
                </div>
                <p className="complaint-issue">{c.issue}</p>
                <div className="complaint-footer">
                  <span className="complaint-date">📅 {new Date(c.createdAt).toLocaleString()} · By: {c.createdBy}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(c.id, s)}
                        disabled={c.status === s}
                        style={{
                          background: c.status === s ? '#1e3a2f' : 'transparent',
                          color: c.status === s ? '#34d399' : '#64748b',
                          border: `1px solid ${c.status === s ? '#10b981' : '#334155'}`,
                          padding: '4px 10px',
                          borderRadius: 5,
                          cursor: c.status === s ? 'default' : 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          transition: 'all 0.2s',
                        }}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  );
};

export default Complaints;
