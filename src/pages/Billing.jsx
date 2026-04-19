import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Customers from './Customers';
import BillList from '../components/BillList';
import { Search, Receipt, CreditCard, Users, Save, IndianRupee, MessageCircle, History } from 'lucide-react';
import { generateWhatsAppLink, formatBillMessage, formatPaymentMessage } from '../utils/whatsapp';

const GenerateBill = () => {
    const { customers, addBill, bills, users } = useData();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [formData, setFormData] = useState({
        generatedDate: new Date().toISOString().split('T')[0],
        tvAmount: 0,
        internetAmount: 0,
        totalAmount: 0,
        serviceType: '',
        generatedBy: user.userId // default to current user
    });

    const handleSelectCustomer = (c) => {
        setSelectedCustomer(c);
        setSearch('');
        const tvActive = c.services?.tv?.active;
        const intActive = c.services?.internet?.active;
        const tvAmt = tvActive ? c.services?.tv?.monthlyRate : 0;
        const intAmt = intActive ? c.services?.internet?.monthlyRate : 0;

        setFormData({
            ...formData,
            tvAmount: tvAmt,
            internetAmount: intAmt,
            totalAmount: tvAmt + intAmt,
            serviceType: (tvActive && intActive) ? 'both' : tvActive ? 'tv' : 'internet'
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        const generator = users.find(u => u.id === formData.generatedBy) || user;

        const newBill = {
            ...formData,
            // Auto-generate a dummy bill number since it's removed from form
            billNumber: 'AUTO-' + Date.now().toString().slice(-6),
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            phone: selectedCustomer.phone,
            boxNumber: selectedCustomer.boxNumber,
            amountPaid: 0,
            balance: formData.totalAmount,
            status: 'Due',
            generatedBy: generator.id || generator.userId,
            generatedByName: generator.name,
            payments: []
        };

        addBill(newBill);
        setSelectedCustomer(null);
        setFormData({
            generatedDate: new Date().toISOString().split('T')[0],
            tvAmount: 0,
            internetAmount: 0,
            totalAmount: 0,
            serviceType: ''
        });

        if (confirm('Bill generated successfully! Share on WhatsApp?')) {
            const msg = formatBillMessage(newBill);
            window.open(generateWhatsAppLink(newBill.phone, msg), '_blank');
        }
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search) ||
            (c.boxNumber || '').includes(search);

        if (!matchesSearch) return false;
        if (filter === 'tv') return c.services?.tv?.active;
        if (filter === 'internet') return c.services?.internet?.active;
        return true;
    }).slice(0, 5);

    return (
        <div className="generate-bill-tab">
            {!selectedCustomer ? (
                <div className="customer-selection colored-box-blue">
                    <div className="box-header">
                        <Users size={20} />
                        <h3>Step 1: Select Customer</h3>
                    </div>
                    <div className="filter-tabs-mini">
                        <button className={`filter-tab-mini ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                        <button className={`filter-tab-mini ${filter === 'tv' ? 'active' : ''}`} onClick={() => setFilter('tv')}>Cable</button>
                        <button className={`filter-tab-mini ${filter === 'internet' ? 'active' : ''}`} onClick={() => setFilter('internet')}>Internet</button>
                    </div>
                    <div className="search-box-large">
                        <Search size={28} />
                        <input
                            type="text"
                            placeholder="Find customer by Name, Phone or ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {search && (
                        <div className="customer-matches">
                            {filteredCustomers.length === 0 ? (
                                <p className="no-matches">No customers found.</p>
                            ) : (
                                filteredCustomers.map(c => (
                                    <div key={c.id} className="customer-match-item" onClick={() => handleSelectCustomer(c)}>
                                        <div className="match-info">
                                            <p className="match-name">{c.name}</p>
                                            <p className="match-meta">{c.phone} {c.boxNumber ? `| Box: ${c.boxNumber}` : ''}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSave} className="bill-form card colored-box-blue">
                    <div className="form-header">
                        <h3>Generating Bill: {selectedCustomer.name}</h3>
                        <button type="button" onClick={() => setSelectedCustomer(null)} className="btn-secondary btn-sm">Change</button>
                    </div>

                    <div className="form-grid-short">
                        <div className="form-group">
                            <label>Bill Date</label>
                            <input
                                type="date"
                                value={formData.generatedDate}
                                onChange={e => setFormData({ ...formData, generatedDate: e.target.value })}
                                required
                            />
                        </div>

                        {selectedCustomer.services?.tv?.active && (
                            <div className="form-group">
                                <label>TV (₹)</label>
                                <input
                                    type="number"
                                    value={formData.tvAmount}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setFormData({ ...formData, tvAmount: val, totalAmount: val + formData.internetAmount });
                                    }}
                                />
                            </div>
                        )}

                        {selectedCustomer.services?.internet?.active && (
                            <div className="form-group">
                                <label>Internet (₹)</label>
                                <input
                                    type="number"
                                    value={formData.internetAmount}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setFormData({ ...formData, internetAmount: val, totalAmount: val + formData.tvAmount });
                                    }}
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>(Generated By)</label>
                            <select
                                value={formData.generatedBy}
                                onChange={e => setFormData({ ...formData, generatedBy: e.target.value })}
                            >
                                <option value="">Default (Auto)</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        <div className="total-display-compact">
                            <span>TOTAL: ₹{formData.totalAmount}</span>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary btn-short">Generate Bill</button>
                </form>
            )}

            <div className="history-section mt-24">
                <div className="section-header-mini">
                    <History size={18} />
                    <h4>Recently Generated Bills</h4>
                </div>
                <BillList filterServiceType={filter} mode="billing" />
            </div>

            <style>{`
                .colored-box-blue { background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); padding: 20px; border-radius: 12px; }
                .box-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; color: var(--accent); }
                .filter-tabs-mini { display: flex; gap: 8px; margin-bottom: 12px; }
                .filter-tab-mini { 
                    padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); 
                    background: var(--bg-card); color: var(--text-secondary); cursor: pointer; 
                    font-size: 0.8rem; font-weight: 600; transition: all 0.2s;
                }
                .filter-tab-mini.active { background: var(--accent); color: white; border-color: var(--accent); }
                .search-box-large { display: flex; align-items: center; gap: 15px; background: var(--bg-card); padding: 12px 20px; border-radius: 8px; border: 1px solid var(--border); }
                .search-box-large input { background: none; border: none; font-size: 1.1rem; color: white; width: 100%; outline: none; }
                .form-grid-short { display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap; }
                .total-display-compact { background: var(--accent); color: white; padding: 10px 15px; border-radius: 6px; font-weight: 800; }
                .btn-short { padding: 10px 20px; width: auto; font-size: 0.9rem; margin-top: 15px; }
                .mt-24 { margin-top: 24px; }
                .section-header-mini { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; opacity: 0.8; }
                .permission-notice { margin-top: 15px; color: #ef4444; font-size: 0.9rem; font-weight: 600; font-style: italic; }
            `}</style>
        </div>
    );
};

const BillPayment = () => {
    const { bills, updateBill, users } = useData();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        mode: 'Cash',
        notes: '',
        billBookNumber: '',
        collectedBy: user.userId // default to current user
    });

    const handleSelectBill = (b) => {
        setSelectedBill(b);
        setPaymentData({ ...paymentData, amount: b.balance });
    };

    const handleSavePayment = (e) => {
        e.preventDefault();
        if (!selectedBill) return;

        const paidAmt = parseFloat(paymentData.amount);
        const collector = users.find(u => u.id === paymentData.collectedBy) || user;

        const newPayment = {
            id: Date.now().toString(),
            amount: paidAmt,
            date: paymentData.date,
            mode: paymentData.mode,
            billBookNumber: paymentData.billBookNumber,
            collectedBy: collector.id || collector.userId,
            collectedByName: collector.name,
            notes: paymentData.notes,
            createdAt: new Date().toISOString()
        };

        const updatedTotalPaid = (selectedBill.amountPaid || 0) + paidAmt;
        const updatedBalance = selectedBill.totalAmount - updatedTotalPaid;

        updateBill(selectedBill.id, {
            amountPaid: updatedTotalPaid,
            balance: updatedBalance,
            status: updatedBalance === 0 ? 'Paid' : 'Partial',
            payments: [...(selectedBill.payments || []), newPayment]
        });

        setSelectedBill(null);
        setSearch('');

        if (confirm('Payment recorded successfully! Share confirmation?')) {
            const msg = formatPaymentMessage(selectedBill.customerName, paidAmt, updatedBalance);
            window.open(generateWhatsAppLink(selectedBill.phone, msg), '_blank');
        }
    };

    const pendingBills = bills.filter(b => b.balance > 0);
    const filteredBills = pendingBills.filter(b => {
        const matchesSearch = (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
            (b.phone || '').includes(search) ||
            (b.billNumber || '').includes(search);

        if (!matchesSearch) return false;
        if (filter === 'tv') return b.serviceType === 'tv' || b.serviceType === 'both';
        if (filter === 'internet') return b.serviceType === 'internet' || b.serviceType === 'both';
        return true;
    }).slice(0, 5);

    // Get all payments for historical view
    const allPayments = bills.flatMap(b => (b.payments || []).map(p => ({
        ...p,
        customerName: b.customerName,
        serviceType: b.serviceType
    })));

    const filteredPayments = allPayments.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'tv') return p.serviceType === 'tv' || p.serviceType === 'both';
        if (filter === 'internet') return p.serviceType === 'internet' || p.serviceType === 'both';
        return true;
    });

    return (
        <div className="bill-payment-tab">
            {!selectedBill ? (
                <div className="bill-selection colored-box-green">
                    <div className="box-header">
                        <CreditCard size={20} />
                        <h3>Step 1: Find Bill for Payment</h3>
                    </div>
                    <div className="filter-tabs-mini">
                        <button className={`filter-tab-mini ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                        <button className={`filter-tab-mini ${filter === 'tv' ? 'active' : ''}`} onClick={() => setFilter('tv')}>Cable</button>
                        <button className={`filter-tab-mini ${filter === 'internet' ? 'active' : ''}`} onClick={() => setFilter('internet')}>Internet</button>
                    </div>
                    <div className="search-box-extra-large">
                        <Search size={32} />
                        <input
                            type="text"
                            placeholder="Search by ID, Name or Phone Number..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {search && (
                        <div className="bill-matches">
                            {filteredBills.length === 0 ? (
                                <p className="no-matches">No pending bills found.</p>
                            ) : (
                                filteredBills.map(b => (
                                    <div key={b.id} className="bill-match-item" onClick={() => handleSelectBill(b)}>
                                        <div className="match-info">
                                            <p className="match-name">{b.customerName}</p>
                                            <p className="match-meta">Amount: ₹{b.totalAmount} | Due: ₹{b.balance}</p>
                                        </div>
                                        <span className={`status-pill ${b.status}`}>{b.status}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSavePayment} className="payment-form card colored-box-green">
                    <div className="form-header">
                        <h3>Payment from {selectedBill.customerName}</h3>
                        <button type="button" onClick={() => setSelectedBill(null)} className="btn-secondary btn-sm">Change</button>
                    </div>

                    <div className="payment-mini-summary">
                        <span>Total Due: <strong>₹{selectedBill.balance}</strong></span>
                    </div>

                    <div className="form-grid-short">
                        <div className="form-group">
                            <label>Recieved (₹)</label>
                            <input
                                type="number"
                                value={paymentData.amount}
                                onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Book Bill # (Opt)</label>
                            <input
                                type="text"
                                value={paymentData.billBookNumber}
                                onChange={e => setPaymentData({ ...paymentData, billBookNumber: e.target.value })}
                                placeholder="Manual book #"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                value={paymentData.date}
                                onChange={e => setPaymentData({ ...paymentData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Mode</label>
                            <select value={paymentData.mode} onChange={e => setPaymentData({ ...paymentData, mode: e.target.value })}>
                                <option value="Cash">Cash</option>
                                <option value="PhonePe">PhonePe</option>
                                <option value="GPay">GPay</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Collected By</label>
                            <select
                                value={paymentData.collectedBy}
                                onChange={e => setPaymentData({ ...paymentData, collectedBy: e.target.value })}
                            >
                                <option value="">Default (Auto)</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary btn-short">Save Payment</button>
                </form>
            )}

            <div className="history-section mt-24">
                <div className="section-header-mini">
                    <History size={18} />
                    <h4>Recent Bill Status</h4>
                </div>
                <BillList filterServiceType={filter} mode="payment" />
            </div>

            <style>{`
                .colored-box-green { background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 12px; }
                .box-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; color: #10b981; }
                .filter-tabs-mini { display: flex; gap: 8px; margin-bottom: 12px; }
                .filter-tab-mini { 
                    padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border); 
                    background: var(--bg-card); color: var(--text-secondary); cursor: pointer; 
                    font-size: 0.8rem; font-weight: 600; transition: all 0.2s;
                }
                .filter-tab-mini.active { background: #10b981; color: white; border-color: #10b981; }
                .search-box-extra-large { display: flex; align-items: center; gap: 20px; background: var(--bg-card); padding: 18px 25px; border-radius: 10px; border: 1px solid var(--border); }
                .search-box-extra-large input { background: none; border: none; font-size: 1.3rem; color: white; width: 100%; outline: none; }
                .payment-mini-summary { background: rgba(16, 185, 129, 0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 15px; font-size: 1rem; color: #10b981; }
            `}</style>
        </div>
    );
};

const Billing = () => {
    const [activeTab, setActiveTab] = useState('customers');

    return (
        <div className="billing-page">
            <div className="billing-nav">
                <button className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
                    <Users size={18} /> Customers
                </button>
                <button className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => setActiveTab('generate')}>
                    <Receipt size={18} /> Generate Bill
                </button>
                <button className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
                    <CreditCard size={18} /> Bill Payment
                </button>
            </div>

            <div className="billing-content">
                {activeTab === 'customers' && <Customers />}
                {activeTab === 'generate' && <GenerateBill />}
                {activeTab === 'payment' && <BillPayment />}
            </div>

            <style>{`
                .billing-nav { display: flex; gap: 8px; border-bottom: 1px solid var(--border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 12px; }
                .tab-btn { 
                  display: flex; align-items: center; gap: 10px; padding: 10px 20px; 
                  background: none; border: 1px solid transparent; border-radius: 8px; 
                  color: var(--text-secondary); cursor: pointer; transition: all 0.2s; 
                  font-weight: 600; white-space: nowrap;
                }
                .tab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
                .tab-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
            `}</style>
        </div>
    );
};

export default Billing;
