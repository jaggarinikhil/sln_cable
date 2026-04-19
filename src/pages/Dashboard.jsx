import React from 'react';
import { useData } from '../context/DataContext';
import {
    IndianRupee, Users, AlertCircle, Clock,
    TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const StatCard = ({ title, value, subtext, icon, trend, trendValue, color }) => (
    <div className="stat-card">
        <div className="stat-card-main">
            <div className="stat-info">
                <p className="stat-title">{title}</p>
                <h2 className="stat-value">{value}</h2>
                <p className="stat-subtext">{subtext}</p>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: `rgba(${color}, 0.1)`, color: `rgb(${color})` }}>
                {icon}
            </div>
        </div>
        {trend && (
            <div className={`stat-trend ${trend}`}>
                {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{trendValue}% from last month</span>
            </div>
        )}
    </div>
);

const Dashboard = () => {
    const { customers, bills, workHours, complaints } = useData();
    const { logout } = useAuth();

    // Simple aggregations for demo
    const thisMonthBills = bills.filter(b => b.generatedDate.startsWith(new Date().toISOString().slice(0, 7)));
    const totalCollected = thisMonthBills.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const activeComplaints = complaints.filter(c => c.status !== 'Completed').length;
    const totalHours = workHours.reduce((sum, h) => sum + (parseFloat(h.hours) || 0), 0);

    // Chart Data
    const paymentModeData = [
        { name: 'Cash', value: bills.reduce((sum, b) => sum + (b.payments?.filter(p => p.mode === 'Cash').reduce((s, p) => s + p.amount, 0) || 0), 0) },
        { name: 'PhonePe', value: bills.reduce((sum, b) => sum + (b.payments?.filter(p => p.mode === 'PhonePe').reduce((s, p) => s + p.amount, 0) || 0), 0) },
        { name: 'GPay', value: bills.reduce((sum, b) => sum + (b.payments?.filter(p => p.mode === 'GPay').reduce((s, p) => s + p.amount, 0) || 0), 0) },
    ].filter(d => d.value > 0);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    const revenueData = [
        { name: 'Jan', tv: 4000, internet: 2400 },
        { name: 'Feb', tv: 3000, internet: 1398 },
        { name: 'Mar', tv: 2000, internet: 9800 },
        { name: 'Apr', tv: 2780, internet: 3908 },
    ];

    return (
        <div className="dashboard-page">
            <div className="section-header">
                <h1>Dashboard</h1>
                <div className="dashboard-header-actions">
                    <div className="date-badge">
                        <Clock size={16} />
                        <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                    </div>
                    <button className="btn-logout-inline" onClick={logout}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    title="Collected (This Month)"
                    value={`₹${totalCollected.toLocaleString('en-IN')}`}
                    subtext="Revenue from bills"
                    icon={<TrendingUp />}
                    trend="up"
                    trendValue="12.5"
                    color="16, 185, 129"
                />
                <StatCard
                    title="Total Outstanding"
                    value={`₹${totalOutstanding.toLocaleString('en-IN')}`}
                    subtext="Unpaid balances"
                    icon={<IndianRupee />}
                    trend="down"
                    trendValue="4.2"
                    color="248, 113, 113"
                />
                <StatCard
                    title="Total Customers"
                    value={customers.length}
                    subtext="Active households"
                    icon={<Users />}
                    color="59, 130, 246"
                />
                <StatCard
                    title="Active Complaints"
                    value={activeComplaints}
                    subtext="Pending resolution"
                    icon={<AlertCircle />}
                    color="245, 158, 11"
                />
            </div>

            <div className="dashboard-charts">
                <div className="card chart-card">
                    <h3>Payment Mode Split</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={paymentModeData.length > 0 ? paymentModeData : [{ name: 'No Data', value: 1 }]}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentModeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card chart-card wide">
                    <h3>Revenue Trend (TV vs Internet)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="tv" name="Cable TV" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="internet" name="Internet" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="card recent-activity">
                <h3>Recent Bills</h3>
                <div className="table-container no-border no-margin">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Bill #</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Generated By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No recent bills.</td></tr>
                            ) : (
                                bills.slice(-5).reverse().map(b => (
                                    <tr key={b.id}>
                                        <td><strong>{b.customerName}</strong></td>
                                        <td>#{b.billNumber}</td>
                                        <td className="text-total">₹{b.totalAmount}</td>
                                        <td><span className={`status-pill status-${b.status.toLowerCase()}`}>{b.status}</span></td>
                                        <td>{b.generatedByName}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
        .stat-card-main { display: flex; justify-content: space-between; align-items: flex-start; }
        .stat-title { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px; }
        .stat-subtext { font-size: 0.75rem; color: var(--text-secondary); }
        .stat-icon-wrapper { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-trend { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; margin-top: 16px; font-weight: 600; }
        .stat-trend.up { color: #10b981; }
        .stat-trend.down { color: #f87171; }
        
        .dashboard-charts { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; margin-bottom: 32px; }
        .chart-card h3 { margin-bottom: 24px; font-size: 1rem; color: var(--text-primary); }
        .no-border { border: none; }
        .no-margin { margin: 0; }
        
        .date-badge { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-card); padding: 8px 16px; border-radius: 20px; border: 1px solid var(--border); }
        
        @media (max-width: 1200px) { .dashboard-charts { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
};

export default Dashboard;
