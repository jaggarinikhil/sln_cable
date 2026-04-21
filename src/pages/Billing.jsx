import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import BillList from '../components/BillList';
import {
    Search, Receipt, Tv, Wifi,
    ChevronRight, X, ArrowRight
} from 'lucide-react';
import { generateWhatsAppLink, formatBillMessage } from '../utils/whatsapp';

/* ─── Generate Bill Modal ───────────────────────────────────── */
const GenerateBillModal = ({ onClose, preselectedCustomer }) => {
    const { customers, addBill, bills, users } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const initCustomer = (c) => {
        if (!c) return null;
        return c;
    };
    const initForm = (c) => {
        const base = { generatedDate: new Date().toISOString().split('T')[0], tvAmount: 0, internetAmount: 0, totalAmount: 0, serviceType: '', generatedBy: user.userId };
        if (!c) return base;
        const tvActive = c.services?.tv?.active;
        const intActive = c.services?.internet?.active;
        const tvAmt = tvActive ? (c.services?.tv?.monthlyRate || 0) : 0;
        return { ...base, tvAmount: tvAmt, internetAmount: 0, totalAmount: tvAmt, serviceType: (tvActive && intActive) ? 'both' : tvActive ? 'tv' : 'internet' };
    };

    const [selectedCustomer, setSelectedCustomer] = useState(() => initCustomer(preselectedCustomer));
    const [formData, setFormData] = useState(() => initForm(preselectedCustomer));

    const handleSelectCustomer = (c) => {
        setSelectedCustomer(c);
        setSearch('');
        const tvActive = c.services?.tv?.active;
        const intActive = c.services?.internet?.active;
        const tvAmt = tvActive ? (c.services?.tv?.monthlyRate || 0) : 0;
        const defaultType = (tvActive && intActive) ? 'both' : tvActive ? 'tv' : 'internet';
        setFormData(prev => ({
            ...prev, tvAmount: tvAmt, internetAmount: 0, totalAmount: tvAmt,
            serviceType: defaultType
        }));
    };

    const handleServiceTypeChange = (type) => {
        setFormData(p => {
            const tvAmt = type === 'internet' ? 0 : p.tvAmount;
            const intAmt = type === 'tv' ? 0 : p.internetAmount;
            return { ...p, serviceType: type, tvAmount: tvAmt, internetAmount: intAmt, totalAmount: tvAmt + intAmt };
        });
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;
        const generator = users.find(u => u.id === formData.generatedBy) || user;
        const newBill = {
            ...formData,
            billNumber: 'AUTO-' + Date.now().toString().slice(-6),
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            phone: selectedCustomer.phone,
            boxNumber: selectedCustomer.boxNumber,
            amountPaid: 0, balance: formData.totalAmount, status: 'Due',
            generatedBy: generator.id || generator.userId,
            generatedByName: generator.name, payments: []
        };
        addBill(newBill);
        onClose();
        if (confirm('Bill generated! Share on WhatsApp?')) {
            window.open(generateWhatsAppLink(newBill.phone, formatBillMessage(newBill)), '_blank');
        }
    };

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) || (c.boxNumber || '').includes(search)
    ).slice(0, 6);

    return (
        <div className="bm-overlay" onClick={onClose}>
            <div className="bm-sheet" onClick={e => e.stopPropagation()}>
                <div className="bm-header">
                    <div className="bm-header-icon blue"><Receipt size={20} /></div>
                    <div>
                        <div className="bm-header-title">Generate Bill</div>
                        <div className="bm-header-sub">Select customer and confirm amounts</div>
                    </div>
                    <button className="bm-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="bm-body">
                    {!selectedCustomer ? (
                        <div className="bm-section">
                            <div className="bm-section-label">Select Customer</div>
                            <div className="bl-search">
                                <Search size={16} className="bl-search-icon" />
                                <input
                                    type="text" placeholder="Search name, phone or box..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                />
                                {search && <button className="bl-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
                            </div>
                            {search && (
                                <div className="bm-results">
                                    {filteredCustomers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 8 }}>No customer found</p>
                                            <button
                                                type="button"
                                                onClick={() => { onClose(); navigate('/customers', { state: { createCustomer: true, name: search } }); }}
                                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.4)', color: 'var(--accent)', borderRadius: 10, padding: '9px 16px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                            >
                                                + Create new customer "{search}"
                                            </button>
                                        </div>
                                    ) : filteredCustomers.map(c => (
                                        <div key={c.id} className="bm-result-row" onClick={() => handleSelectCustomer(c)}>
                                            <div className="bm-result-avatar">{getInitials(c.name)}</div>
                                            <div className="bm-result-info">
                                                <p className="bm-result-name">{c.name}</p>
                                                <p className="bm-result-meta">
                                                    {c.phone}{c.boxNumber ? ` · Box ${c.boxNumber}` : ''}
                                                    {c.services?.tv?.active && <span className="bl-svc-tag tv"><Tv size={10} /></span>}
                                                    {c.services?.internet?.active && <span className="bl-svc-tag net"><Wifi size={10} /></span>}
                                                </p>
                                            </div>
                                            <ChevronRight size={15} style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!search && (
                                <p className="bm-hint">Start typing to search customers</p>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSave}>
                            <div className="bm-customer-chip">
                                <div className="bm-chip-avatar">{getInitials(selectedCustomer.name)}</div>
                                <div className="bm-chip-info">
                                    <p className="bm-chip-name">{selectedCustomer.name}</p>
                                    <p className="bm-chip-sub">{selectedCustomer.phone}{selectedCustomer.boxNumber ? ` · Box ${selectedCustomer.boxNumber}` : ''}</p>
                                </div>
                                <button type="button" className="bm-chip-change" onClick={() => setSelectedCustomer(null)}>Change</button>
                            </div>

                            <div className="svc-type-row">
                                <span className="svc-type-label">Service</span>
                                <div className="svc-type-tabs">
                                    {selectedCustomer.services?.tv?.active && (
                                        <button type="button"
                                            className={`svc-type-btn ${formData.serviceType === 'tv' ? 'svc-active-tv' : ''}`}
                                            onClick={() => handleServiceTypeChange('tv')}>
                                            <Tv size={12} /> TV
                                        </button>
                                    )}
                                    {selectedCustomer.services?.internet?.active && (
                                        <button type="button"
                                            className={`svc-type-btn ${formData.serviceType === 'internet' ? 'svc-active-net' : ''}`}
                                            onClick={() => handleServiceTypeChange('internet')}>
                                            <Wifi size={12} /> Internet
                                        </button>
                                    )}
                                    {selectedCustomer.services?.tv?.active && selectedCustomer.services?.internet?.active && (
                                        <button type="button"
                                            className={`svc-type-btn ${formData.serviceType === 'both' ? 'svc-active-both' : ''}`}
                                            onClick={() => handleServiceTypeChange('both')}>
                                            Both
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="bm-form-grid">
                                <div className="form-group">
                                    <label>Bill Date</label>
                                    <input type="date" value={formData.generatedDate}
                                        onChange={e => setFormData(p => ({ ...p, generatedDate: e.target.value }))} required />
                                </div>
                                {(formData.serviceType === 'tv' || formData.serviceType === 'both') && (
                                    <div className="form-group">
                                        <label><Tv size={12} style={{ display: 'inline', marginRight: 4 }} />Cable TV (₹)</label>
                                        <input type="number" value={formData.tvAmount === 0 ? '' : formData.tvAmount} placeholder="0"
                                            onChange={e => { const v = parseFloat(e.target.value) || 0; setFormData(p => ({ ...p, tvAmount: v, totalAmount: v + p.internetAmount })); }} />
                                    </div>
                                )}
                                {(formData.serviceType === 'internet' || formData.serviceType === 'both') && (
                                    <div className="form-group">
                                        <label>
                                            <Wifi size={12} style={{ display: 'inline', marginRight: 4 }} />Internet (₹)
                                        </label>
                                        <input type="number" value={formData.internetAmount === 0 ? '' : formData.internetAmount} placeholder="Enter amount"
                                            onChange={e => { const v = parseFloat(e.target.value) || 0; setFormData(p => ({ ...p, internetAmount: v, totalAmount: v + p.tvAmount })); }} />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Generated By</label>
                                    <select value={formData.generatedBy} onChange={e => setFormData(p => ({ ...p, generatedBy: e.target.value }))}>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bm-total">
                                <span>Total Amount</span>
                                <strong>₹{formData.totalAmount.toLocaleString('en-IN')}</strong>
                            </div>

                            <button type="submit" className="bm-submit blue">
                                <Receipt size={17} /> Generate Bill
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Billing Page ──────────────────────────────────────────── */
const Billing = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { bills, customers } = useData();
    const preselectedCustomer = location.state?.customerId
        ? customers.find(c => c.id === location.state.customerId) || null
        : null;
    const [modal, setModal] = useState(
        location.state?.tab === 'generate' ? 'generate' : null
    );
    const [dateMode, setDateMode] = useState('today');
    const [singleDate, setSingleDate] = useState('');
    const [svcFilter, setSvcFilter] = useState(location.state?.service || 'all');

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

    const filteredBills = bills.filter(b => {
        const date = b.generatedDate;
        if (dateMode === 'today') return date === todayStr;
        if (dateMode === 'yesterday') return date === daysAgo(1);
        if (dateMode === 'last15') return date >= daysAgo(15);
        if (dateMode === 'last30') return date >= daysAgo(30);
        if (dateMode === 'last6m') return date >= daysAgo(180);
        if (dateMode === 'single') return date === singleDate;
        return true;
    });
    const billCount = filteredBills.length;
    const totalBilled = filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const pendingCount = bills.filter(b => b.balance > 0).length;

    const periodLabel = { today: 'Today', yesterday: 'Yesterday', last15: 'Last 15 Days', last30: 'Last Month', last6m: 'Last 6 Months', all: 'All Time', single: singleDate ? new Date(singleDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Date' }[dateMode] || 'Today';

    return (
        <div className="billing-page">
            <div className="bl-page-header">
                <h1 className="bl-page-title">Billing</h1>
                <p className="bl-page-sub">Generate and manage customer bills</p>
            </div>

            {/* Action Card FIRST */}
            <div className="bl-action-grid">
                <button className="bl-action-card bl-action-blue" onClick={() => setModal('generate')}>
                    <div className="bl-action-icon"><Receipt size={28} /></div>
                    <div className="bl-action-text">
                        <p className="bl-action-title">Generate Bill</p>
                        <p className="bl-action-sub">Create a new bill for a customer</p>
                    </div>
                    <ArrowRight size={20} className="bl-action-arrow" />
                </button>
            </div>

            {/* Dynamic Stats (update with filter) */}
            <div className="bl-stats">
                <div className="bl-stat">
                    <span className="bl-stat-label">Bills · {periodLabel}</span>
                    <span className="bl-stat-value accent">{billCount}</span>
                </div>
                <div className="bl-stat">
                    <span className="bl-stat-label">Total Billed · {periodLabel}</span>
                    <span className="bl-stat-value accent">₹{totalBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="bl-stat bl-stat-clickable" onClick={() => navigate('/payments', { state: { tab: 'pending' } })}>
                    <span className="bl-stat-label">Pending Bills</span>
                    <span className="bl-stat-value orange">{pendingCount}</span>
                    <span className="bl-stat-hint">view pending →</span>
                </div>
            </div>

            {/* BillList (controlled filter drives stats above) */}
            <div className="bl-history-section">
                <div className="bl-history-tabs">
                    <div className="bl-htab active"><Receipt size={14} /> Recent Bills</div>
                </div>
                <BillList
                    mode="billing"
                    dateMode={dateMode}
                    singleDate={singleDate}
                    onDateModeChange={setDateMode}
                    onSingleDateChange={setSingleDate}
                    filterServiceType={svcFilter}
                    renderExtraFilters={() => (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block' }} />
                            <select
                                value={svcFilter}
                                onChange={e => setSvcFilter(e.target.value)}
                                style={{ background: svcFilter !== 'all' ? 'rgba(99,102,241,0.12)' : 'none', border: `1.5px solid ${svcFilter !== 'all' ? 'var(--accent)' : 'var(--border)'}`, color: svcFilter !== 'all' ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                            >
                                <option value="all">All Services</option>
                                <option value="tv">TV</option>
                                <option value="internet">Internet</option>
                            </select>
                        </div>
                    )}
                />
            </div>

            {modal === 'generate' && <GenerateBillModal onClose={() => setModal(null)} preselectedCustomer={preselectedCustomer} />}

            <style>{`
                .billing-page { padding: 28px 32px; }

                .bl-page-header { margin-bottom: 20px; }
                .bl-page-title {
                    font-size: 1.8rem; font-weight: 800;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
                }
                .bl-page-sub { color: var(--text-secondary); font-size: 0.88rem; margin-top: 3px; }

                .bl-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
                .bl-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
                .bl-stat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
                .bl-stat-value { font-size: 1.25rem; font-weight: 800; }
                .bl-stat-value.accent { color: var(--accent); }
                .bl-stat-value.orange { color: #f59e0b; }
                .bl-stat-clickable { cursor: pointer; transition: all 0.2s; }
                .bl-stat-clickable:hover { border-color: var(--accent); background: rgba(99,102,241,0.07); transform: translateY(-1px); }
                .bl-stat-hint { font-size: 0.65rem; color: var(--text-secondary); opacity: 0; transition: opacity 0.2s; }
                .bl-stat-clickable:hover .bl-stat-hint { opacity: 1; }

                .bl-action-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 28px; }
                .bl-action-card {
                    display: flex; align-items: center; gap: 16px;
                    background: var(--bg-card); border: 1.5px solid var(--border);
                    border-radius: 18px; padding: 22px 20px;
                    cursor: pointer; text-align: left; font-family: inherit;
                    transition: all 0.22s; color: var(--text-primary);
                }
                .bl-action-blue:hover { border-color: var(--accent); background: rgba(99,102,241,0.07); }
                .bl-action-icon {
                    width: 54px; height: 54px; border-radius: 16px; flex-shrink: 0;
                    background: rgba(99,102,241,0.12); color: var(--accent);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s;
                }
                .bl-action-blue:hover .bl-action-icon { transform: scale(1.08); }
                .bl-action-text { flex: 1; min-width: 0; }
                .bl-action-title { font-weight: 700; font-size: 1rem; margin-bottom: 3px; }
                .bl-action-sub { font-size: 0.78rem; color: var(--text-secondary); }
                .bl-action-arrow { color: var(--text-secondary); flex-shrink: 0; transition: transform 0.2s; }
                .bl-action-card:hover .bl-action-arrow { transform: translateX(4px); }

                .bl-history-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; overflow: visible; }
                .bl-history-tabs {
                    display: flex; border-bottom: 1px solid var(--border);
                    background: rgba(255,255,255,0.02);
                }
                .bl-htab {
                    display: flex; align-items: center; gap: 7px;
                    padding: 13px 20px; background: none; border: none;
                    border-bottom: 2px solid transparent; color: var(--text-secondary);
                    font-weight: 600; font-size: 0.85rem;
                    transition: all 0.2s; margin-bottom: -1px;
                }
                .bl-htab.active { color: var(--text-primary); border-bottom-color: var(--accent); }

                /* Modal */
                .bm-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.72);
                    z-index: 1000; display: flex; align-items: flex-end; justify-content: center;
                    backdrop-filter: blur(4px);
                }
                @media (min-width: 640px) { .bm-overlay { align-items: center; padding: 24px; } }
                .bm-sheet {
                    background: var(--bg-card); border-radius: 24px 24px 0 0;
                    width: 100%; max-width: 540px; max-height: 92vh;
                    display: flex; flex-direction: column; overflow: hidden;
                    border: 1px solid var(--border);
                    animation: bmSlideUp 0.25s cubic-bezier(0.4,0,0.2,1);
                }
                @media (min-width: 640px) { .bm-sheet { border-radius: 24px; max-height: 88vh; } }
                @keyframes bmSlideUp {
                    from { transform: translateY(32px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .bm-header {
                    display: flex; align-items: center; gap: 14px;
                    padding: 18px 20px; border-bottom: 1px solid var(--border);
                    background: rgba(255,255,255,0.02); flex-shrink: 0;
                }
                .bm-header-icon {
                    width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
                    background: rgba(99,102,241,0.15); color: var(--accent);
                    display: flex; align-items: center; justify-content: center;
                }
                .bm-header-icon.blue { background: rgba(99,102,241,0.15); color: var(--accent); }
                .bm-header-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
                .bm-header-sub { font-size: 0.76rem; color: var(--text-secondary); margin-top: 2px; }
                .bm-close {
                    margin-left: auto; background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    color: var(--text-secondary); border-radius: 9px; padding: 7px;
                    cursor: pointer; display: flex; align-items: center; transition: all 0.2s;
                }
                .bm-close:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
                .bm-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
                .bm-section { display: flex; flex-direction: column; gap: 10px; }
                .bm-section-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
                .bm-customer-chip {
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(99,102,241,0.07); border: 1.5px solid rgba(99,102,241,0.25);
                    border-radius: 14px; padding: 12px 14px; margin-bottom: 4px;
                }
                .bm-chip-avatar {
                    width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
                    background: var(--accent-gradient); color: white;
                    font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; justify-content: center;
                }
                .bm-chip-info { flex: 1; min-width: 0; }
                .bm-chip-name { font-weight: 700; font-size: 0.9rem; }
                .bm-chip-sub { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
                .bm-chip-change {
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    color: var(--text-secondary); padding: 5px 11px;
                    border-radius: 8px; font-size: 0.78rem; font-weight: 600;
                    cursor: pointer; transition: all 0.2s; white-space: nowrap;
                }
                .bm-chip-change:hover { color: var(--text-primary); border-color: var(--border-bright); }
                .bl-search {
                    display: flex; align-items: center; gap: 10px;
                    background: rgba(0,0,0,0.2); border: 1px solid var(--border);
                    border-radius: 12px; padding: 11px 14px; transition: all 0.2s;
                }
                .bl-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
                .bl-search-icon { color: var(--text-secondary); flex-shrink: 0; }
                .bl-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                .bl-search input::placeholder { color: var(--text-secondary); }
                .bl-search-clear { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; border-radius: 4px; display: flex; }
                .bl-search-clear:hover { color: var(--text-primary); }
                .bm-results { display: flex; flex-direction: column; gap: 6px; }
                .bm-empty { color: var(--text-secondary); font-size: 0.84rem; padding: 4px 0; }
                .bm-hint { color: var(--text-secondary); font-size: 0.82rem; text-align: center; padding: 16px 0; opacity: 0.7; }
                .bm-result-row {
                    display: flex; align-items: center; gap: 12px;
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
                    border-radius: 11px; padding: 11px 14px; cursor: pointer; transition: all 0.2s;
                }
                .bm-result-row:hover { border-color: var(--accent); background: rgba(99,102,241,0.06); }
                .bm-result-avatar {
                    width: 34px; height: 34px; border-radius: 10px;
                    background: var(--accent-gradient); color: white;
                    font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .bm-result-info { flex: 1; min-width: 0; }
                .bm-result-name { font-weight: 700; font-size: 0.88rem; }
                .bm-result-meta { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
                .bl-svc-tag { display: inline-flex; align-items: center; padding: 2px 5px; border-radius: 4px; }
                .bl-svc-tag.tv { background: rgba(168,85,247,0.15); color: #a855f7; }
                .bl-svc-tag.net { background: rgba(6,182,212,0.15); color: #06b6d4; }
                .bm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
                .bm-total {
                    display: flex; align-items: center; justify-content: space-between;
                    background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
                    border-radius: 12px; padding: 13px 16px; margin-bottom: 14px;
                    color: var(--text-primary); font-size: 0.95rem;
                }
                .bm-total strong { font-size: 1.2rem; font-weight: 800; color: var(--accent); }
                .svc-type-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
                .svc-type-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); white-space: nowrap; }
                .svc-type-tabs { display: flex; gap: 6px; }
                .svc-type-btn {
                    display: flex; align-items: center; gap: 5px;
                    padding: 6px 14px; border-radius: 9px; font-size: 0.8rem; font-weight: 600;
                    border: 1px solid var(--border); background: none;
                    color: var(--text-secondary); cursor: pointer;
                    transition: all 0.18s; font-family: inherit;
                }
                .svc-type-btn:hover { color: var(--text-primary); border-color: var(--border-bright); }
                .svc-active-tv { border-color: #a855f7 !important; color: #a855f7 !important; background: rgba(168,85,247,0.1) !important; }
                .svc-active-net { border-color: #06b6d4 !important; color: #06b6d4 !important; background: rgba(6,182,212,0.1) !important; }
                .svc-active-both { border-color: var(--accent) !important; color: var(--accent) !important; background: rgba(99,102,241,0.1) !important; }
                .plan-rate-hint { margin-left: 8px; font-size: 0.68rem; font-weight: 600; padding: 1px 6px; border-radius: 5px; background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
                .bm-submit {
                    width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
                    padding: 13px; border: none; border-radius: 14px;
                    font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit;
                    transition: all 0.2s;
                }
                .bm-submit.blue {
                    background: var(--accent-gradient); color: white;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.35);
                }
                .bm-submit.blue:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.45); transform: translateY(-1px); }

                @media (max-width: 768px) {
                    .billing-page { padding: 12px; }
                    .bl-stats { gap: 8px; }
                    .bl-stat { padding: 12px 10px; }
                    .bl-stat-label { font-size: 0.65rem; }
                    .bl-stat-value { font-size: 1rem; }
                    .bm-form-grid { grid-template-columns: 1fr 1fr; }
                }
                @media (max-width: 600px) {
                    .billing-page { padding: 10px 8px; }
                    .bl-page-header { margin-bottom: 14px; }
                    .bl-action-grid { margin-bottom: 16px; }
                    .bl-action-card { padding: 16px 14px; gap: 12px; }
                    .bl-action-icon { width: 44px; height: 44px; border-radius: 12px; }
                    .bl-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
                    .bl-stat { padding: 10px 10px; }
                    /* Selects and date inputs full-width on mobile */
                    .bm-body select,
                    .bm-body input[type="date"],
                    .bm-body input[type="number"],
                    .bm-body input[type="text"] { font-size: 16px !important; width: 100%; }
                    /* Bottom sheet on mobile ≤600px */
                    .bm-overlay { align-items: flex-end !important; padding: 0 !important; }
                    .bm-sheet { border-radius: 20px 20px 0 0 !important; max-width: 100% !important; max-height: 95vh !important; }
                    .bm-body { padding: 14px 16px; }
                    .bm-header { padding: 14px 16px; }
                    /* Service type tabs wrap on small screens */
                    .svc-type-row { flex-wrap: wrap; gap: 8px; }
                    .svc-type-tabs { flex-wrap: wrap; }
                }
                @media (max-width: 480px) {
                    .bm-form-grid { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 400px) {
                    .bl-stats { grid-template-columns: 1fr; }
                    .bm-form-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default Billing;
