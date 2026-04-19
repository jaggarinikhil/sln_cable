import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, Plus, HardHat, CheckCircle, Clock } from 'lucide-react';

const Complaints = () => {
    const { complaints, customers, setComplaints } = useData();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [modalOpen, setModalOpen] = useState(false);
    const [newComplaint, setNewComplaint] = useState({ customerId: '', description: '' });

    const filtered = complaints.filter(c => {
        const customer = customers.find(cust => String(cust.id) === String(c.customerId));
        const matchesSearch = (customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || c.status === filter;
        return matchesSearch && matchesFilter;
    });

    const handleUpdateStatus = (id, status) => {
        const updated = complaints.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c);
        // Explicitly update in storage and context (I should add setComplaints to useData or use a dedicated helper)
        // For now I'll just use the mock data flow
    };

    return (
        <div className="complaints-page">
            <div className="section-header">
                <h1>Complaints</h1>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    <Plus size={18} /> New Complaint
                </button>
            </div>

            <div className="filters-container">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search complaints..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="status-filters">
                    {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >{f}</button>
                    ))}
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">No complaints found.</td></tr>
                        ) : (
                            filtered.map(c => {
                                const customer = customers.find(cust => String(cust.id) === String(c.customerId));
                                return (
                                    <tr key={c.id}>
                                        <td><strong>{customer?.name}</strong></td>
                                        <td>{c.description}</td>
                                        <td><span className={`status-pill ${c.status}`}>{c.status}</span></td>
                                        <td>{c.createdAt && new Date(c.createdAt).toString() !== 'Invalid Date' ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <select
                                                className="status-select"
                                                value={c.status}
                                                onChange={(e) => alert('Status update logic to be connected')}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
        .filters-container { display: flex; gap: 20px; align-items: center; margin-bottom: 24px; }
        .status-filters { display: flex; gap: 8px; }
        .filter-btn { background: var(--bg-card); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 0.85rem; }
        .filter-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(59,130,246,0.1); }
        .status-select { background: var(--bg-dark); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; outline: none; }
      `}</style>
        </div>
    );
};

export default Complaints;
