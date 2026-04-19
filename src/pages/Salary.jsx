import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { useData } from '../context/DataContext';
import { Banknote, Plus, Search, Calendar, Save, Trash2 } from 'lucide-react';

const Salary = () => {
    const { user } = useAuth();
    const { refreshData } = useData();
    const [salaries, setSalaries] = useState(storage.getSalary());
    const [users] = useState(storage.getUsers().filter(u => u.role === 'worker'));
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        workerId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        month: new Date().toISOString().slice(0, 7),
        paymentMode: 'Cash',
        notes: ''
    });

    const handleSave = (e) => {
        e.preventDefault();
        const worker = users.find(u => u.id === formData.workerId);
        if (!worker) return;

        const newPayment = {
            id: Date.now().toString(),
            workerName: worker.name,
            ...formData,
            amount: parseFloat(formData.amount),
            paidBy: user.userId,
            paidByName: user.name,
            createdAt: new Date().toISOString(),
            deleted: false
        };

        const updated = [...salaries, newPayment];
        storage.setSalary(updated);
        setSalaries(updated);
        refreshData();
        setModalOpen(false);
        alert('Salary payment recorded!');
    };

    const isOwner = user.permissions.recordSalary;
    const displaySalaries = isOwner
        ? salaries.filter(s => !s.deleted && (s.workerName.toLowerCase().includes(search.toLowerCase()) || s.month.includes(search)))
        : salaries.filter(s => !s.deleted && s.workerId === user.userId);

    return (
        <div className="salary-page">
            <div className="section-header">
                <h1>{isOwner ? 'Salary Management' : 'My Salary'}</h1>
                {isOwner && (
                    <button className="btn-primary" onClick={() => setModalOpen(true)}>
                        <Plus size={18} /> Record Payment
                    </button>
                )}
            </div>

            <div className="filters-container">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={isOwner ? "Search worker or month..." : "Search month..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {isOwner && <th>Worker</th>}
                            <th>Month</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Mode</th>
                            <th>Notes</th>
                            {isOwner && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displaySalaries.length === 0 ? (
                            <tr><td colSpan={isOwner ? "7" : "5"} className="text-center">No salary payments found.</td></tr>
                        ) : (
                            [...displaySalaries].reverse().map(s => (
                                <tr key={s.id}>
                                    {isOwner && <td><strong>{s.workerName}</strong></td>}
                                    <td>{s.month}</td>
                                    <td><strong>₹{s.amount.toLocaleString('en-IN')}</strong></td>
                                    <td>{new Date(s.date).toLocaleDateString()}</td>
                                    <td><span className="payment-badge">{s.paymentMode}</span></td>
                                    <td>{s.notes || '—'}</td>
                                    {isOwner && (
                                        <td>
                                            <button className="btn-danger btn-sm" onClick={() => alert('Soft-delete logic to be connected')}>
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="modal-header">
                            <h2>Record Salary Payment</h2>
                            <button onClick={() => setModalOpen(false)} className="close-btn"><Plus size={20} style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-group">
                                <label>Select Worker *</label>
                                <select
                                    value={formData.workerId}
                                    onChange={e => setFormData({ ...formData, workerId: e.target.value })}
                                    required
                                >
                                    <option value="">Choose a worker...</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
                                </select>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Amount (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Payment Date *</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>For Month *</label>
                                    <input
                                        type="month"
                                        value={formData.month}
                                        onChange={e => setFormData({ ...formData, month: e.target.value })}
                                        required
                                        max={new Date().toISOString().slice(0, 7)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mode *</label>
                                    <select value={formData.paymentMode} onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}>
                                        <option value="Cash">Cash</option>
                                        <option value="PhonePe">PhonePe</option>
                                        <option value="GPay">GPay</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional details..."
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary"><Save size={18} /> Record Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .btn-danger { background: rgba(248, 113, 113, 0.1); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); padding: 6px; border-radius: 6px; cursor: pointer; }
        .btn-sm { padding: 4px; display: inline-flex; align-items: center; justify-content: center; }
      `}</style>
        </div>
    );
};

export default Salary;
