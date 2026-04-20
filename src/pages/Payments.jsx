import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import BillList from '../components/BillList';
import {
    Search, CreditCard, Tv, Wifi,
    X, IndianRupee, ArrowRight
} from 'lucide-react';
import { generateWhatsAppLink, formatPaymentMessage } from '../utils/whatsapp';

/* ─── Record Payment Modal ──────────────────────────────────── */
const RecordPaymentModal = ({ onClose, preselectedCustomer }) => {
    const { bills, customers, updateBill, updateMultipleBills, users } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(preselectedCustomer || null);
    const [paymentData, setPaymentData] = useState({
        amount: '', date: new Date().toISOString().split('T')[0],
        mode: 'Cash', billBookNumber: '', collectedBy: user.userId
    });
    // { [billId]: 'tv' | 'internet' | 'both' } — only relevant for serviceType==='both' bills
    const [billSvcChoices, setBillSvcChoices] = useState({});

    // How much of this bill is being paid given the service choice
    const effectiveBalance = (bill, choice) => {
        if (choice === 'skip') return 0;
        if (bill.serviceType !== 'both') return bill.balance;
        // If one service was already paid in a prior session, balance already reflects remaining
        if (bill.tvPaid || bill.internetPaid) return bill.balance;
        const c = choice || 'both';
        if (c === 'tv') return bill.tvAmount || bill.balance;
        if (c === 'internet') return bill.internetAmount || bill.balance;
        return bill.balance;
    };

    // Pending bills for a given customer, oldest first
    const getPendingBills = (customerId) =>
        bills
            .filter(b => b.customerId === customerId && b.balance > 0)
            .sort((a, b) => new Date(a.generatedDate) - new Date(b.generatedDate));

    const customerPendingBills = selectedCustomer ? getPendingBills(selectedCustomer.id) : [];
    const totalOutstanding = customerPendingBills.reduce((s, b) => s + effectiveBalance(b, billSvcChoices[b.id]), 0);

    const updateSvcChoice = (billId, choice) => {
        const newChoices = { ...billSvcChoices, [billId]: choice };
        setBillSvcChoices(newChoices);
        const total = customerPendingBills.reduce((s, b) => s + effectiveBalance(b, newChoices[b.id]), 0);
        setPaymentData(p => ({ ...p, amount: total > 0 ? total : '' }));
    };

    const handleSelectCustomer = (c) => {
        setSelectedCustomer(c);
        setSearch('');
        setBillSvcChoices({});
        const outstanding = getPendingBills(c.id).reduce((s, b) => s + b.balance, 0);
        setPaymentData(p => ({ ...p, amount: outstanding > 0 ? outstanding : '' }));
    };

    // Distribute payment oldest-bill-first, respecting per-bill service choices
    const handleSavePayment = (e) => {
        e.preventDefault();
        if (!selectedCustomer || customerPendingBills.length === 0) return;
        const collector = users.find(u => u.id === paymentData.collectedBy) || user;
        const totalPaid = parseFloat(paymentData.amount) || 0;
        const paymentSessionId = `pay_${Date.now()}`;

        // Pre-calculate distribution for logging
        const distribution = [];
        let tempRemaining = totalPaid;
        for (const bill of customerPendingBills) {
            if (tempRemaining <= 0) break;
            const choice = billSvcChoices[bill.id] || 'both';
            const effBal = effectiveBalance(bill, choice);
            const allocated = Math.min(tempRemaining, effBal);
            if (allocated <= 0) continue;
            tempRemaining -= allocated;
            const newBalance = Math.max(0, bill.balance - allocated);

            // Track which services are now paid on 'both' bills
            let tvPaidUpdate = bill.tvPaid || false;
            let internetPaidUpdate = bill.internetPaid || false;
            if (bill.serviceType === 'both' && !bill.tvPaid && !bill.internetPaid) {
                if (choice === 'tv') tvPaidUpdate = true;
                else if (choice === 'internet') internetPaidUpdate = true;
                else { tvPaidUpdate = true; internetPaidUpdate = true; } // both
            }

            distribution.push({ bill, allocated, choice, closes: newBalance <= 0, newBalance, tvPaidUpdate, internetPaidUpdate });
        }

        // Build all bill updates atomically
        const billUpdates = distribution.map(({ bill, allocated, choice, closes, newBalance, tvPaidUpdate, internetPaidUpdate }) => {
            const svcLabel = bill.serviceType === 'both' && (choice === 'tv' || choice === 'internet')
                ? ` (${choice === 'tv' ? 'TV only' : 'Internet only'})` : '';
            const otherBills = distribution.filter(d => d.bill.id !== bill.id);
            const note = distribution.length > 1
                ? `Part of ₹${totalPaid.toLocaleString('en-IN')} payment across ${distribution.length} bills${svcLabel}.${closes ? ' This bill is now CLOSED.' : ` Partial — ₹${newBalance.toLocaleString('en-IN')} still due.`}${otherBills.length ? ` Also applied to: ${otherBills.map(d => `Bill #${d.bill.billNumber} (₹${d.allocated.toLocaleString('en-IN')}${d.closes ? ' closed' : ' partial'})`).join(', ')}.` : ''}`
                : closes ? `Bill fully closed${svcLabel}.` : `Partial payment${svcLabel} — ₹${newBalance.toLocaleString('en-IN')} still due.`;

            const newPayment = {
                id: `${paymentSessionId}_${bill.id}`,
                paymentSessionId,
                amount: allocated,
                date: paymentData.date,
                mode: paymentData.mode,
                billBookNumber: paymentData.billBookNumber,
                collectedBy: collector.id || collector.userId,
                collectedByName: collector.name,
                note,
                closedBill: closes,
                createdAt: new Date().toISOString()
            };

            const updatedPaid = (bill.amountPaid || 0) + allocated;
            const updates = {
                amountPaid: updatedPaid,
                balance: Math.max(0, newBalance),
                status: newBalance <= 0 ? 'Paid' : 'Partial',
                payments: [...(bill.payments || []), newPayment]
            };
            if (bill.serviceType === 'both') {
                updates.tvPaid = tvPaidUpdate;
                updates.internetPaid = internetPaidUpdate;
            }
            return { id: bill.id, updates };
        });

        updateMultipleBills(billUpdates);

        onClose();
        const newOutstanding = Math.max(0, totalOutstanding - totalPaid);
        if (confirm('Payment saved! Share confirmation?')) {
            window.open(generateWhatsAppLink(selectedCustomer.phone, formatPaymentMessage(selectedCustomer.name, totalPaid, newOutstanding)), '_blank');
        }
    };

    const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

    // Customers who have at least one pending bill
    const customersWithPending = customers.filter(c =>
        bills.some(b => b.customerId === c.id && b.balance > 0)
    );
    const filteredCustomers = search
        ? customersWithPending.filter(c =>
            (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search) ||
            (c.boxNumber || '').includes(search)
          ).slice(0, 6)
        : [];

    return (
        <div className="bm-overlay" onClick={onClose}>
            <div className="bm-sheet bm-sheet-tall" onClick={e => e.stopPropagation()}>
                <div className="bm-header">
                    <div className="bm-header-icon green"><CreditCard size={20} /></div>
                    <div>
                        <div className="bm-header-title">Record Payment</div>
                        <div className="bm-header-sub">{customersWithPending.length} customer{customersWithPending.length !== 1 ? 's' : ''} with pending bills</div>
                    </div>
                    <button className="bm-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="bm-body">
                    {!selectedCustomer ? (
                        <div className="bm-section">
                            <div className="bl-search">
                                <Search size={16} className="bl-search-icon" />
                                <input
                                    type="text" placeholder="Search customer name, phone or box..."
                                    value={search} onChange={e => setSearch(e.target.value)} autoFocus
                                />
                                {search && <button className="bl-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
                            </div>
                            {!search && <p className="bm-hint">Start typing to search customers with pending bills</p>}
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
                                    ) : filteredCustomers.map(c => {
                                        const pending = getPendingBills(c.id);
                                        const outstanding = pending.reduce((s, b) => s + b.balance, 0);
                                        return (
                                            <div key={c.id} className="bm-result-row" onClick={() => handleSelectCustomer(c)}>
                                                <div className="bm-result-avatar">{getInitials(c.name)}</div>
                                                <div className="bm-result-info">
                                                    <p className="bm-result-name">{c.name}</p>
                                                    <p className="bm-result-meta">
                                                        {c.phone}{c.boxNumber ? ` · Box ${c.boxNumber}` : ''}
                                                        &nbsp;·&nbsp;{pending.length} bill{pending.length !== 1 ? 's' : ''} pending
                                                    </p>
                                                </div>
                                                <span className="bm-due-amt">₹{outstanding.toLocaleString('en-IN')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSavePayment}>
                            {/* Customer chip */}
                            <div className="bm-customer-chip">
                                <div className="bm-chip-avatar green">{getInitials(selectedCustomer.name)}</div>
                                <div className="bm-chip-info">
                                    <p className="bm-chip-name">{selectedCustomer.name}</p>
                                    <p className="bm-chip-sub">{selectedCustomer.phone}{selectedCustomer.boxNumber ? ` · Box ${selectedCustomer.boxNumber}` : ''}</p>
                                </div>
                                <button type="button" className="bm-chip-change" onClick={() => { setSelectedCustomer(null); setSearch(''); }}>Change</button>
                            </div>

                            {/* All pending bills breakdown */}
                            <div className="bm-bills-breakdown">
                                <div className="bm-breakdown-header">
                                    <span className="bm-breakdown-label">Pending Bills ({customerPendingBills.length})</span>
                                    <span className="bm-breakdown-note">Applied oldest first</span>
                                </div>
                                {customerPendingBills.map((b, i) => {
                                    const svc = b.serviceType || '';
                                    const isBoth = svc === 'both';
                                    // For both-bills: show choice only if neither service was already paid
                                    const canChoose = isBoth && !b.tvPaid && !b.internetPaid;
                                    const choice = billSvcChoices[b.id] || 'both';
                                    // If one service was already paid in a prior payment
                                    const tvOnlyPending = isBoth && b.internetPaid && !b.tvPaid;
                                    const internetOnlyPending = isBoth && b.tvPaid && !b.internetPaid;
                                    return (
                                        <div key={b.id} className="bm-breakdown-row">
                                            <div className="bm-breakdown-left">
                                                <span className="bm-breakdown-index">{i + 1}</span>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                                        <span className="bm-breakdown-bill" style={{ opacity: choice === 'skip' ? 0.4 : 1 }}>Bill #{b.billNumber}</span>
                                                        {svc === 'tv' && <span className="pbt-svc-badge pbt-svc-tv">TV</span>}
                                                        {svc === 'internet' && <span className="pbt-svc-badge pbt-svc-net">Internet</span>}
                                                        {tvOnlyPending && <span className="pbt-svc-badge pbt-svc-tv">TV</span>}
                                                        {internetOnlyPending && <span className="pbt-svc-badge pbt-svc-net">Internet</span>}
                                                        {canChoose && <><span className="pbt-svc-badge pbt-svc-tv">TV</span><span className="pbt-svc-badge pbt-svc-net">Internet</span></>}
                                                    </div>
                                                    {/* Service choice segmented control */}
                                                    <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.28)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, marginTop: 7, gap: 2 }}>
                                                        {(canChoose ? [
                                                                { key: 'both', label: 'Both', amt: b.balance, color: null },
                                                                { key: 'tv', label: 'TV', amt: b.tvAmount, color: '#a855f7' },
                                                                { key: 'internet', label: 'Internet', amt: b.internetAmount, color: '#06b6d4' },
                                                                { key: 'skip', label: 'Skip', amt: null, color: '#ef4444' },
                                                            ] : [
                                                                { key: 'both', label: 'Pay', amt: b.balance, color: null },
                                                                { key: 'skip', label: 'Skip', amt: null, color: '#ef4444' },
                                                            ]).map(opt => {
                                                            const active = choice === opt.key;
                                                            return (
                                                                <button key={opt.key} type="button"
                                                                    onClick={() => updateSvcChoice(b.id, opt.key)}
                                                                    style={{
                                                                        padding: '4px 10px', borderRadius: 7, fontSize: '0.7rem', fontWeight: 700,
                                                                        border: active ? `1.5px solid ${opt.color ? opt.color + '55' : 'rgba(255,255,255,0.14)'}` : '1.5px solid transparent',
                                                                        background: active ? (opt.color ? opt.color + '22' : 'rgba(255,255,255,0.09)') : 'transparent',
                                                                        color: active ? (opt.color || 'var(--text-primary)') : 'var(--text-secondary)',
                                                                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                                                        whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.25
                                                                    }}
                                                                >
                                                                    <span>{opt.label}</span>
                                                                    {opt.amt != null && <span style={{ fontSize: '0.6rem', fontWeight: 600, opacity: active ? 0.85 : 0.55 }}>₹{(opt.amt || 0).toLocaleString('en-IN')}</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="bm-breakdown-date" style={{ opacity: choice === 'skip' ? 0.4 : 1 }}>
                                                        {new Date(b.generatedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        {choice === 'skip' && <span style={{ marginLeft: 6, color: '#ef4444', fontWeight: 700, fontStyle: 'normal' }}>— skipped</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bm-breakdown-right" style={{ opacity: choice === 'skip' ? 0.35 : 1 }}>
                                                <span className="bm-breakdown-billed">₹{(b.totalAmount || 0).toLocaleString('en-IN')}</span>
                                                <span className={`status-pill status-${b.status.toLowerCase()}`}>{b.status}</span>
                                                <span className="bm-breakdown-balance" style={{ textDecoration: choice === 'skip' ? 'line-through' : 'none' }}>₹{(b.balance || 0).toLocaleString('en-IN')} due</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="bm-breakdown-total-row">
                                    <span>Collecting Now</span>
                                    <span className="bm-due-amt">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Payment form */}
                            <div className="bm-form-grid">
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Amount Received (₹)</label>
                                    <input type="number" value={paymentData.amount} placeholder="Enter amount"
                                        onChange={e => setPaymentData(p => ({ ...p, amount: e.target.value }))} required min="1" />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" value={paymentData.date}
                                        onChange={e => setPaymentData(p => ({ ...p, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label>Mode</label>
                                    <select value={paymentData.mode} onChange={e => setPaymentData(p => ({ ...p, mode: e.target.value }))}>
                                        <option value="Cash">Cash</option>
                                        <option value="PhonePe">PhonePe</option>
                                        <option value="GPay">GPay</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Bill Book # <span style={{ fontWeight: 400, fontSize: '0.72rem' }}>(optional)</span></label>
                                    <input type="text" value={paymentData.billBookNumber} placeholder="Manual book #"
                                        onChange={e => setPaymentData(p => ({ ...p, billBookNumber: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Collected By</label>
                                    <select value={paymentData.collectedBy} onChange={e => setPaymentData(p => ({ ...p, collectedBy: e.target.value }))}>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="bm-submit green">
                                <CreditCard size={17} /> Save Payment
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Pending Bills Table ───────────────────────────────────── */
const PendingBillsTable = ({ bills, customers, onCollect, dateMode, singleDate, onDateModeChange, onSingleDateChange, svcFilter = 'all', onSvcFilterChange }) => {
    const [search, setSearch] = React.useState('');

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

    let pendingBills = bills
        .filter(b => b.balance > 0)
        .sort((a, b) => new Date(a.generatedDate) - new Date(b.generatedDate));

    // Date filter on generatedDate
    if (dateMode === 'today') pendingBills = pendingBills.filter(b => b.generatedDate === todayStr);
    else if (dateMode === 'yesterday') pendingBills = pendingBills.filter(b => b.generatedDate === daysAgo(1));
    else if (dateMode === 'last15') pendingBills = pendingBills.filter(b => b.generatedDate >= daysAgo(15));
    else if (dateMode === 'last30') pendingBills = pendingBills.filter(b => b.generatedDate >= daysAgo(30));
    else if (dateMode === 'last6m') pendingBills = pendingBills.filter(b => b.generatedDate >= daysAgo(180));
    else if (dateMode === 'single' && singleDate) pendingBills = pendingBills.filter(b => b.generatedDate === singleDate);

    // Service filter — inclusive (TV shows tv-only + combo; Internet shows internet-only + combo)
    if (svcFilter === 'tv') pendingBills = pendingBills.filter(b => b.serviceType === 'tv' || b.serviceType === 'both');
    else if (svcFilter === 'internet') pendingBills = pendingBills.filter(b => b.serviceType === 'internet' || b.serviceType === 'both');

    const filtered = search
        ? pendingBills.filter(b =>
            (b.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
            (b.phone || '').includes(search) ||
            String(b.billNumber || '').includes(search)
          )
        : pendingBills;

    return (
        <div>
            {/* Date + service filter bar */}
            <div className="bl-date-bar">
                <div className="bl-date-modes">
                    {[['all','All'],['today','Today'],['yesterday','Yesterday'],['last15','Last 15 days'],['last30','Last month'],['last6m','Last 6 months'],['single','Pick date']].map(([m, label]) => (
                        <button key={m} className={`bl-dmode${dateMode === m ? ' active' : ''}`}
                            onClick={() => { onDateModeChange(m); if (m !== 'single') onSingleDateChange(''); }}>
                            {label}
                        </button>
                    ))}
                </div>
                <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block', flexShrink: 0 }} />
                <select
                    value={svcFilter}
                    onChange={e => onSvcFilterChange && onSvcFilterChange(e.target.value)}
                    style={{ background: svcFilter !== 'all' ? 'rgba(99,102,241,0.12)' : 'none', border: `1.5px solid ${svcFilter !== 'all' ? 'var(--accent)' : 'var(--border)'}`, color: svcFilter !== 'all' ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none', flexShrink: 0 }}
                >
                    <option value="all">All Services</option>
                    <option value="tv">TV</option>
                    <option value="internet">Internet</option>
                </select>
                {dateMode === 'single' && (
                    <div className="bl-date-inputs">
                        <input type="date" className="bl-date-input" value={singleDate} onChange={e => onSingleDateChange(e.target.value)} />
                        {singleDate && <button className="bl-date-clear" onClick={() => onSingleDateChange('')}><X size={13} /></button>}
                    </div>
                )}
            </div>
            <div className="bl-search-bar">
                <div className="bl-tbl-search">
                    <Search size={14} className="bl-tbl-search-icon" />
                    <input type="text" placeholder="Search customer, phone or bill #..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className="bl-date-clear" onClick={() => setSearch('')}><X size={12} /></button>}
                </div>
                <div className="bl-summary">
                    <span className="bl-sum-item"><span className="bl-sum-label">{filtered.length} pending</span></span>
                    <span className="bl-sum-item">Outstanding <strong style={{ color: '#ef4444' }}>₹{filtered.reduce((s, b) => s + (b.balance || 0), 0).toLocaleString('en-IN')}</strong></span>
                </div>
            </div>

            {/* Desktop table */}
            <div className="table-container pbt-table">
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                        <col style={{ width: 36 }} />
                        <col style={{ minWidth: 140 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 110 }} />
                        <col style={{ width: 120 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 90 }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'center' }}>#</th>
                            <th>Customer</th>
                            <th>Service</th>
                            <th>Bill #</th>
                            <th>Billed On</th>
                            <th>Phone</th>
                            <th>Billed</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={10} className="text-center">{search ? 'No results.' : 'No pending bills!'}</td></tr>
                        ) : filtered.map((b, i) => {
                            const svc = b.serviceType || '';
                            const cust = customers.find(c => c.id === b.customerId);
                            return (
                                <tr key={b.id} className="bill-row-clickable">
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>{i + 1}</td>
                                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <strong title={b.customerName || '—'}>{b.customerName || '—'}</strong>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {(svc === 'tv' || (svc === 'both' && !b.tvPaid)) && <span className="pbt-svc-badge pbt-svc-tv">TV</span>}
                                            {(svc === 'internet' || (svc === 'both' && !b.internetPaid)) && <span className="pbt-svc-badge pbt-svc-net">Internet</span>}
                                            {!svc && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{b.billNumber}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                        {new Date(b.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.phone || cust?.phone || '—'}</td>
                                    <td style={{ fontWeight: 600 }}>₹{(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-paid">₹{(b.amountPaid || 0).toLocaleString('en-IN')}</td>
                                    <td className="text-due"><strong>₹{(b.balance || 0).toLocaleString('en-IN')}</strong></td>
                                    <td>
                                        <button className="pbt-collect-btn" onClick={() => onCollect(cust || { id: b.customerId, name: b.customerName, phone: b.phone })}>Collect</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="pbt-cards">
                {filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem', padding: '16px 0' }}>
                        {search ? 'No results.' : 'No pending bills!'}
                    </p>
                ) : filtered.map((b, i) => (
                    <div key={b.id} className="bl-txn-card">
                        <div className="bl-txn-card-top">
                            <div>
                                <div className="bl-txn-card-name">{b.customerName}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                    Bill #{b.billNumber} · {new Date(b.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <span className="bl-txn-card-amt" style={{ color: '#ef4444' }}>₹{(b.balance || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="bl-txn-card-meta" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <span className="bl-txn-meta-tag">Billed ₹{(b.totalAmount || 0).toLocaleString('en-IN')}</span>
                                {b.amountPaid > 0 && <span className="bl-txn-meta-tag paid">Paid ₹{(b.amountPaid || 0).toLocaleString('en-IN')}</span>}
                                <span className={`status-pill status-${(b.status || 'due').toLowerCase()}`}>{b.status}</span>
                            </div>
                            <button className="pbt-collect-btn" onClick={onCollect}>Collect</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Payments Page ─────────────────────────────────────────── */
const Payments = () => {
    const location = useLocation();
    const { bills, customers, users } = useData();
    const { user: currentUser } = useAuth();
    const isOwner = currentUser?.role?.toLowerCase() === 'owner';
    const preselectedCustomer = location.state?.customerId
        ? customers.find(c => c.id === location.state.customerId) || null
        : null;
    const [modal, setModal] = useState(
        location.state?.tab === 'payment' ? 'payment' : null
    );
    const [collectCustomer, setCollectCustomer] = useState(null);
    const [view, setView] = useState(location.state?.tab === 'pending' ? 'pending' : 'payments');
    const [dateMode, setDateMode] = useState('today');
    const [singleDate, setSingleDate] = useState('');
    const [pendingDateMode, setPendingDateMode] = useState('all');
    const [pendingSingleDate, setPendingSingleDate] = useState('');
    const [userFilter, setUserFilter] = useState('all');
    const [svcFilter, setSvcFilter] = useState('all');

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

    const effectiveUserId = isOwner ? userFilter : (currentUser?.userId || '');

    const allTxns = bills.flatMap(b => (b.payments || []).map(p => ({ ...p })));
    const filteredTxns = allTxns.filter(p => {
        const date = p.date;
        if (effectiveUserId !== 'all' && p.collectedBy !== effectiveUserId) return false;
        if (!date) return dateMode === 'all';
        if (dateMode === 'today') return date === todayStr;
        if (dateMode === 'yesterday') return date === daysAgo(1);
        if (dateMode === 'last15') return date >= daysAgo(15);
        if (dateMode === 'last30') return date >= daysAgo(30);
        if (dateMode === 'last6m') return date >= daysAgo(180);
        if (dateMode === 'single') return date === singleDate;
        return true;
    });
    const paymentCount = filteredTxns.length;
    const totalCollected = filteredTxns.reduce((s, p) => s + (p.amount || 0), 0);
    let pendingBillsFiltered = bills.filter(b => b.balance > 0);
    if (pendingDateMode === 'today') pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate === todayStr);
    else if (pendingDateMode === 'yesterday') pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate === daysAgo(1));
    else if (pendingDateMode === 'last15') pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate >= daysAgo(15));
    else if (pendingDateMode === 'last30') pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate >= daysAgo(30));
    else if (pendingDateMode === 'last6m') pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate >= daysAgo(180));
    else if (pendingDateMode === 'single' && pendingSingleDate) pendingBillsFiltered = pendingBillsFiltered.filter(b => b.generatedDate === pendingSingleDate);
    const pendingCount = pendingBillsFiltered.length;
    const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);

    const periodLabel = { today: 'Today', yesterday: 'Yesterday', last15: 'Last 15 Days', last30: 'Last Month', last6m: 'Last 6 Months', all: 'All Time', single: singleDate ? new Date(singleDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Date' }[dateMode] || 'Today';
    const workerLabel = !isOwner
        ? (currentUser?.name || '')
        : (effectiveUserId !== 'all' ? (users.find(u => u.id === effectiveUserId)?.name || '') : '');

    return (
        <div className="billing-page">
            <div className="bl-page-header">
                <h1 className="bl-page-title">Payments</h1>
                <p className="bl-page-sub">Record and track customer payments</p>
            </div>

            {/* Action Card FIRST */}
            <div className="bl-action-grid">
                <button className="bl-action-card bl-action-green" onClick={() => setModal('payment')}>
                    <div className="bl-action-icon green"><CreditCard size={28} /></div>
                    <div className="bl-action-text">
                        <p className="bl-action-title">Record Payment</p>
                        <p className="bl-action-sub">Mark a payment against a pending bill</p>
                    </div>
                    <ArrowRight size={20} className="bl-action-arrow" />
                </button>
            </div>

            {/* Dynamic Stats (update with filter) */}
            <div className="bl-stats">
                <div className="bl-stat">
                    <span className="bl-stat-label">Collected · {periodLabel}{workerLabel ? ` · ${workerLabel}` : ''}</span>
                    <span className="bl-stat-value green">₹{totalCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="bl-stat">
                    <span className="bl-stat-label">Payments · {periodLabel}{workerLabel ? ` · ${workerLabel}` : ''}</span>
                    <span className="bl-stat-value green">{paymentCount}</span>
                </div>
                <div className="bl-stat bl-stat-clickable" onClick={() => setView('pending')}>
                    <span className="bl-stat-label">Pending Bills</span>
                    <span className="bl-stat-value orange">{pendingCount}</span>
                    <span className="bl-stat-hint">tap to view</span>
                </div>
            </div>

            <div className="bl-history-section">
                <div className="bl-history-tabs">
                    <button className={`bl-htab${view === 'payments' ? ' active' : ''}`} onClick={() => setView('payments')}>
                        <CreditCard size={14} /> Recent Payments
                    </button>
                    <button className={`bl-htab${view === 'pending' ? ' active' : ''}`} onClick={() => setView('pending')}>
                        <IndianRupee size={14} /> Pending Bills
                        {pendingCount > 0 && <span className="bl-htab-badge">{pendingCount}</span>}
                    </button>
                </div>

                {view === 'payments' && (
                    <BillList
                        mode="payment"
                        dateMode={dateMode}
                        singleDate={singleDate}
                        onDateModeChange={setDateMode}
                        onSingleDateChange={setSingleDate}
                        filterUserId={isOwner ? userFilter : (currentUser?.userId || 'all')}
                        filterServiceType={svcFilter}
                        renderExtraFilters={() => (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                {isOwner && users.length > 1 && (
                                    <>
                                        <span style={{ width: 1, height: 18, background: 'var(--border)', display: 'inline-block' }} />
                                        <select
                                            value={userFilter}
                                            onChange={e => setUserFilter(e.target.value)}
                                            style={{ background: userFilter !== 'all' ? 'rgba(99,102,241,0.12)' : 'none', border: `1.5px solid ${userFilter !== 'all' ? 'var(--accent)' : 'var(--border)'}`, color: userFilter !== 'all' ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                                        >
                                            <option value="all">All Workers</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    </>
                                )}
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
                )}

                {view === 'pending' && (
                    <PendingBillsTable
                        bills={bills} customers={customers}
                        onCollect={(cust) => { setCollectCustomer(cust || null); setModal('payment'); }}
                        dateMode={pendingDateMode} singleDate={pendingSingleDate}
                        onDateModeChange={setPendingDateMode} onSingleDateChange={setPendingSingleDate}
                        svcFilter={svcFilter} onSvcFilterChange={setSvcFilter}
                    />
                )}
            </div>

            {modal === 'payment' && <RecordPaymentModal onClose={() => { setModal(null); setCollectCustomer(null); }} preselectedCustomer={collectCustomer || preselectedCustomer} />}

            <style>{`
                .billing-page { padding: 28px 32px; }

                .bl-page-header { margin-bottom: 20px; }
                .bl-page-title {
                    font-size: 1.8rem; font-weight: 800;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
                }

                .bl-user-filter-bar {
                    display: flex; gap: 6px; flex-wrap: wrap;
                    padding: 10px 14px; border-bottom: 1px solid var(--border);
                }
                .bl-user-pill {
                    padding: 5px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
                    border: 1.5px solid var(--border); background: none;
                    color: var(--text-secondary); cursor: pointer; transition: all 0.15s; font-family: inherit;
                }
                .bl-user-pill:hover { border-color: var(--accent); color: var(--accent); }
                .bl-user-pill.active { background: rgba(99,102,241,0.15); border-color: var(--accent); color: var(--accent); font-weight: 700; }
                .bl-page-sub { color: var(--text-secondary); font-size: 0.88rem; margin-top: 3px; }

                .bl-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
                .bl-stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
                .bl-stat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
                .bl-stat-value { font-size: 1.25rem; font-weight: 800; }
                .bl-stat-value.green { color: #10b981; }
                .bl-stat-value.orange { color: #f59e0b; }
                .bl-stat-value.red { color: #ef4444; }
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
                .bl-action-green:hover { border-color: #10b981; background: rgba(16,185,129,0.07); }
                .bl-action-icon {
                    width: 54px; height: 54px; border-radius: 16px; flex-shrink: 0;
                    background: rgba(99,102,241,0.12); color: var(--accent);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s;
                }
                .bl-action-icon.green { background: rgba(16,185,129,0.12); color: #10b981; }
                .bl-action-green:hover .bl-action-icon { transform: scale(1.08); }
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
                    font-weight: 600; font-size: 0.85rem; cursor: pointer; font-family: inherit;
                    transition: all 0.2s; margin-bottom: -1px;
                }
                .bl-htab:hover { color: var(--text-primary); }
                .bl-htab.active { color: var(--text-primary); border-bottom-color: var(--accent); }
                .bl-htab-badge {
                    background: #f59e0b; color: #000; border-radius: 10px;
                    font-size: 0.65rem; font-weight: 800; padding: 1px 6px; line-height: 1.4;
                }
                /* Pending bills table */
                .pbt-table { border-radius: 0; border: none; border-top: 1px solid var(--border); }
                .pbt-svc-badge { font-size: 0.6rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
                .pbt-svc-tv { background: rgba(168,85,247,0.15); color: #a855f7; }
                .pbt-svc-net { background: rgba(6,182,212,0.15); color: #06b6d4; }
                .pbt-cards { display: none; flex-direction: column; gap: 10px; padding: 12px; }
                .pbt-collect-btn {
                    background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3);
                    color: #10b981; border-radius: 8px; padding: 5px 12px;
                    font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit;
                    transition: all 0.2s; white-space: nowrap;
                }
                .pbt-collect-btn:hover { background: rgba(16,185,129,0.22); }
                /* Date filter bar (shared with PendingBillsTable) */
                .bl-date-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.01); overflow-x: auto; }
                .bl-date-modes { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; }
                .bl-dmode { background: none; border: 1px solid var(--border); color: var(--text-secondary); padding: 5px 12px; border-radius: 7px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
                .bl-dmode:hover { color: var(--text-primary); border-color: var(--accent); }
                .bl-dmode.active { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.1); }
                .bl-date-inputs { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
                .bl-date-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; color: var(--text-primary); font-size: 0.82rem; outline: none; font-family: inherit; transition: border-color 0.2s; }
                .bl-date-input:focus { border-color: var(--accent); }
                /* search bar (shared with PendingBillsTable) */
                .bl-search-bar { display: flex; align-items: center; gap: 12px; padding: 8px 14px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.01); }
                .bl-summary { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
                .bl-sum-item { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
                .bl-sum-item strong { color: var(--text-primary); font-weight: 700; }
                .bl-tbl-search { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; flex: 1; min-width: 0; transition: border-color 0.2s; }
                .bl-tbl-search:focus-within { border-color: var(--accent); }
                .bl-tbl-search-icon { color: var(--text-secondary); flex-shrink: 0; }
                .bl-tbl-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 0.85rem; min-width: 0; }
                .bl-tbl-search input::placeholder { color: var(--text-secondary); }
                .bl-date-clear { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 6px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; }
                .bl-date-clear:hover { color: #ef4444; border-color: #ef4444; }
                @media (max-width: 640px) {
                    .pbt-table { display: none; }
                    .pbt-cards { display: flex; }
                    /* Date/filter bar — horizontal scroll, no wrap */
                    .bl-date-bar { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 8px 12px; gap: 8px; }
                    .bl-date-modes { flex-wrap: nowrap; }
                    /* Bottom sheet modal on mobile */
                    .bm-overlay { align-items: flex-end !important; padding: 0 !important; }
                    .bm-sheet { border-radius: 20px 20px 0 0 !important; max-width: 100% !important; max-height: 95vh !important; }
                    /* Modal inputs — prevent iOS zoom */
                    .bm-body input, .bm-body select, .bm-body textarea { font-size: 16px !important; }
                    /* Stats grid — 2 cols on mobile */
                    .bl-stats { grid-template-columns: repeat(2, 1fr) !important; }
                    /* Breakdown rows wrap on mobile */
                    .bm-breakdown-row { flex-direction: column; align-items: flex-start; gap: 8px; }
                    .bm-breakdown-right { flex-wrap: wrap; gap: 6px; }
                    /* Form grid 1-col on mobile */
                    .bm-form-grid { grid-template-columns: 1fr !important; }
                    .bm-form-grid .form-group[style*="gridColumn"] { grid-column: 1 !important; }
                    /* Search bar — wrap on mobile */
                    .bl-search-bar { flex-wrap: wrap; gap: 8px; }
                    .bl-summary { flex-wrap: wrap; gap: 8px; }
                }

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
                .bm-sheet-tall { max-height: 96vh; }
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
                .bm-header-icon.green { background: rgba(16,185,129,0.12); color: #10b981; }
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
                .bm-chip-avatar.green { background: linear-gradient(135deg, #059669, #10b981); }
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
                .bm-result-info { flex: 1; min-width: 0; }
                .bm-result-name { font-weight: 700; font-size: 0.88rem; }
                .bm-result-meta { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
                .bm-due-amt { font-weight: 800; font-size: 0.9rem; color: #ef4444; white-space: nowrap; }
                .pf-tag { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; margin-left: 4px; }
                .pf-tv { background: rgba(168,85,247,0.15); color: #a855f7; }
                .pf-net { background: rgba(6,182,212,0.15); color: #06b6d4; }
                /* Pending bills breakdown in payment modal */
                .bm-bills-breakdown {
                    background: rgba(0,0,0,0.18); border: 1px solid var(--border);
                    border-radius: 14px; overflow: hidden; margin-bottom: 4px;
                }
                .bm-breakdown-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 14px; border-bottom: 1px solid var(--border);
                    background: rgba(255,255,255,0.02);
                }
                .bm-breakdown-label { font-size: 0.78rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.04em; }
                .bm-breakdown-note { font-size: 0.7rem; color: var(--text-secondary); font-style: italic; }
                .bm-breakdown-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04);
                    transition: background 0.15s;
                }
                .bm-breakdown-row:last-of-type { border-bottom: none; }
                .bm-breakdown-row:hover { background: rgba(255,255,255,0.03); }
                .bm-breakdown-left { display: flex; align-items: center; gap: 10px; }
                .bm-breakdown-index {
                    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
                    background: rgba(99,102,241,0.15); color: var(--accent);
                    font-size: 0.7rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                }
                .bm-breakdown-bill { font-size: 0.84rem; font-weight: 700; }
                .bm-breakdown-date { font-size: 0.7rem; color: var(--text-secondary); margin-top: 1px; }
                .bm-breakdown-right { display: flex; align-items: center; gap: 8px; }
                .bm-breakdown-billed { font-size: 0.78rem; color: var(--text-secondary); }
                .bm-breakdown-balance { font-size: 0.82rem; font-weight: 700; color: #ef4444; }
                .bm-breakdown-total-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 14px; border-top: 1px solid var(--border);
                    background: rgba(255,255,255,0.03);
                    font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);
                }

                .bm-due-banner {
                    display: flex; align-items: center; gap: 8px;
                    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
                    border-radius: 10px; padding: 10px 14px; margin-bottom: 14px;
                    color: #f87171; font-size: 0.9rem;
                }
                .bm-due-banner strong { color: #ef4444; font-size: 1.05rem; }
                .bm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
                .bm-submit {
                    width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
                    padding: 13px; border: none; border-radius: 14px;
                    font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit;
                    transition: all 0.2s;
                }
                .bm-submit.green {
                    background: linear-gradient(135deg, #059669, #10b981); color: white;
                    box-shadow: 0 4px 12px rgba(16,185,129,0.3);
                }
                .bm-submit.green:hover { box-shadow: 0 6px 20px rgba(16,185,129,0.4); transform: translateY(-1px); }

                @media (max-width: 768px) {
                    .billing-page { padding: 12px; }
                    .bl-stats { gap: 8px; }
                    .bl-stat { padding: 12px 10px; }
                    .bl-stat-label { font-size: 0.65rem; }
                    .bl-stat-value { font-size: 1rem; }
                    .bm-form-grid { grid-template-columns: 1fr 1fr; }
                }
                @media (max-width: 400px) {
                    .billing-page { padding: 8px 6px; }
                    .bl-stats { grid-template-columns: 1fr; }
                    .bm-form-grid { grid-template-columns: 1fr; }
                    /* pbt-card items — readable on very small screens */
                    .bl-txn-card { padding: 10px 10px; }
                    .bl-txn-card-name { font-size: 0.85rem; }
                    .bl-txn-card-amt { font-size: 0.95rem; }
                    .bl-txn-card-meta { flex-wrap: wrap; gap: 6px; }
                    /* Button rows wrap */
                    .bm-body button, .bm-body .bl-search { flex-wrap: wrap; }
                }
            `}</style>
        </div>
    );
};

export default Payments;
