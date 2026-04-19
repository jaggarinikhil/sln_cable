import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import CustomerModal from '../components/CustomerModal';
import { Search, UserPlus, Phone, MapPin, Box } from 'lucide-react';

const Customers = () => {
    const { customers, addCustomer, updateCustomer } = useData();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const [filter, setFilter] = useState('all');

    const filtered = customers.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search) ||
            (c.boxNumber || '').includes(search);

        if (!matchesSearch) return false;
        if (filter === 'tv') return c.services?.tv?.active;
        if (filter === 'internet') return c.services?.internet?.active;
        return true;
    });

    const handleSave = (data) => {
        if (editingCustomer) {
            updateCustomer(editingCustomer.id, data);
        } else {
            addCustomer(data);
        }
        setModalOpen(false);
        setEditingCustomer(null);
    };

    return (
        <div className="customers-page">
            <div className="section-header">
                <h1>Customers</h1>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    <UserPlus size={18} /> Add Customer
                </button>
            </div>

            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >All Customers</button>
                <button
                    className={`filter-tab ${filter === 'tv' ? 'active' : ''}`}
                    onClick={() => setFilter('tv')}
                >Cable Customers</button>
                <button
                    className={`filter-tab ${filter === 'internet' ? 'active' : ''}`}
                    onClick={() => setFilter('internet')}
                >Internet Customers</button>
            </div>

            <div className="search-bar-full">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search by name, phone or box number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Contact</th>
                            <th>Services</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">No customers found.</td></tr>
                        ) : (
                            filtered.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div className="customer-info">
                                            <p className="customer-name">{c.name || 'Unnamed Customer'}</p>
                                            <p className="customer-address"><MapPin size={12} /> {c.address || 'No Address'}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="contact-info">
                                            <p className="customer-phone"><Phone size={12} /> {c.phone}</p>
                                            {c.boxNumber && <p className="customer-box"><Box size={12} /> {c.boxNumber}</p>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="services-list">
                                            {c.services?.tv?.active && <span className="service-badge service-tv">TV</span>}
                                            {c.services?.internet?.active && <span className="service-badge service-internet">Internet</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="status-badge active">Active</span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-edit"
                                            onClick={() => { setEditingCustomer(c); setModalOpen(true); }}
                                        >Edit</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <CustomerModal
                    customer={editingCustomer}
                    onClose={() => { setModalOpen(false); setEditingCustomer(null); }}
                    onSave={handleSave}
                />
            )}

            <style>{`
        .filter-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }
        .filter-tab {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-secondary);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .filter-tab:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }
        .filter-tab.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .search-bar-full {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 20px;
          margin-bottom: 24px;
        }
        .search-bar-full input {
          background: none;
          border: none;
          color: var(--text-primary);
          outline: none;
          width: 100%;
          font-size: 1rem;
        }
        .customer-name { font-weight: 700; color: var(--text-primary); }
        .customer-address, .customer-phone, .customer-box { 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          font-size: 0.8rem; 
          color: var(--text-secondary); 
          margin-top: 4px; 
        }
        .status-badge { 
          padding: 2px 10px; 
          border-radius: 20px; 
          font-size: 0.75rem; 
          font-weight: 700;
        }
        .status-badge.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .text-center { text-align: center; padding: 40px !important; color: var(--text-secondary); }
      `}</style>
        </div>
    );
};

export default Customers;
