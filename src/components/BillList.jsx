import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, X, Tv, Wifi, Receipt, CreditCard, CheckCircle, Search } from 'lucide-react';
import { generateWhatsAppLink, formatBillMessage, formatPaymentMessage } from '../utils/whatsapp';

/* ─── Bill Detail Modal ──────────────────────────────────────── */
const BillDetailModal = ({ bill, onClose }) => {
    if (!bill) return null;

    const { updateBill, users } = useData();
    const { user: currentUser } = useAuth();
    const isOwner = currentUser?.role?.toLowerCase() === 'owner';

    const handleCollectorChange = (paymentIndex, newUserId) => {
        const selectedUser = users.find(u => u.id === newUserId);
        if (!selectedUser) return;
        const updatedPayments = (bill.payments || []).map((p, i) =>
            i === paymentIndex ? { ...p, collectedBy: selectedUser.id, collectedByName: selectedUser.name } : p
        );
        updateBill(bill.id, { payments: updatedPayments });
    };

    const [editingPaymentIndex, setEditingPaymentIndex] = React.useState(null);
    const [editingPaymentAmount, setEditingPaymentAmount] = React.useState('');

    const handleSavePaymentAmount = (paymentIndex) => {
        const newAmount = Number(editingPaymentAmount);
        if (isNaN(newAmount) || newAmount < 0) return;
        const updatedPayments = (bill.payments || []).map((p, i) =>
            i === paymentIndex ? { ...p, amount: newAmount } : p
        );
        const newAmountPaid = updatedPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const newBalance = bill.totalAmount - newAmountPaid;
        const newStatus = newBalance <= 0 ? 'Paid' : newAmountPaid > 0 ? 'Partial' : 'Due';
        updateBill(bill.id, {
            payments: updatedPayments,
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
        });
        setEditingPaymentIndex(null);
    };

    const [isEditing, setIsEditing] = React.useState(false);
    const [editForm, setEditForm] = React.useState({
        generatedDate: bill.generatedDate || '',
        tvAmount: bill.tvAmount || 0,
        internetAmount: bill.internetAmount || 0,
        totalAmount: bill.totalAmount || 0,
        note: bill.note || '',
    });

    React.useEffect(() => {
        setEditForm({
            generatedDate: bill.generatedDate || '',
            tvAmount: bill.tvAmount || 0,
            internetAmount: bill.internetAmount || 0,
            totalAmount: bill.totalAmount || 0,
            note: bill.note || '',
        });
        setIsEditing(false);
    }, [bill.id]);

    const handleEditChange = (field, val) => {
        setEditForm(f => {
            const updated = { ...f, [field]: val };
            if (field === 'tvAmount' || field === 'internetAmount') {
                const tv = field === 'tvAmount' ? Number(val) : Number(updated.tvAmount);
                const net = field === 'internetAmount' ? Number(val) : Number(updated.internetAmount);
                updated.totalAmount = tv + net;
            }
            return updated;
        });
    };

    const handleSaveEdit = () => {
        const tv = Number(editForm.tvAmount) || 0;
        const net = Number(editForm.internetAmount) || 0;
        const total = (bill.serviceType === 'tv') ? tv : (bill.serviceType === 'internet') ? net : tv + net;
        const newBalance = total - (bill.amountPaid || 0);
        const newStatus = newBalance <= 0 ? 'Paid' : (bill.payments?.length > 0 ? 'Partial' : 'Due');
        updateBill(bill.id, {
            generatedDate: editForm.generatedDate,
            tvAmount: tv,
            internetAmount: net,
            totalAmount: total,
            balance: newBalance,
            status: newStatus,
            note: editForm.note,
        });
        setIsEditing(false);
    };

    const handleShareBill = () => {
        const msg = formatBillMessage(bill);
        window.open(generateWhatsAppLink(bill.phone, msg), '_blank');
    };

    const handleSharePayment = () => {
        const lastPayment = (bill.payments || []).slice(-1)[0];
        const msg = formatPaymentMessage(bill, lastPayment?.amount, lastPayment?.date);
        window.open(generateWhatsAppLink(bill.phone, msg), '_blank');
    };

    const balance = bill.balance ?? (bill.totalAmount - (bill.amountPaid || 0));
    const isPaid = bill.status === 'Paid' || balance <= 0;

    return (
        <div className="bd-overlay" onClick={onClose}>
            <div className="bd-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bd-header">
                    <div className="bd-header-left">
                        <div className="bd-receipt-icon"><Receipt size={20} /></div>
                        <div>
                            <div className="bd-bill-num">Bill #{bill.billNumber}</div>
                            <div className="bd-bill-date">{new Date(bill.generatedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`status-pill status-${(bill.status || 'due').toLowerCase()}`}>{bill.status}</span>
                        {isOwner && !isEditing && (
                            <button className="bd-edit-btn" onClick={() => setIsEditing(true)}>Edit</button>
                        )}
                        {isOwner && isEditing && (
                            <button className="bd-edit-btn bd-edit-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                        )}
                        <button className="bd-close" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="bd-body">
                    {/* Customer info */}
                    <div className="bd-section">
                        <div className="bd-section-label">Customer</div>
                        <div className="bd-customer-row">
                            <div className="bd-avatar">{(bill.customerName || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                            <div>
                                <div className="bd-customer-name">{bill.customerName}</div>
                                <div className="bd-customer-sub">{bill.phone}{bill.boxNumber ? ` · Box ${bill.boxNumber}` : ''}</div>
                            </div>
                        </div>
                    </div>

                    {/* Edit form (owner only) */}
                    {isEditing ? (
                        <div className="bd-edit-form">
                            <div className="bd-section-label" style={{ marginBottom: 12 }}>Edit Bill Details</div>
                            <div className="bd-edit-row">
                                <label>Date</label>
                                <input type="date" value={editForm.generatedDate} onChange={e => handleEditChange('generatedDate', e.target.value)} className="bd-edit-input" />
                            </div>
                            {(bill.serviceType === 'tv' || bill.serviceType === 'both') && (
                                <div className="bd-edit-row">
                                    <label><Tv size={13} /> TV Amount (₹)</label>
                                    <input type="number" value={editForm.tvAmount} onChange={e => handleEditChange('tvAmount', e.target.value)} className="bd-edit-input" min="0" />
                                </div>
                            )}
                            {(bill.serviceType === 'internet' || bill.serviceType === 'both') && (
                                <div className="bd-edit-row">
                                    <label><Wifi size={13} /> Internet Amount (₹)</label>
                                    <input type="number" value={editForm.internetAmount} onChange={e => handleEditChange('internetAmount', e.target.value)} className="bd-edit-input" min="0" />
                                </div>
                            )}
                            {bill.serviceType !== 'tv' && bill.serviceType !== 'internet' && bill.serviceType !== 'both' && (
                                <div className="bd-edit-row">
                                    <label>Total Amount (₹)</label>
                                    <input type="number" value={editForm.totalAmount} onChange={e => handleEditChange('totalAmount', e.target.value)} className="bd-edit-input" min="0" />
                                </div>
                            )}
                            {bill.serviceType === 'both' && (
                                <div className="bd-edit-total">Total: ₹{Number(editForm.tvAmount || 0) + Number(editForm.internetAmount || 0)}</div>
                            )}
                            <div className="bd-edit-row">
                                <label>Note</label>
                                <input type="text" value={editForm.note} onChange={e => handleEditChange('note', e.target.value)} className="bd-edit-input" placeholder="Optional note…" />
                            </div>
                            <button className="bd-save-btn" onClick={handleSaveEdit}>Save Changes</button>
                        </div>
                    ) : (
                        <>
                            {/* Service breakdown */}
                            <div className="bd-section">
                                <div className="bd-section-label">Services</div>
                                <div className="bd-service-rows">
                                    {(bill.serviceType === 'tv' || bill.serviceType === 'both') && (
                                        <div className="bd-service-row">
                                            <div className="bd-service-name"><Tv size={14} /> TV</div>
                                            <div className="bd-service-amt">₹{bill.tvAmount || 0}</div>
                                        </div>
                                    )}
                                    {(bill.serviceType === 'internet' || bill.serviceType === 'both') && (
                                        <div className="bd-service-row">
                                            <div className="bd-service-name"><Wifi size={14} /> Internet</div>
                                            <div className="bd-service-amt">₹{bill.internetAmount || 0}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount summary */}
                            <div className="bd-amounts">
                                <div className="bd-amount-row">
                                    <span>Total Billed</span>
                                    <span className="bd-amt-total">₹{bill.totalAmount}</span>
                                </div>
                                <div className="bd-amount-row">
                                    <span>Amount Paid</span>
                                    <span className="bd-amt-paid">₹{bill.amountPaid || 0}</span>
                                </div>
                                <div className="bd-divider" />
                                <div className="bd-amount-row bd-balance-row">
                                    <span>Balance Due</span>
                                    <span className={balance > 0 ? 'bd-amt-due' : 'bd-amt-paid'}>₹{balance}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Generated by */}
                    <div className="bd-section">
                        <div className="bd-section-label">Generated By</div>
                        <div className="bd-meta-value">{bill.generatedByName || 'Admin'}</div>
                    </div>

                    {/* Payment history */}
                    {bill.payments && bill.payments.length > 0 && (
                        <div className="bd-section">
                            <div className="bd-section-label">Payment History</div>
                            <div className="bd-payments-list">
                                {bill.payments.map((p, i) => (
                                    <div key={i} className={`bd-payment-item${p.closedBill ? ' bd-payment-closed' : ''}`}>
                                        <div className="bd-payment-left">
                                            <div className={`bd-payment-icon${p.closedBill ? ' green' : ''}`}>
                                                {p.closedBill ? <CheckCircle size={13} /> : <CreditCard size={13} />}
                                            </div>
                                            <div>
                                                {isOwner && editingPaymentIndex === i ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="number"
                                                            className="bd-edit-input"
                                                            style={{ width: 90, padding: '4px 8px', fontSize: '0.85rem' }}
                                                            value={editingPaymentAmount}
                                                            onChange={e => setEditingPaymentAmount(e.target.value)}
                                                            autoFocus
                                                            min="0"
                                                        />
                                                        <button className="bd-edit-btn" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => handleSavePaymentAmount(i)}>Save</button>
                                                        <button className="bd-edit-cancel bd-edit-btn" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => setEditingPaymentIndex(null)}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div className="bd-payment-amt">₹{(p.amount || 0).toLocaleString('en-IN')}</div>
                                                        {isOwner && (
                                                            <button className="bd-edit-btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => { setEditingPaymentIndex(i); setEditingPaymentAmount(p.amount || 0); }}>Edit</button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="bd-payment-by">
                                                    {isOwner ? (
                                                        <select
                                                            className="bd-collector-select"
                                                            value={p.collectedBy || ''}
                                                            onChange={e => handleCollectorChange(i, e.target.value)}
                                                        >
                                                            <option value="" disabled>— Who collected —</option>
                                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span>{p.collectedByName || 'Admin'}</span>
                                                    )}
                                                    {p.mode ? ` · ${p.mode}` : ''}{p.billBookNumber ? ` · Book #${p.billBookNumber}` : ''}
                                                </div>
                                                {p.note && <div className="bd-payment-note">{p.note}</div>}
                                            </div>
                                        </div>
                                        <div className="bd-payment-date">{p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No payments yet */}
                    {(!bill.payments || bill.payments.length === 0) && !isPaid && (
                        <div className="bd-no-payment">No payments recorded yet</div>
                    )}

                    {isPaid && (
                        <div className="bd-paid-badge"><CheckCircle size={15} /> Fully Paid</div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="bd-footer">
                    <button className="bd-btn-whatsapp" onClick={handleShareBill}>
                        <MessageCircle size={15} /> Share Bill
                    </button>
                    {(bill.amountPaid > 0) && (
                        <button className="bd-btn-whatsapp bd-btn-receipt" onClick={handleSharePayment}>
                            <MessageCircle size={15} /> Share Receipt
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .bd-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000;
                    display: flex; align-items: flex-end; justify-content: center;
                    backdrop-filter: blur(4px); padding: 0;
                }
                @media (min-width: 640px) {
                    .bd-overlay { align-items: center; padding: 24px; }
                }
                .bd-modal {
                    background: var(--bg-card); border-radius: 20px 20px 0 0;
                    width: 100%; max-width: 520px; max-height: 92vh;
                    display: flex; flex-direction: column; overflow: hidden;
                    border: 1px solid var(--border);
                    animation: bdSlideUp 0.25s ease;
                }
                @media (min-width: 640px) {
                    .bd-modal { border-radius: 20px; max-height: 85vh; }
                }
                @keyframes bdSlideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .bd-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 18px 20px 14px; border-bottom: 1px solid var(--border);
                    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05));
                    flex-shrink: 0;
                }
                .bd-header-left { display: flex; align-items: center; gap: 12px; }
                .bd-receipt-icon {
                    width: 40px; height: 40px; border-radius: 12px;
                    background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center;
                    color: var(--accent);
                }
                .bd-bill-num { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
                .bd-bill-date { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
                .bd-close {
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    color: var(--text-secondary); border-radius: 8px; padding: 6px;
                    cursor: pointer; display: flex; align-items: center; transition: all 0.2s;
                }
                .bd-close:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
                .bd-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
                .bd-section {}
                .bd-section-label {
                    font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
                    color: var(--text-secondary); margin-bottom: 8px;
                }
                .bd-customer-row { display: flex; align-items: center; gap: 12px; }
                .bd-avatar {
                    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
                    background: linear-gradient(135deg, var(--accent), #8b5cf6);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.85rem; font-weight: 700; color: white;
                }
                .bd-customer-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); }
                .bd-customer-sub { font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px; }
                .bd-service-rows { display: flex; flex-direction: column; gap: 6px; }
                .bd-service-row {
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
                    border-radius: 10px; padding: 10px 14px;
                }
                .bd-service-name {
                    display: flex; align-items: center; gap: 7px;
                    font-size: 0.85rem; color: var(--text-secondary);
                }
                .bd-service-amt { font-weight: 600; font-size: 0.9rem; color: var(--text-primary); }
                .bd-amounts {
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
                    border-radius: 12px; padding: 14px;
                }
                .bd-amount-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 4px 0; font-size: 0.88rem; color: var(--text-secondary);
                }
                .bd-balance-row { font-weight: 700; font-size: 0.95rem; color: var(--text-primary); margin-top: 2px; }
                .bd-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
                .bd-amt-total { color: var(--text-primary); font-weight: 600; }
                .bd-amt-paid { color: #10b981; font-weight: 600; }
                .bd-amt-due { color: #ef4444; font-weight: 700; }
                .bd-meta-value { font-size: 0.88rem; color: var(--text-primary); font-weight: 500; }
                .bd-payments-list { display: flex; flex-direction: column; gap: 8px; }
                .bd-payment-item {
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.15);
                    border-radius: 10px; padding: 10px 14px;
                }
                .bd-payment-left { display: flex; align-items: center; gap: 10px; }
                .bd-payment-icon {
                    width: 28px; height: 28px; border-radius: 8px;
                    background: rgba(16,185,129,0.15); color: #10b981;
                    display: flex; align-items: center; justify-content: center;
                }
                .bd-payment-item.bd-payment-closed { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); }
                .bd-payment-icon.green { background: rgba(16,185,129,0.2); color: #10b981; }
                .bd-payment-left { align-items: flex-start; }
                .bd-payment-amt { font-weight: 600; font-size: 0.88rem; color: var(--text-primary); }
                .bd-payment-by { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
                .bd-collector-select {
                    font-size: 0.72rem; padding: 2px 6px; border-radius: 6px;
                    background: rgba(99,102,241,0.08); color: var(--accent);
                    border: 1px solid rgba(99,102,241,0.3);
                    cursor: pointer; outline: none; font-family: inherit;
                }
                .bd-collector-select:hover { border-color: var(--accent); }
                .bd-payment-note {
                    font-size: 0.68rem; color: var(--text-secondary); margin-top: 4px;
                    opacity: 0.75; font-style: italic; line-height: 1.4;
                    border-left: 2px solid rgba(99,102,241,0.3); padding-left: 6px;
                }
                .bd-payment-date { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; margin-top: 2px; }
                .bd-no-payment {
                    text-align: center; color: var(--text-secondary); font-size: 0.82rem;
                    padding: 12px; background: rgba(255,255,255,0.02);
                    border: 1px dashed var(--border); border-radius: 10px;
                }
                .bd-paid-badge {
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
                    color: #10b981; border-radius: 10px; padding: 10px; font-size: 0.85rem; font-weight: 600;
                }
                .bd-footer {
                    padding: 14px 20px; border-top: 1px solid var(--border);
                    display: flex; gap: 10px; flex-shrink: 0;
                    background: var(--bg-card);
                }
                .bd-btn-whatsapp {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
                    background: rgba(37,211,102,0.12); border: 1px solid rgba(37,211,102,0.3);
                    color: #25d366; border-radius: 12px; padding: 12px; font-size: 0.85rem;
                    font-weight: 600; cursor: pointer; transition: all 0.2s;
                }
                .bd-btn-whatsapp:hover { background: rgba(37,211,102,0.2); }
                .bd-btn-receipt { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: var(--accent); }
                .bd-btn-receipt:hover { background: rgba(99,102,241,0.18); }
                /* Edit bill */
                .bd-edit-btn { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); color: var(--accent); border-radius: 8px; padding: 5px 13px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
                .bd-edit-btn:hover { background: rgba(99,102,241,0.2); }
                .bd-edit-cancel { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #f87171; }
                .bd-edit-cancel:hover { background: rgba(239,68,68,0.15); }
                .bd-edit-form { background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.2); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 11px; }
                .bd-edit-row { display: flex; flex-direction: column; gap: 5px; }
                .bd-edit-row label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }
                .bd-edit-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 9px; padding: 8px 12px; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s; font-family: inherit; width: 100%; box-sizing: border-box; }
                .bd-edit-input:focus { border-color: var(--accent); }
                .bd-edit-total { font-size: 0.88rem; font-weight: 700; color: var(--accent); text-align: right; padding: 2px 0; }
                .bd-save-btn { display: flex; align-items: center; justify-content: center; width: 100%; padding: 11px; background: var(--accent-gradient); border: none; color: white; border-radius: 11px; font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 3px 12px rgba(99,102,241,0.3); margin-top: 2px; }
                .bd-save-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(99,102,241,0.4); }
            `}</style>
        </div>
    );
};

/* ─── BillList ───────────────────────────────────────────────── */
const BillList = ({ filterCustomerId, filterServiceType = 'all', mode = 'billing', dateMode: propDateMode, singleDate: propSingleDate, onDateModeChange, onSingleDateChange, filterUserId = 'all', renderExtraFilters }) => {
    const { bills, updateBill, users } = useData();
    const { user: currentUser } = useAuth();
    const isOwner = currentUser?.role?.toLowerCase() === 'owner';
    const [selectedBillId, setSelectedBillId] = React.useState(null);
    const selectedBill = selectedBillId ? (bills.find(b => b.id === selectedBillId) || null) : null;
    const [internalDateMode, setInternalDateMode] = React.useState('today');
    const [internalSingleDate, setInternalSingleDate] = React.useState('');
    const [search, setSearch] = React.useState('');

    const isControlled = propDateMode !== undefined;
    const dateMode = isControlled ? propDateMode : internalDateMode;
    const singleDate = isControlled ? (propSingleDate || '') : internalSingleDate;
    const handleSetDateMode = (m) => isControlled ? onDateModeChange?.(m) : setInternalDateMode(m);
    const handleSetSingleDate = (d) => isControlled ? onSingleDateChange?.(d) : setInternalSingleDate(d);

    const isBillingMode = mode === 'billing';
    const isPaymentMode = mode === 'payment';

    const today = new Date();
    const dateStr = (d) => d.toISOString().slice(0, 10);
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return dateStr(d); };
    const todayStr = dateStr(today);
    const yesterdayStr = daysAgo(1);

    // Helper: get the relevant date for a bill depending on mode
    const getBillDate = (b) => {
        if (isPaymentMode) {
            const last = b.payments && b.payments.length > 0 ? b.payments[b.payments.length - 1] : null;
            return last?.date || b.generatedDate;
        }
        return b.generatedDate;
    };

    let filtered = filterCustomerId ? bills.filter(b => b.customerId === filterCustomerId) : bills;

    // In payment mode, only show bills that have at least one payment
    if (isPaymentMode) filtered = filtered.filter(b => b.payments && b.payments.length > 0);

    if (filterServiceType !== 'all') {
        filtered = filtered.filter(b => {
            if (filterServiceType === 'tv') return b.serviceType === 'tv' || b.serviceType === 'both';
            if (filterServiceType === 'internet') return b.serviceType === 'internet' || b.serviceType === 'both';
            return true;
        });
    }

    if (dateMode === 'today') {
        filtered = filtered.filter(b => getBillDate(b) === todayStr);
    } else if (dateMode === 'yesterday') {
        filtered = filtered.filter(b => getBillDate(b) === yesterdayStr);
    } else if (dateMode === 'last15') {
        filtered = filtered.filter(b => getBillDate(b) >= daysAgo(15));
    } else if (dateMode === 'last30') {
        filtered = filtered.filter(b => getBillDate(b) >= daysAgo(30));
    } else if (dateMode === 'last6m') {
        filtered = filtered.filter(b => getBillDate(b) >= daysAgo(180));
    } else if (dateMode === 'single' && singleDate) {
        filtered = filtered.filter(b => getBillDate(b) === singleDate);
    }

    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(b =>
            (b.customerName || '').toLowerCase().includes(q) ||
            (b.phone || '').includes(q) ||
            (b.billNumber || '').toLowerCase().includes(q)
        );
    }

    // Summary totals for billing mode
    const totalBilled = filtered.reduce((s, b) => s + (b.totalAmount || 0), 0);

    // ── Payment mode: flatten bills → individual payment transactions ──
    const allPaymentTxns = isPaymentMode
        ? bills
            .filter(b => b.payments && b.payments.length > 0)
            .flatMap(b => (b.payments || []).map((p, pIdx) => ({
                ...p,
                _pIndex: pIdx,
                bill: b,
                customerName: b.customerName,
                phone: b.phone,
                boxNumber: b.boxNumber,
                billNumber: b.billNumber,
                totalAmount: b.totalAmount,
                currentBalance: b.balance,
                currentStatus: b.status,
            })))
        : [];

    let filteredTxns = allPaymentTxns;
    if (filterCustomerId) filteredTxns = filteredTxns.filter(t => t.bill.customerId === filterCustomerId);
    if (filterUserId !== 'all') filteredTxns = filteredTxns.filter(t => t.collectedBy === filterUserId);
    if (filterServiceType !== 'all') {
        filteredTxns = filteredTxns.filter(t => {
            if (filterServiceType === 'tv') return t.bill.serviceType === 'tv' || t.bill.serviceType === 'both';
            if (filterServiceType === 'internet') return t.bill.serviceType === 'internet' || t.bill.serviceType === 'both';
            return true;
        });
    }
    if (dateMode === 'today') filteredTxns = filteredTxns.filter(t => t.date === todayStr);
    else if (dateMode === 'yesterday') filteredTxns = filteredTxns.filter(t => t.date === yesterdayStr);
    else if (dateMode === 'last15') filteredTxns = filteredTxns.filter(t => t.date >= daysAgo(15));
    else if (dateMode === 'last30') filteredTxns = filteredTxns.filter(t => t.date >= daysAgo(30));
    else if (dateMode === 'last6m') filteredTxns = filteredTxns.filter(t => t.date >= daysAgo(180));
    else if (dateMode === 'single' && singleDate) filteredTxns = filteredTxns.filter(t => t.date === singleDate);
    if (search) {
        const q = search.toLowerCase();
        filteredTxns = filteredTxns.filter(t =>
            (t.customerName || '').toLowerCase().includes(q) ||
            (t.phone || '').includes(q) ||
            String(t.billNumber || '').toLowerCase().includes(q)
        );
    }
    const sortedTxns = [...filteredTxns].sort((a, b) =>
        (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || ''))
    );
    const totalCollectedTxns = filteredTxns.reduce((s, t) => s + (t.amount || 0), 0);

    const clearFilter = () => { handleSetSingleDate(''); handleSetDateMode('today'); };

    const handleUpdatePaymentCollector = (billId, pIndex, newUserId) => {
        const selectedUser = users.find(u => u.id === newUserId);
        if (!selectedUser) return;
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;
        const updatedPayments = (bill.payments || []).map((p, i) =>
            i === pIndex ? { ...p, collectedBy: selectedUser.id, collectedByName: selectedUser.name } : p
        );
        updateBill(billId, { payments: updatedPayments });
    };

    const handleUpdateAttribution = (billId, newUserId) => {
        const selectedUser = users.find(u => u.id === newUserId);
        if (!selectedUser) return;
        updateBill(billId, {
            generatedBy: selectedUser.id,
            generatedByName: selectedUser.name
        });
    };

    return (
        <>
            {/* Date filter bar */}
            <div className="bl-date-bar">
                <div className="bl-date-modes">
                    <button className={`bl-dmode ${dateMode === 'today' ? 'active' : ''}`} onClick={() => handleSetDateMode('today')}>Today</button>
                    <button className={`bl-dmode ${dateMode === 'yesterday' ? 'active' : ''}`} onClick={() => handleSetDateMode('yesterday')}>Yesterday</button>
                    <button className={`bl-dmode ${dateMode === 'all' ? 'active' : ''}`} onClick={() => { handleSetSingleDate(''); handleSetDateMode('all'); }}>All</button>
                    <button className={`bl-dmode ${dateMode === 'last15' ? 'active' : ''}`} onClick={() => handleSetDateMode('last15')}>Last 15 days</button>
                    <button className={`bl-dmode ${dateMode === 'last30' ? 'active' : ''}`} onClick={() => handleSetDateMode('last30')}>Last month</button>
                    <button className={`bl-dmode ${dateMode === 'last6m' ? 'active' : ''}`} onClick={() => handleSetDateMode('last6m')}>Last 6 months</button>
                    <button className={`bl-dmode ${dateMode === 'single' ? 'active' : ''}`} onClick={() => handleSetDateMode('single')}>Pick date</button>
                </div>
                {renderExtraFilters && renderExtraFilters()}
                {dateMode === 'single' && (
                    <div className="bl-date-inputs">
                        <input type="date" className="bl-date-input" value={singleDate} onChange={e => handleSetSingleDate(e.target.value)} />
                        {singleDate && <button className="bl-date-clear" onClick={clearFilter}><X size={13} /></button>}
                    </div>
                )}
            </div>

            {/* Search + summary bar */}
            <div className="bl-search-bar">
                <div className="bl-tbl-search">
                    <Search size={14} className="bl-tbl-search-icon" />
                    <input
                        type="text" placeholder="Search customer, phone or bill #..."
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                    {search && <button className="bl-date-clear" onClick={() => setSearch('')}><X size={12} /></button>}
                </div>
                <div className="bl-summary">
                    <span className="bl-sum-item">{isPaymentMode ? filteredTxns.length : filtered.length} records</span>
                    {isBillingMode && <span className="bl-sum-item">Billed <strong>₹{totalBilled.toLocaleString('en-IN')}</strong></span>}
                    {isPaymentMode && <span className="bl-sum-item">Collected <strong className="green">₹{totalCollectedTxns.toLocaleString('en-IN')}</strong></span>}
                </div>
            </div>

            <div className="table-container">
                {isPaymentMode ? (
                    /* ── Payment mode: one row per payment transaction ── */
                    <table className="data-table bl-payment-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                                {!filterCustomerId && <th style={{ minWidth: 150 }}>Customer</th>}
                                <th style={{ minWidth: 90 }}>Bill #</th>
                                <th style={{ minWidth: 90, whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ minWidth: 100 }}>Amount</th>
                                <th style={{ minWidth: 110 }}>Mode</th>
                                <th style={{ minWidth: 130 }}>Collected By</th>
                                <th style={{ minWidth: 90 }}>Balance</th>
                                <th style={{ minWidth: 80 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTxns.length === 0 ? (
                                <tr><td colSpan={filterCustomerId ? 8 : 9} className="text-center">No payments found.</td></tr>
                            ) : sortedTxns.map((t, i) => {
                                const modeKey = (t.mode || '').toLowerCase().replace(/\s+/g, '');
                                const modeCls = modeKey === 'cash' ? 'cash' : modeKey === 'phonepe' ? 'phonepe' : modeKey === 'gpay' ? 'gpay' : 'default';
                                const rowBorderColor = modeKey === 'cash' ? 'rgba(16,185,129,0.5)' : (modeKey === 'phonepe' || modeKey === 'gpay') ? 'rgba(99,102,241,0.5)' : 'var(--border)';
                                return (
                                    <tr key={`${t.bill.id}_${t._pIndex}`} onClick={() => setSelectedBillId(t.bill.id)} style={{ cursor: 'pointer', borderLeft: `3px solid ${rowBorderColor}` }} className="bill-row-clickable">
                                        <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</td>
                                        {!filterCustomerId && (
                                            <td>
                                                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t.customerName}</strong>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>#{t.billNumber}</span>
                                            </td>
                                        )}
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>#{t.billNumber}</td>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                                        <td>
                                            <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#10b981' }}>₹{(t.amount || 0).toLocaleString('en-IN')}</span>
                                        </td>
                                        <td>
                                            <span className={`bl-mode-badge ${modeCls}`}>{t.mode || 'Cash'}</span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="attribution">
                                                {isOwner ? (
                                                    <select
                                                        className="att-select-inline"
                                                        value={t.collectedBy || ''}
                                                        onChange={e => handleUpdatePaymentCollector(t.bill.id, t._pIndex, e.target.value)}
                                                    >
                                                        <option value="" disabled>Select</option>
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem' }}>{t.collectedByName || '—'}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: t.currentBalance > 0 ? '#ef4444' : '#10b981' }}>
                                                ₹{(t.currentBalance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-pill status-${(t.currentStatus || 'due').toLowerCase()}`}>{t.currentStatus}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : null}
                {isPaymentMode && (
                    /* ── Mobile cards for payment transactions ── */
                    <div className="bl-txn-cards">
                        {sortedTxns.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.84rem', padding: '16px 0' }}>No payments found.</p>
                        ) : sortedTxns.map(t => (
                            <div key={`${t.bill.id}_${t._pIndex}`} className="bl-txn-card" onClick={() => setSelectedBillId(t.bill.id)}>
                                <div className="bl-txn-card-top">
                                    <div>
                                        <div className="bl-txn-card-name">{t.customerName}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                            Bill #{t.billNumber} · {t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </div>
                                    </div>
                                    <span className="bl-txn-card-amt">₹{(t.amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="bl-txn-card-meta">
                                    <span className="bl-txn-meta-tag">{t.mode || 'Cash'}</span>
                                    {isOwner ? (
                                        <select
                                            className="bl-txn-collector-select"
                                            value={t.collectedBy || ''}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => { e.stopPropagation(); handleUpdatePaymentCollector(t.bill.id, t._pIndex, e.target.value); }}
                                        >
                                            <option value="" disabled>— Who collected —</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="bl-txn-meta-tag">{t.collectedByName || '—'}</span>
                                    )}
                                    <span className={`bl-txn-meta-tag ${t.currentBalance > 0 ? 'due' : 'paid'}`}>
                                        {t.currentBalance > 0 ? `₹${t.currentBalance.toLocaleString('en-IN')} due` : 'Cleared'}
                                    </span>
                                    <span className={`status-pill status-${(t.currentStatus || 'due').toLowerCase()}`}>{t.currentStatus}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!isPaymentMode && (
                    /* ── Billing mode: one row per bill ── */
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: 'center' }}>#</th>
                                {!filterCustomerId && <th style={{ minWidth: 150 }}>Customer</th>}
                                <th style={{ minWidth: 90 }}>Bill #</th>
                                <th style={{ minWidth: 100, whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ minWidth: 120 }}>Total Amount</th>
                                <th style={{ minWidth: 140 }}>Generated By</th>
                                <th style={{ minWidth: 90 }}>Balance</th>
                                <th style={{ minWidth: 80 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={filterCustomerId ? 6 : 7} className="text-center">No bills found.</td></tr>
                            ) : (
                                [...filtered].reverse().map((b, i) => {
                                    const serviceIcon = b.serviceType === 'tv'
                                        ? <Tv size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                                        : b.serviceType === 'internet'
                                            ? <Wifi size={12} style={{ marginRight: 4, opacity: 0.7 }} />
                                            : b.serviceType === 'both'
                                                ? <><Tv size={12} style={{ marginRight: 2, opacity: 0.7 }} /><Wifi size={12} style={{ marginRight: 4, opacity: 0.7 }} /></>
                                                : null;
                                    return (
                                        <tr key={b.id} onClick={() => setSelectedBillId(b.id)} style={{ cursor: 'pointer' }} className="bill-row-clickable">
                                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>{i + 1}</td>
                                            {!filterCustomerId && (
                                                <td><strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{b.customerName}</strong></td>
                                            )}
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>#{b.billNumber}</td>
                                            <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(b.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                                    {serviceIcon}₹{(b.totalAmount || 0).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div className="attribution">
                                                    {isOwner ? (
                                                        <select onChange={e => handleUpdateAttribution(b.id, e.target.value)} className="att-select-inline" value={b.generatedBy || ''}>
                                                            <option value="" disabled>Select Worker</option>
                                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span style={{ fontSize: '0.85rem' }}>{b.generatedByName || 'Admin'}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: b.balance > 0 ? '#ef4444' : '#10b981' }}>
                                                    ₹{(b.balance || 0).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td><span className={`status-pill status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
                <style>{`
                    /* Date filter */
                    .bl-date-bar { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; padding: 10px 14px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.01); overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
                    .bl-date-bar::-webkit-scrollbar { display: none; }
                    .bl-date-modes { display: flex; gap: 4px; flex-shrink: 0; }
                    .bl-dmode { background: none; border: 1px solid var(--border); color: var(--text-secondary); padding: 5px 12px; border-radius: 7px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; white-space: nowrap; }
                    .bl-dmode:hover { color: var(--text-primary); border-color: var(--border-bright); }
                    .bl-dmode.active { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.1); }
                    .bl-date-inputs { display: flex; align-items: center; gap: 6px; }
                    .bl-date-input { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; color: var(--text-primary); font-size: 0.82rem; outline: none; font-family: inherit; transition: border-color 0.2s; }
                    .bl-date-input:focus { border-color: var(--accent); }
                    .bl-date-clear { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 6px; padding: 4px 6px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; }
                    .bl-date-clear:hover { color: #ef4444; border-color: #ef4444; }
                    /* Search + summary bar */
                    .bl-search-bar { display: flex; align-items: center; gap: 12px; padding: 8px 14px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.01); }
                    .bl-tbl-search { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.15); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; flex: 1; min-width: 0; transition: border-color 0.2s; }
                    .bl-tbl-search:focus-within { border-color: var(--accent); }
                    .bl-tbl-search-icon { color: var(--text-secondary); flex-shrink: 0; }
                    .bl-tbl-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 0.85rem; min-width: 0; }
                    .bl-tbl-search input::placeholder { color: var(--text-secondary); }
                    .bl-summary { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
                    .bl-sum-item { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }
                    .bl-sum-item strong { color: var(--text-primary); font-weight: 700; }
                    .bl-sum-item strong.green { color: #10b981; }

                    /* Table full-width + improved sizing */
                    .data-table { width: 100%; }
                    .data-table td { padding: 12px 14px; font-size: 0.88rem; }
                    .data-table th { padding: 10px 14px; font-size: 0.78rem; }
                    .data-table tbody tr:nth-child(odd) { background: rgba(255,255,255,0.015); }
                    .data-table tbody tr:nth-child(even) { background: transparent; }

                    .attribution { font-size: 0.8rem; }
                    .att-select-inline {
                        background: rgba(255,255,255,0.05);
                        color: white;
                        border: 1px solid var(--border);
                        border-radius: 4px;
                        font-size: 0.75rem;
                        padding: 4px 8px;
                        width: 100%;
                        min-width: 100px;
                        cursor: pointer;
                        outline: none;
                        transition: all 0.2s;
                    }
                    .att-select-inline:hover { border-color: var(--accent); background: rgba(99, 102, 241, 0.1); }
                    .bill-row-clickable:hover { background: rgba(99,102,241,0.07) !important; }
                    .bill-row-clickable:hover td { color: var(--text-primary); }

                    /* Payment mode badge pill */
                    .bl-mode-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; border: 1px solid; white-space: nowrap; }
                    .bl-mode-badge.cash { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
                    .bl-mode-badge.phonepe { background: rgba(99,102,241,0.1); color: #6366f1; border-color: rgba(99,102,241,0.3); }
                    .bl-mode-badge.gpay { background: rgba(6,182,212,0.1); color: #06b6d4; border-color: rgba(6,182,212,0.3); }
                    .bl-mode-badge.default { background: rgba(255,255,255,0.06); color: var(--text-secondary); border-color: var(--border); }

                    /* Payment transaction cards (mobile) */
                    .bl-txn-cards { display: none; flex-direction: column; gap: 10px; padding: 12px; }
                    .bl-txn-card {
                        background: rgba(255,255,255,0.03); border: 1px solid var(--border);
                        border-radius: 12px; padding: 13px 14px; cursor: pointer;
                        transition: all 0.2s;
                    }
                    .bl-txn-card:hover { border-color: var(--accent); background: rgba(99,102,241,0.06); }
                    .bl-txn-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
                    .bl-txn-card-name { font-weight: 700; font-size: 0.9rem; }
                    .bl-txn-card-amt { font-weight: 800; font-size: 1rem; color: #10b981; }
                    .bl-txn-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
                    .bl-txn-meta-tag {
                        font-size: 0.71rem; padding: 2px 8px; border-radius: 5px;
                        background: rgba(255,255,255,0.06); color: var(--text-secondary);
                        border: 1px solid var(--border);
                    }
                    .bl-txn-meta-tag.due { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.2); }
                    .bl-txn-meta-tag.paid { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.2); }
                    .bl-txn-collector-select {
                        font-size: 0.71rem; padding: 2px 6px; border-radius: 5px;
                        background: rgba(99,102,241,0.08); color: var(--accent);
                        border: 1px solid rgba(99,102,241,0.3);
                        cursor: pointer; outline: none; font-family: inherit;
                        max-width: 130px;
                    }
                    .bl-txn-collector-select:hover { border-color: var(--accent); background: rgba(99,102,241,0.14); }

                    @media (max-width: 640px) {
                        .bl-payment-table { display: none; }
                        .bl-txn-cards { display: flex; }
                        .bl-date-modes { gap: 3px; }
                        .bl-dmode { padding: 4px 9px; font-size: 0.72rem; }
                        .bl-search-bar { flex-wrap: wrap; gap: 8px; }
                        .bl-summary { width: 100%; }
                    }
                `}</style>
            </div>

            {selectedBill && (
                <BillDetailModal bill={selectedBill} onClose={() => setSelectedBillId(null)} />
            )}
        </>
    );
};

export { BillDetailModal };
export default BillList;
