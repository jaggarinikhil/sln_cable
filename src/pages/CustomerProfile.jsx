import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { MapPin, Phone, Box, Calendar, IndianRupee, HardHat, AlertCircle, ArrowLeft } from 'lucide-react';
import BillList from '../components/BillList';
import CustomerHistory from '../components/CustomerHistory';

const CustomerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { customers, bills, complaints } = useData();

    const customer = customers.find(c => c.id === id);
    const customerBills = bills.filter(b => b.customerId === id);
    const totalOutstanding = customerBills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const customerComplaints = complaints.filter(c => c.customerId === id);

    if (!customer) return <div>Customer not found.</div>;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <button onClick={() => navigate('/customers')} className="back-btn"><ArrowLeft size={20} /></button>
                <div className="header-main">
                    <h1>{customer.name}</h1>
                    <div className="header-badges">
                        <span className="status-badge active">Active</span>
                        {customer.services.tv.active && <span className="service-badge service-tv">TV</span>}
                        {customer.services.internet.active && <span className="service-badge service-internet">Internet</span>}
                    </div>
                </div>
            </div>

            <div className="profile-grid">
                <div className="profile-sidebar">
                    <div className="card info-card">
                        <h3>Contact Info</h3>
                        <div className="info-item">
                            <Phone size={16} />
                            <span>{customer.phone}</span>
                        </div>
                        <div className="info-item">
                            <MapPin size={16} />
                            <span>{customer.address}</span>
                        </div>
                        {customer.boxNumber && (
                            <div className="info-item">
                                <Box size={16} />
                                <span>Box: {customer.boxNumber}</span>
                            </div>
                        )}
                        <div className="info-item">
                            <Calendar size={16} />
                            <span>Since: {new Date(customer.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className={`card balance-card ${totalOutstanding > 0 ? 'due' : 'cleared'}`}>
                        <h3>Outstanding Balance</h3>
                        <div className="balance-value">
                            <IndianRupee size={24} />
                            <span>{totalOutstanding.toLocaleString('en-IN')}</span>
                        </div>
                        <p>{totalOutstanding > 0 ? `${customerBills.filter(b => b.balance > 0).length} bills pending` : 'All bills paid'}</p>
                    </div>
                </div>

                <div className="profile-main">
                    <div className="card full-history-card">
                        <div className="card-header">
                            <h3>Billing & Payment History</h3>
                            <button className="btn-secondary btn-sm" onClick={() => navigate('/billing')}>Create New Bill</button>
                        </div>
                        <CustomerHistory customerId={id} />
                    </div>

                    <div className="card complaints-card">
                        <div className="card-header">
                            <h3>Complaints</h3>
                            <button className="btn-secondary btn-sm" onClick={() => navigate('/complaints')}>View All</button>
                        </div>
                        <div className="complaints-mini">
                            {customerComplaints.length === 0 ? (
                                <p className="empty-msg">No active complaints.</p>
                            ) : (
                                customerComplaints.slice(0, 3).map(c => (
                                    <div key={c.id} className="complaint-item">
                                        <div className="complaint-info">
                                            <p className="complaint-desc">{c.description}</p>
                                            <p className="complaint-date">{new Date(c.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`status-tag ${c.status}`}>{c.status}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
        .back-btn { background: none; border: 1px solid var(--border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: all 0.2s; }
        .back-btn:hover { background: var(--bg-card); color: var(--text-primary); border-color: var(--text-secondary); }
        .header-main h1 { font-size: 2rem; font-weight: 800; margin-bottom: 8px; }
        .header-badges { display: flex; gap: 8px; }
        
        .profile-grid { display: grid; grid-template-columns: 300px 1fr; gap: 24px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .card h3 { font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
        
        .info-item { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--text-primary); font-size: 0.95rem; }
        .info-item svg { color: var(--accent); }
        
        .balance-card.due { border-left: 6px solid #f87171; }
        .balance-card.cleared { border-left: 6px solid #10b981; }
        .balance-value { display: flex; align-items: center; gap: 4px; font-size: 2.5rem; font-weight: 800; margin-bottom: 4px; color: var(--text-primary); }
        .balance-card p { font-size: 0.85rem; color: var(--text-secondary); }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-header h3 { margin-bottom: 0; }
        
        .table-mini table { width: 100%; border-collapse: collapse; }
        .table-mini th { text-align: left; font-size: 0.75rem; color: var(--text-secondary); padding: 8px; border-bottom: 1px solid var(--border); text-transform: uppercase; }
        .table-mini td { padding: 12px 8px; font-size: 0.9rem; border-bottom: 1px solid var(--border); }
        .text-due { color: #f87171; font-weight: 700; }
        
        .status-pill { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .status-pill.Paid { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.Due { background: rgba(248, 113, 113, 0.1); color: #f87171; }
        .status-pill.Partial { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        
        .complaint-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .complaint-item:last-child { border-bottom: none; }
        .complaint-desc { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; }
        .complaint-date { font-size: 0.75rem; color: var(--text-secondary); }
        .status-tag { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        .status-tag.Pending { background: #fee2e2; color: #ef4444; }
        .status-tag.Completed { background: #dcfce7; color: #16a34a; }
        
        @media (max-width: 1024px) {
          .profile-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
};

export default CustomerProfile;
