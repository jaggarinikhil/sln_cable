import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, FileText, Download } from 'lucide-react';
import { generateWhatsAppLink, formatBillMessage } from '../utils/whatsapp';

const BillList = ({ filterCustomerId, filterServiceType = 'all', showActions = true, mode = 'billing' }) => {
    const { bills, updateBill, users } = useData();
    const { user: currentUser } = useAuth();
    const [editingBillId, setEditingBillId] = React.useState(null);

    let filtered = filterCustomerId ? bills.filter(b => b.customerId === filterCustomerId) : bills;

    if (filterServiceType !== 'all') {
        filtered = filtered.filter(b => {
            if (filterServiceType === 'tv') return b.serviceType === 'tv' || b.serviceType === 'both';
            if (filterServiceType === 'internet') return b.serviceType === 'internet' || b.serviceType === 'both';
            return true;
        });
    }

    const handleShare = (bill) => {
        const msg = formatBillMessage(bill);
        window.open(generateWhatsAppLink(bill.phone, msg), '_blank');
    };

    const isBillingMode = mode === 'billing';
    const isPaymentMode = mode === 'payment';

    const handleUpdateAttribution = (billId, newUserId, type) => {
        const selectedUser = users.find(u => u.id === newUserId);
        if (!selectedUser) return;

        if (type === 'generator') {
            updateBill(billId, {
                generatedBy: selectedUser.id,
                generatedByName: selectedUser.name
            });
        } else {
            const bill = bills.find(b => b.id === billId);
            if (bill && bill.payments && bill.payments.length > 0) {
                const updatedPayments = [...bill.payments];
                updatedPayments[updatedPayments.length - 1] = {
                    ...updatedPayments[updatedPayments.length - 1],
                    collectedBy: selectedUser.id,
                    collectedByName: selectedUser.name
                };
                updateBill(billId, { payments: updatedPayments });
            }
        }
        setEditingBillId(null);
    };

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {!filterCustomerId && <th>Customer</th>}
                        <th>Bill #</th>
                        <th>Date</th>
                        <th>Total Amount</th>
                        {isPaymentMode && (
                            <>
                                <th>Paid Amount</th>
                                <th>Paid Date</th>
                                <th>By (Coll.)</th>
                            </>
                        )}
                        <th>By (Gen.)</th>
                        {!isBillingMode && (
                            <>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr><td colSpan={isPaymentMode ? (filterCustomerId ? "10" : "11") : (filterCustomerId ? "5" : "6")} className="text-center">No bills found.</td></tr>
                    ) : (
                        [...filtered].reverse().map(b => {
                            const lastPayment = b.payments && b.payments.length > 0
                                ? b.payments[b.payments.length - 1]
                                : null;

                            const isOwner = currentUser?.role === 'Owner';

                            return (
                                <tr key={b.id}>
                                    {!filterCustomerId && <td><strong>{b.customerName}</strong></td>}
                                    <td>#{b.billNumber}</td>
                                    <td>{new Date(b.generatedDate).toLocaleDateString()}</td>
                                    <td className="text-total">₹{b.totalAmount}</td>
                                    {isPaymentMode && (
                                        <>
                                            <td className="text-paid">₹{b.amountPaid || 0}</td>
                                            <td>{lastPayment ? new Date(lastPayment.date).toLocaleDateString() : '—'}</td>
                                            <td>
                                                <div className="attribution">
                                                    {isOwner ? (
                                                        <select
                                                            onChange={(e) => {
                                                                handleUpdateAttribution(b.id, e.target.value, 'collector');
                                                            }}
                                                            className="att-select-inline"
                                                            value={lastPayment?.collectedBy || ""}
                                                        >
                                                            <option value="" disabled>Select Worker</option>
                                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span>{lastPayment?.collectedByName || '—'}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
                                    <td>
                                        <div className="attribution">
                                            {isOwner ? (
                                                <select
                                                    onChange={(e) => {
                                                        handleUpdateAttribution(b.id, e.target.value, 'generator');
                                                    }}
                                                    className="att-select-inline"
                                                    value={b.generatedBy || ""}
                                                >
                                                    <option value="" disabled>Select Worker</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                            ) : (
                                                <span>{b.generatedByName || 'Admin'}</span>
                                            )}
                                        </div>
                                    </td>
                                    {!isBillingMode && (
                                        <>
                                            <td className={b.balance > 0 ? 'text-due' : 'text-paid'}>₹{b.balance}</td>
                                            <td><span className={`status-pill status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className="btn-icon whatsapp" title="Share on WhatsApp" onClick={() => handleShare(b)}>
                                                        <MessageCircle size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
            <style>{`
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
                .action-btns { display: flex; gap: 8px; }
                .btn-icon { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-icon:hover { color: var(--text-primary); border-color: var(--text-secondary); background: rgba(255,255,255,0.1); }
                .btn-icon.whatsapp { color: #10b981; }
            `}</style>
        </div>
    );
};

export default BillList;
