import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Search, Download, FileText, Calendar, Wallet, Users, LayoutDashboard, IndianRupee } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

const DailyCollections = ({ bills }) => {
    const { updateBill, users } = useData();
    const { user: currentUser } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const dailyBills = bills.filter(b => b.generatedDate === date);
    const dailyPayments = bills.flatMap(b => (b.payments || []).filter(p => p.date === date).map(p => ({
        ...p, customerName: b.customerName, billNumber: b.billNumber, originalBill: b
    })));

    const handleUpdateAttribution = (billId, userId, type) => {
        const selectedUser = users.find(u => u.id === userId);
        if (!selectedUser) return;

        if (type === 'generator') {
            updateBill(billId, { generatedBy: selectedUser.id, generatedByName: selectedUser.name });
        } else {
            const bill = bills.find(b => b.id === billId);
            if (bill && bill.payments) {
                // Find all payments for this bill that happened on this specific date
                const updatedPayments = bill.payments.map(p => {
                    if (p.date === date) {
                        return { ...p, collectedBy: selectedUser.id, collectedByName: selectedUser.name };
                    }
                    return p;
                });
                updateBill(billId, { payments: updatedPayments });
            }
        }
    };

    const totallyBilled = dailyBills.reduce((sum, b) => sum + b.totalAmount, 0);
    // ... rest of the logic remains the same
    const totallyReceived = dailyPayments.reduce((sum, p) => sum + p.amount, 0);

    const cashTotal = dailyPayments.filter(p => p.mode === 'Cash').reduce((sum, p) => sum + p.amount, 0);
    const phonepeTotal = dailyPayments.filter(p => p.mode === 'PhonePe').reduce((sum, p) => sum + p.amount, 0);
    const gpayTotal = dailyPayments.filter(p => p.mode === 'GPay').reduce((sum, p) => sum + p.amount, 0);

    // Chart Data
    const modeData = [
        { name: 'Cash', value: cashTotal },
        { name: 'PhonePe', value: phonepeTotal },
        { name: 'GPay', value: gpayTotal },
    ].filter(d => d.value > 0);

    const comparisonData = [
        { name: 'Generated', amount: totallyBilled },
        { name: 'Received', amount: totallyReceived },
    ];

    // Worker breakdown
    const workerSummary = {};
    dailyPayments.forEach(p => {
        const name = p.collectedByName || 'Unknown';
        if (!workerSummary[name]) workerSummary[name] = { name, total: 0, cash: 0, phonepe: 0, gpay: 0 };
        workerSummary[name].total += p.amount;
        if (p.mode === 'Cash') workerSummary[name].cash += p.amount;
        else if (p.mode === 'PhonePe') workerSummary[name].phonepe += p.amount;
        else if (p.mode === 'GPay') workerSummary[name].gpay += p.amount;
    });

    return (
        <div className="report-view">
            <div className="report-controls">
                <div className="form-group">
                    <label>Select Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
            </div>

            <div className="report-summary-grid">
                <div className="summary-box secondary">
                    <span>Payments Generated</span>
                    <h2 className="text-total">₹{totallyBilled.toLocaleString('en-IN')}</h2>
                </div>
                <div className="summary-box primary">
                    <span>Payments Received</span>
                    <h2 className="text-paid">₹{totallyReceived.toLocaleString('en-IN')}</h2>
                </div>
            </div>

            <div className="payment-modes-grid mt-24">
                <div className="mode-box cash">
                    <span>Total Cash</span>
                    <h3>₹{cashTotal.toLocaleString('en-IN')}</h3>
                </div>
                <div className="mode-box phonepe">
                    <span>Total PhonePe</span>
                    <h3>₹{phonepeTotal.toLocaleString('en-IN')}</h3>
                </div>
                <div className="mode-box gpay">
                    <span>Total GPay</span>
                    <h3>₹{gpayTotal.toLocaleString('en-IN')}</h3>
                </div>
            </div>

            <div className="report-charts-grid mt-24">
                <div className="card chart-card">
                    <h4>Collections by Mode</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        {modeData.length > 0 ? (
                            <PieChart>
                                <Pie data={modeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                                    {modeData.map((u, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip tooltipHexColor="#ffffff" />
                                <Legend />
                            </PieChart>
                        ) : (
                            <div className="empty-chart">No data for pie chart</div>
                        )}
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h4>Billed vs Received</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                            <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Payments Received Table */}
            <div className="card mt-24">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">💰</span>
                    <h3 className="no-margin">Payments Received Today ({dailyPayments.length})</h3>
                </div>
                <div className="table-container no-border">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Customer</th>
                                <th>Plan</th>
                                <th>Total Bill</th>
                                <th>Payment</th>
                                <th>Pay No.</th>
                                <th>Balance Left</th>
                                <th>Status</th>
                                <th>By (Coll.)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyPayments.length === 0 ? (
                                <tr><td colSpan="10" className="text-center">No payments received today.</td></tr>
                            ) : (
                                dailyPayments.map((p, idx) => {
                                    const b = bills.find(bill => bill.billNumber === p.billNumber);
                                    const payIndex = b ? b.payments.findIndex(pay => pay.id === p.id) + 1 : 1;
                                    const paySuffix = payIndex === 1 ? 'st' : payIndex === 2 ? 'nd' : payIndex === 3 ? 'rd' : 'th';
                                    const isOwner = currentUser?.role === 'Owner';

                                    return (
                                        <tr key={p.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{p.customerName}</strong></td>
                                            <td className="text-secondary">{b?.serviceType === 'both' ? 'TV + Internet' : b?.serviceType === 'tv' ? 'Cable TV' : 'Internet'}</td>
                                            <td className="text-total">₹{b?.totalAmount || '—'}</td>
                                            <td className="text-paid">₹{p.amount}</td>
                                            <td>{payIndex}{paySuffix}</td>
                                            <td className="text-due">₹{b?.balance || 0}</td>
                                            <td><span className={`status-pill ${b?.balance === 0 ? 'status-paid' : 'status-partial'}`}>{b?.balance === 0 ? 'CLEARED' : 'PARTIAL'}</span></td>
                                            <td>
                                                {isOwner ? (
                                                    <select
                                                        className="att-select-inline"
                                                        value={p.collectedBy || ''}
                                                        onChange={(e) => handleUpdateAttribution(b.id, e.target.value, 'collector')}
                                                    >
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs">{p.collectedByName}</span>
                                                )}
                                            </td>
                                            <td>📱</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bills Generated Table */}
            <div className="card mt-24">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🧾</span>
                    <h3 className="no-margin">Bills Generated Today ({dailyBills.length})</h3>
                </div>
                <div className="table-container no-border">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Customer</th>
                                <th>Plan</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>By (Gen.)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyBills.length === 0 ? (
                                <tr><td colSpan="10" className="text-center">No bills generated today.</td></tr>
                            ) : (
                                dailyBills.map((b, idx) => {
                                    const isOwner = currentUser?.role === 'Owner';
                                    return (
                                        <tr key={b.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{b.customerName}</strong></td>
                                            <td className="text-secondary">{b.serviceType === 'both' ? 'TV + Internet' : b.serviceType === 'tv' ? 'Cable TV' : 'Internet'}</td>
                                            <td className="text-total">₹{b.totalAmount}</td>
                                            <td className="text-paid">₹{b.amountPaid || 0}</td>
                                            <td className="text-due">₹{b.balance}</td>
                                            <td>{new Date(b.generatedDate).toLocaleDateString('en-GB')}</td>
                                            <td><span className={`status-pill ${b.status === 'Paid' ? 'status-paid' : 'status-due'}`}>{b.status === 'Paid' ? 'CLEARED' : b.status.toUpperCase()}</span></td>
                                            <td>
                                                {isOwner ? (
                                                    <select
                                                        className="att-select-inline"
                                                        value={b.generatedBy || ''}
                                                        onChange={(e) => handleUpdateAttribution(b.id, e.target.value, 'generator')}
                                                    >
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs">{b.generatedByName}</span>
                                                )}
                                            </td>
                                            <td>📱</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .report-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .payment-modes-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                .mode-box { background: var(--bg-card); border: 1px solid var(--border); padding: 16px; border-radius: 12px; }
                .mode-box span { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px; display: block; }
                .mode-box h3 { font-size: 1.4rem; font-weight: 800; }
                .mode-box.cash { border-top: 4px solid #f59e0b; }
                .mode-box.phonepe { border-top: 4px solid #a855f7; }
                .mode-box.gpay { border-top: 4px solid #3b82f6; }
                .empty-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-style: italic; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 8px; }
                .no-margin { margin: 0 !important; }
                .att-select-inline { 
                    background: rgba(255,255,255,0.05); 
                    color: white; 
                    border: 1px solid var(--border); 
                    border-radius: 4px; 
                    font-size: 0.75rem; 
                    padding: 4px 8px;
                    min-width: 100px;
                    cursor: pointer;
                    outline: none;
                    transition: all 0.2s;
                }
                .att-select-inline:hover { border-color: var(--accent); background: rgba(99, 102, 241, 0.1); }
            `}</style>
        </div>
    );
};

const MonthlyReports = ({ bills }) => {
    const { updateBill, users } = useData();
    const { user: currentUser } = useAuth();
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth(); // 0-indexed
    const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleUpdateAttribution = (billId, userId, type) => {
        const selectedUser = users.find(u => u.id === userId);
        if (!selectedUser) return;

        if (type === 'generator') {
            updateBill(billId, { generatedBy: selectedUser.id, generatedByName: selectedUser.name });
        } else {
            const bill = bills.find(b => b.id === billId);
            if (bill && bill.payments) {
                // For monthly, we update the payments belonging to this specific month selection
                const updatedPayments = bill.payments.map(p => {
                    const d = new Date(p.date);
                    if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
                        return { ...p, collectedBy: selectedUser.id, collectedByName: selectedUser.name };
                    }
                    return p;
                });
                updateBill(billId, { payments: updatedPayments });
            }
        }
    };

    // Filter data for the selected month/year
    const filteredBills = bills.filter(b => {
        const d = new Date(b.generatedDate);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const filteredPayments = bills.flatMap(b => (b.payments || []).filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).map(p => ({ ...p, b })));

    const totallyBilled = filteredBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const totallyReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

    // Chart Data calculations
    const serviceSplit = [
        { name: 'Cable TV', value: filteredBills.reduce((sum, b) => sum + (b.tvAmount || 0), 0) },
        { name: 'Internet', value: filteredBills.reduce((sum, b) => sum + (b.internetAmount || 0), 0) },
    ];

    const modeSplit = [
        { name: 'Cash', value: filteredPayments.filter(p => p.mode === 'Cash').reduce((sum, p) => sum + p.amount, 0) },
        { name: 'PhonePe', value: filteredPayments.filter(p => p.mode === 'PhonePe').reduce((sum, p) => sum + p.amount, 0) },
        { name: 'GPay', value: filteredPayments.filter(p => p.mode === 'GPay').reduce((sum, p) => sum + p.amount, 0) },
    ];

    const workerStats = {};
    filteredPayments.forEach(p => {
        const name = p.collectedByName || 'Unknown';
        if (!workerStats[name]) workerStats[name] = { name, value: 0, cash: 0, online: 0 };
        workerStats[name].value += p.amount;
        if (p.mode === 'Cash') workerStats[name].cash += p.amount;
        else workerStats[name].online += p.amount;
    });
    const workerData = Object.values(workerStats);

    return (
        <div className="report-view">
            <div className="report-controls">
                <div className="form-group">
                    <label>Select Month</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Select Year</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            <div className="report-summary-mini">
                <div className="summary-box">
                    <span>Billed in {monthNames[selectedMonth]}</span>
                    <h2 className="text-total">₹{totallyBilled.toLocaleString('en-IN')}</h2>
                </div>
                <div className="summary-box">
                    <span>Received in {monthNames[selectedMonth]}</span>
                    <h2 className="text-paid">₹{totallyReceived.toLocaleString('en-IN')}</h2>
                </div>
            </div>

            <div className="report-charts-grid">
                <div className="card chart-card">
                    <h4>Service Split (TV vs Internet)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={serviceSplit} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                                {serviceSplit.map((u, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip tooltipHexColor="#ffffff" />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h4>Collection Modes</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={modeSplit}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                            <Bar dataKey="value" name="Amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card wide">
                    <h4>Worker-wise Collection</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={workerData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="cash" name="Cash" fill="#f59e0b" stackId="a" />
                            <Bar dataKey="online" name="Online" fill="#3b82f6" stackId="a" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Payments Received for Month */}
            <div className="card mt-24">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">💰</span>
                    <h3 className="no-margin">Payments Received in {monthNames[selectedMonth]} ({filteredPayments.length})</h3>
                </div>
                <div className="table-container no-border">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Customer</th>
                                <th>Plan</th>
                                <th>Total Bill</th>
                                <th>Payment</th>
                                <th>Pay No.</th>
                                <th>Balance Left</th>
                                <th>Status</th>
                                <th>By (Coll.)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.length === 0 ? (
                                <tr><td colSpan="10" className="text-center">No payments received for this month.</td></tr>
                            ) : (
                                filteredPayments.map((p, idx) => {
                                    const b = p.b; // Original bill attached in mapping
                                    const payIndex = b.payments.findIndex(pay => pay.id === p.id) + 1;
                                    const paySuffix = payIndex === 1 ? 'st' : payIndex === 2 ? 'nd' : payIndex === 3 ? 'rd' : 'th';
                                    const isOwner = currentUser?.role === 'Owner';

                                    return (
                                        <tr key={p.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{p.customerName || b.customerName}</strong></td>
                                            <td className="text-secondary">{b.serviceType === 'both' ? 'TV + Internet' : b.serviceType === 'tv' ? 'Cable TV' : 'Internet'}</td>
                                            <td className="text-total">₹{b.totalAmount}</td>
                                            <td className="text-paid">₹{p.amount}</td>
                                            <td>{payIndex}{paySuffix}</td>
                                            <td className="text-due">₹{b.balance}</td>
                                            <td><span className={`status-pill ${b.balance === 0 ? 'status-paid' : 'status-partial'}`}>{b.balance === 0 ? 'CLEARED' : 'PARTIAL'}</span></td>
                                            <td>
                                                {isOwner ? (
                                                    <select
                                                        className="att-select-inline"
                                                        value={p.collectedBy || ''}
                                                        onChange={(e) => handleUpdateAttribution(b.id, e.target.value, 'collector')}
                                                    >
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs">{p.collectedByName}</span>
                                                )}
                                            </td>
                                            <td>📱</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bills Generated for Month */}
            <div className="card mt-24">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🧾</span>
                    <h3 className="no-margin">Bills Generated in {monthNames[selectedMonth]} ({filteredBills.length})</h3>
                </div>
                <div className="table-container no-border">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Customer</th>
                                <th>Plan</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>By (Gen.)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBills.length === 0 ? (
                                <tr><td colSpan="10" className="text-center">No bills generated for this month.</td></tr>
                            ) : (
                                filteredBills.map((b, idx) => {
                                    const isOwner = currentUser?.role === 'Owner';
                                    return (
                                        <tr key={b.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{b.customerName}</strong></td>
                                            <td className="text-secondary">{b.serviceType === 'both' ? 'TV + Internet' : b.serviceType === 'tv' ? 'Cable TV' : 'Internet'}</td>
                                            <td className="text-total">₹{b.totalAmount}</td>
                                            <td className="text-paid">₹{b.amountPaid || 0}</td>
                                            <td className="text-due">₹{b.balance}</td>
                                            <td>{new Date(b.generatedDate).toLocaleDateString('en-GB')}</td>
                                            <td><span className={`status-pill ${b.status === 'Paid' ? 'status-paid' : 'status-due'}`}>{b.status === 'Paid' ? 'CLEARED' : b.status.toUpperCase()}</span></td>
                                            <td>
                                                {isOwner ? (
                                                    <select
                                                        className="att-select-inline"
                                                        value={b.generatedBy || ''}
                                                        onChange={(e) => handleUpdateAttribution(b.id, e.target.value, 'generator')}
                                                    >
                                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs">{b.generatedByName}</span>
                                                )}
                                            </td>
                                            <td>📱</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .report-charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 24px; }
                .chart-card.wide { grid-column: span 2; }
                @media (max-width: 768px) { .report-charts-grid { grid-template-columns: 1fr; } .chart-card.wide { grid-column: span 1; } }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 8px; }
                .no-margin { margin: 0 !important; }
            `}</style>
        </div>
    );
};

const Reports = () => {
    const { bills } = useData();
    const [activeTab, setActiveTab] = useState('daily');

    return (
        <div className="reports-page">
            <div className="section-header">
                <h1>Financial Reports</h1>
            </div>

            <div className="billing-nav">
                <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
                    <Calendar size={18} /> Daily
                </button>
                <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>
                    <FileText size={18} /> Monthly
                </button>
            </div>

            <div className="report-content">
                {activeTab === 'daily' && <DailyCollections bills={bills} />}
                {activeTab === 'monthly' && <MonthlyReports bills={bills} />}
            </div>

            <style>{`
                .report-controls { display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-end; }
                .report-summary-mini { display: flex; gap: 24px; }
                .summary-box { background: var(--bg-card); border: 1px solid var(--border); padding: 24px; border-radius: 12px; flex: 1; }
                .summary-box span { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 8px; display: block; }
                .summary-box h2 { font-size: 1.8rem; font-weight: 800; }
                .mt-24 { margin-top: 24px; }
                .card h3, .card h4 { margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; }
            `}</style>
        </div>
    );
};

export default Reports;
