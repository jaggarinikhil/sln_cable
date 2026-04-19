import React from 'react';
import { useData } from '../context/DataContext';
import { IndianRupee, Calendar, CheckCircle2, Clock } from 'lucide-react';

const CustomerHistory = ({ customerId }) => {
    const { bills } = useData();
    const customerBills = bills.filter(b => b.customerId === customerId);

    if (!customerBills || customerBills.length === 0) {
        return (
            <div className="no-history">
                <p>No billing history found for this customer.</p>
            </div>
        );
    }

    return (
        <div className="customer-history">
            <div className="history-summary-cards">
                <div className="summary-card total">
                    <IndianRupee size={20} />
                    <div>
                        <span>Total Billed</span>
                        <h3>₹{customerBills.reduce((sum, b) => sum + b.totalAmount, 0)}</h3>
                    </div>
                </div>
                <div className="summary-card paid">
                    <CheckCircle2 size={20} />
                    <div>
                        <span>Total Paid</span>
                        <h3>₹{customerBills.reduce((sum, b) => sum + (b.amountPaid || 0), 0)}</h3>
                    </div>
                </div>
                <div className="summary-card due">
                    <Clock size={20} />
                    <div>
                        <span>Current Due</span>
                        <h3>₹{customerBills.reduce((sum, b) => sum + b.balance, 0)}</h3>
                    </div>
                </div>
            </div>

            <div className="table-container mt-24">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Month/Year</th>
                            <th>Bill Date</th>
                            <th>Total Amount</th>
                            <th>Paid Amount</th>
                            <th>Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...customerBills].reverse().map(b => {
                            const date = new Date(b.generatedDate);
                            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });

                            return (
                                <tr key={b.id}>
                                    <td><strong>{monthYear}</strong></td>
                                    <td>{date.toLocaleDateString()}</td>
                                    <td>₹{b.totalAmount}</td>
                                    <td className="text-paid">₹{b.amountPaid || 0}</td>
                                    <td className={b.balance > 0 ? 'text-due' : 'text-paid'}>₹{b.balance}</td>
                                    <td>
                                        <span className={`status-pill status-${b.status.toLowerCase()}`}>
                                            {b.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style>{`
                .customer-history { padding: 10px 0; }
                .history-summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
                .summary-card { 
                    background: var(--bg-card); border: 1px solid var(--border); 
                    padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px;
                }
                .summary-card span { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
                .summary-card h3 { font-size: 1.25rem; font-weight: 700; }
                .summary-card.total { border-left: 4px solid var(--accent); }
                .summary-card.paid { border-left: 4px solid #10b981; }
                .summary-card.due { border-left: 4px solid #ef4444; }
                .mt-24 { margin-top: 24px; }
            `}</style>
        </div>
    );
};

export default CustomerHistory;
