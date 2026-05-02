import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
    IndianRupee, Users, AlertCircle,
    ArrowUpRight, ArrowDownRight,
    Clock, Banknote, CheckCircle, HardHat, Receipt, Wifi, Tv2, Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import AnimatedNumber from '../components/AnimatedNumber';

const StatCard = ({ title, value, subtext, icon, trend, trendValue, color, onClick }) => (
    <div
        className={`stat-card${onClick ? ' clickable' : ''}`}
        style={{ '--card-color': `rgb(${color})`, '--card-color-alpha': `rgba(${color}, 0.1)` }}
        onClick={onClick}
    >
        <div className="stat-card-top">
            <div className="stat-icon-wrap">{icon}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {trend && (
                    <div className={`stat-trend ${trend}`}>
                        {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {trendValue}%
                    </div>
                )}
                {onClick && (
                    <span className="stat-card-arrow">→</span>
                )}
            </div>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        <div className="stat-subtext">{subtext}</div>
    </div>
);

/* ── Worker Dashboard ─────────────────────────────────────────── */
const WorkerDashboard = ({ user, navigate, bills, workHours, salary, complaints, users }) => {
    const perms = user?.permissions || {};
    const todayStr = new Date().toISOString().split('T')[0];

    // Today's work hours (just for stat card)
    const todayHours = useMemo(() => {
        if (!perms.logOwnHours) return 0;
        return (workHours || [])
            .filter(h => (h.workerId === user.userId || h.userId === user.userId) && h.date === todayStr)
            .reduce((s, h) => s + (parseFloat(h.hours) || 0), 0);
    }, [perms.logOwnHours, workHours, user.userId, todayStr]);

    // Payments collected by this worker, sorted newest first
    const myPayments = useMemo(() => {
        if (!perms.recordPayment) return [];
        return bills
            .flatMap(b => (b.payments || []).map(p => ({
                ...p,
                customerName: b.customerName,
                customerId: b.customerId,
            })))
            .filter(p => p.collectedBy === user.userId)
            .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : (b.date || '') < (a.date || '') ? -1 : 0);
    }, [bills, perms.recordPayment, user.userId]);

    // Salary data
    const mySalary = useMemo(() => {
        if (!perms.viewOwnSalary) return null;
        const myUser = users.find(u => u.id === user.userId)
            || users.find(u => u.username === user.username)
            || users.find(u => u.username === user.userId);
        if (!myUser) return null;

        // All possible identifiers that could appear as workerId on salary records
        const myIds = new Set([user.userId, user.username, myUser.id, myUser.username].filter(Boolean));

        const startDay = myUser.salaryStartDay || 1;
        const today = new Date();
        const curCycleStart = today.getDate() >= startDay
            ? new Date(today.getFullYear(), today.getMonth(), startDay)
            : new Date(today.getFullYear(), today.getMonth() - 1, startDay);
        const cycleStartStr = curCycleStart.toLocaleDateString('en-CA');

        const recs = (salary || [])
            .filter(s => myIds.has(s.workerId) && !s.deleted)
            .map(r => {
                if (r.cashAmount !== undefined || r.type === 'advance') return r;
                const amt = parseFloat(r.amount || 0);
                const isDigital = r.paymentMode && r.paymentMode !== 'Cash';
                return { ...r, type: 'salary', cashAmount: isDigital ? 0 : amt, digitalAmount: isDigital ? amt : 0, advanceDeduction: 0 };
            });

        const paidThisCycle = recs
            .filter(r => r.type === 'salary' && (r.paymentDate || '') >= cycleStartStr)
            .reduce((s, r) => s + (r.cashAmount || 0) + (r.digitalAmount || 0) + (r.advanceDeduction || 0), 0);

        const monthlySalary = parseFloat(myUser.monthlySalary) || 0;
        const balanceDue = monthlySalary - paidThisCycle;
        const totalAdv = recs.filter(r => r.type === 'advance').reduce((s, r) => s + (r.advanceAmount || 0), 0);
        const totalAdvDed = recs.filter(r => r.type === 'salary').reduce((s, r) => s + (r.advanceDeduction || 0), 0);
        const outstandingAdv = totalAdv - totalAdvDed;

        return { monthlySalary, paidThisCycle, balanceDue, outstandingAdv, curCycleStart };
    }, [perms.viewOwnSalary, user.userId, user.username, users, salary]);

    // Complaints
    const myComplaints = useMemo(() => {
        if (!perms.viewComplaints) return [];
        return (complaints || []).filter(c => c.status !== 'Completed');
    }, [perms.viewComplaints, complaints]);

    const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
    const todayCollected = myPayments.filter(p => p.date === todayStr).reduce((s, p) => s + (p.amount || 0), 0);
    const totalCollected = myPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const getPaymentBadgeClass = (mode) => {
        const m = mode?.toLowerCase();
        if (m === 'cash') return 'payment-badge payment-badge-cash';
        if (m === 'phonepe') return 'payment-badge payment-badge-phonepe';
        if (m === 'gpay') return 'payment-badge payment-badge-gpay';
        return 'payment-badge payment-badge-default';
    };

    return (
        <div className="dashboard-page">
            <DashboardHero
                user={user}
                role="worker"
                quickStatLabel="Today's collection"
                quickStatValue={fmt(todayCollected)}
                quickStatIcon={<IndianRupee size={20} />}
            />

            <div className="stats-grid" style={{ marginBottom: 28 }}>
                {perms.logOwnHours && (
                    <StatCard
                        title="Hours Today"
                        value={todayHours > 0 ? `${todayHours}h` : '—'}
                        subtext={todayHours > 0 ? 'Logged today' : 'No hours logged yet'}
                        icon={<Clock size={20} />}
                        color="99, 102, 241"
                        onClick={() => navigate('/work-hours')}
                    />
                )}
                {perms.recordPayment && (
                    <StatCard
                        title="Collected Today"
                        value={todayCollected > 0 ? fmt(todayCollected) : '—'}
                        subtext={`${myPayments.filter(p => p.date === todayStr).length} payment${myPayments.filter(p => p.date === todayStr).length !== 1 ? 's' : ''} today`}
                        icon={<CheckCircle size={20} />}
                        color="16, 185, 129"
                        onClick={() => navigate('/payments')}
                    />
                )}
                {mySalary && (
                    <>
                        <StatCard
                            title="Paid This Cycle"
                            value={mySalary.paidThisCycle > 0 ? fmt(mySalary.paidThisCycle) : '—'}
                            subtext={mySalary.monthlySalary > 0 ? `of ${fmt(mySalary.monthlySalary)}` : 'Salary not configured'}
                            icon={<CheckCircle size={20} />}
                            color="16, 185, 129"
                            onClick={() => navigate('/salary')}
                        />
                        <StatCard
                            title={mySalary.balanceDue > 0 ? 'Balance Due' : mySalary.balanceDue < 0 ? 'Excess Paid' : 'Salary Status'}
                            value={mySalary.monthlySalary === 0 ? '—' : mySalary.balanceDue === 0 ? 'Paid ✓' : fmt(Math.abs(mySalary.balanceDue))}
                            subtext={mySalary.outstandingAdv > 0 ? `Advance: ${fmt(mySalary.outstandingAdv)}` : 'No outstanding advance'}
                            icon={<Banknote size={20} />}
                            color={mySalary.balanceDue > 0 ? '248, 113, 113' : '16, 185, 129'}
                            onClick={() => navigate('/salary')}
                        />
                    </>
                )}
                {perms.viewComplaints && (
                    <StatCard
                        title="Active Complaints"
                        value={myComplaints.length}
                        subtext="Pending resolution"
                        icon={<HardHat size={20} />}
                        color="245, 158, 11"
                        onClick={() => navigate('/complaints', { state: { statusFilter: 'Active' } })}
                    />
                )}
            </div>

            <div className="dashboard-bottom-grid" style={{ marginBottom: 24 }}>
                {perms.viewComplaints && myComplaints.length > 0 && (
                    <div className="card recent-activity">
                        <div className="recent-activity-head">
                            <h3>Active Complaints</h3>
                            <button className="view-all-btn" onClick={() => navigate('/complaints', { state: { statusFilter: 'Active' } })}>View all →</button>
                        </div>
                        <div className="table-container no-border no-margin">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Issue</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myComplaints.slice(0, 10).map(c => (
                                        <tr key={c.id} className="payment-row-clickable"
                                            onClick={() => navigate('/complaints', { state: { openComplaintId: c.id } })}>
                                            <td><strong>{c.customerName || '—'}</strong></td>
                                            <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{c.description || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                            </td>
                                            <td>
                                                <span className={`complaint-status-badge complaint-status-${(c.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {c.status || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {perms.recordPayment && (
                    <div className="card recent-activity">
                        <div className="recent-activity-head">
                            <h3 style={{ margin: 0 }}>Payments You Collected</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {totalCollected > 0 && (
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                                        Total: {fmt(totalCollected)}
                                    </span>
                                )}
                                <button className="view-all-btn" onClick={() => navigate('/payments')}>View all →</button>
                            </div>
                        </div>
                        {myPayments.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '12px 0' }}>No payments collected yet.</p>
                        ) : (
                            <div className="table-container no-border no-margin">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Customer</th>
                                            <th>Amount</th>
                                            <th>Mode</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myPayments.slice(0, 10).map((p, i) => (
                                            <tr key={p.id || i} className="payment-row-clickable"
                                                onClick={() => navigate('/payments')}
                                                style={p.date === todayStr ? { background: 'rgba(16,185,129,0.04)' } : {}}>
                                                <td style={{ color: p.date === todayStr ? '#10b981' : 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap', fontWeight: p.date === todayStr ? 700 : 400 }}>
                                                    {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                                                    {p.date === todayStr ? ' · Today' : ''}
                                                </td>
                                                <td><strong>{p.customerName || '—'}</strong></td>
                                                <td className="text-paid"><strong>₹{(p.amount || 0).toLocaleString('en-IN')}</strong></td>
                                                <td>
                                                    <span className={getPaymentBadgeClass(p.mode)}>{p.mode || '—'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <DashboardStyles />
        </div>
    );
};

/* ── Owner Dashboard ─────────────────────────────────────────── */
const DashboardHero = ({ user, role, quickStatLabel, quickStatValue, quickStatIcon }) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = user?.name?.split(' ')[0] || '';
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const tagline = role === 'owner' ? "Here's how SLN Cable is doing today" : "Let's get to work";
    const SunIcon = hour < 12 ? Sun : hour < 17 ? Sun : Clock;
    return (
        <div className="dashboard-hero">
            <div className="dashboard-hero-left">
                <div className="dashboard-hero-greeting">
                    <SunIcon size={22} style={{ opacity: 0.85 }} />
                    <span>{greeting}{firstName ? `, ${firstName}` : ''}</span>
                </div>
                <div className="dashboard-hero-meta">{dateStr}</div>
                <div className="dashboard-hero-tagline">{tagline}</div>
            </div>
            <div className="dashboard-hero-stat">
                <div className="dashboard-hero-stat-icon">{quickStatIcon}</div>
                <div>
                    <div className="dashboard-hero-stat-label">{quickStatLabel}</div>
                    <div className="dashboard-hero-stat-value">{quickStatValue}</div>
                </div>
            </div>
        </div>
    );
};

const OwnerDashboard = ({ user, customers, bills, complaints, navigate }) => {
    const thisMonthBills = bills.filter(b => b.generatedDate?.startsWith(new Date().toISOString().slice(0, 7)));
    const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const activeComplaints = complaints.filter(c => c.status !== 'Completed').length;

    const currentMonth = new Date().toISOString().slice(0, 7);

    // Split collected and outstanding by service type (all-time)
    const tvCollected = bills.reduce((sum, b) => {
        const total = b.totalAmount || 0;
        let ratio = total > 0 ? (b.tvAmount || 0) / total : (b.serviceType === 'tv' ? 1 : (b.serviceType === 'both' ? 0.5 : 0));
        const totalPayments = (b.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        return sum + totalPayments * ratio;
    }, 0);

    const internetCollected = bills.reduce((sum, b) => {
        const total = b.totalAmount || 0;
        let ratio = total > 0 ? (b.internetAmount || 0) / total : (b.serviceType === 'internet' ? 1 : (b.serviceType === 'both' ? 0.5 : 0));
        const totalPayments = (b.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        return sum + totalPayments * ratio;
    }, 0);

    const tvOutstanding = bills.reduce((sum, b) => {
        const total = b.totalAmount || 0;
        let ratio = total > 0 ? (b.tvAmount || 0) / total : (b.serviceType === 'tv' ? 1 : (b.serviceType === 'both' ? 0.5 : 0));
        return sum + (b.balance || 0) * ratio;
    }, 0);

    const internetOutstanding = bills.reduce((sum, b) => {
        const total = b.totalAmount || 0;
        let ratio = total > 0 ? (b.internetAmount || 0) / total : (b.serviceType === 'internet' ? 1 : (b.serviceType === 'both' ? 0.5 : 0));
        return sum + (b.balance || 0) * ratio;
    }, 0);

    const pendingBills = [...bills]
        .filter(b => b.status === 'Due' || b.status === 'Partial')
        .sort((a, b) => (b.balance || 0) - (a.balance || 0))
        .slice(0, 10);
    const pendingBalance = bills.filter(b => b.status === 'Due' || b.status === 'Partial')
        .reduce((s, b) => s + (b.balance || 0), 0);

    const modeSum = (label) => bills.reduce((sum, b) =>
        sum + (b.payments?.filter(p => p.mode?.toLowerCase() === label.toLowerCase()).reduce((s, p) => s + p.amount, 0) || 0), 0);
    const paymentModeData = [
        { name: 'Cash', value: modeSum('Cash') },
        { name: 'PhonePe', value: modeSum('PhonePe') },
        { name: 'GPay', value: modeSum('GPay') },
    ].filter(d => d.value > 0);

    const COLORS = ['#10b981', '#6366f1', '#06b6d4', '#f59e0b'];

    const revenueData = (() => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleDateString('en-IN', { month: 'short' });
            const monthBills = bills.filter(b => (b.generatedDate || '').startsWith(key));
            months.push({
                name: label,
                tv: monthBills.reduce((s, b) => s + (b.tvAmount || 0), 0),
                internet: monthBills.reduce((s, b) => s + (b.internetAmount || 0), 0),
            });
        }
        return months;
    })();

    const recentPayments = bills
        .flatMap(b => (b.payments || []).map(p => ({ ...p, customerName: b.customerName, customerId: b.customerId, billNumber: b.billNumber })))
        .sort((a, b) => new Date(b.date + 'T' + (b.createdAt || '00:00')) - new Date(a.date + 'T' + (a.createdAt || '00:00')))
        .slice(0, 10);

    const getComplaintCustomerName = (c) =>
        customers.find(cu => String(cu.id) === String(c.customerId))?.name || c.customerName || '—';

    const recentComplaints = [...complaints]
        .filter(c => c.status !== 'Completed')
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
        .slice(0, 10);

    const getPaymentBadgeClass = (mode) => {
        const m = mode?.toLowerCase();
        if (m === 'cash') return 'payment-badge payment-badge-cash';
        if (m === 'phonepe') return 'payment-badge payment-badge-phonepe';
        if (m === 'gpay') return 'payment-badge payment-badge-gpay';
        return 'payment-badge payment-badge-default';
    };

    const todayDateStr = new Date().toISOString().split('T')[0];
    const ownerTodayCollected = bills.reduce((sum, b) =>
        sum + ((b.payments || []).filter(p => p.date === todayDateStr).reduce((s, p) => s + (p.amount || 0), 0)), 0);

    return (
        <>
            <DashboardHero
                user={user}
                role="owner"
                quickStatLabel="Today's collection"
                quickStatValue={`₹${Math.round(ownerTodayCollected).toLocaleString('en-IN')}`}
                quickStatIcon={<IndianRupee size={20} />}
            />
            <div className="stats-grid">
                <StatCard
                    title="TV Collected"
                    value={<AnimatedNumber value={Math.round(tvCollected)} prefix="₹" />}
                    subtext="Total Cable TV"
                    icon={<Tv2 size={20} />}
                    color="168, 85, 247"
                    onClick={() => navigate('/payments', { state: { tab: 'payments', service: 'tv' } })}
                />
                <StatCard
                    title="Internet Collected"
                    value={<AnimatedNumber value={Math.round(internetCollected)} prefix="₹" />}
                    subtext="Total Internet"
                    icon={<Wifi size={20} />}
                    color="6, 182, 212"
                    onClick={() => navigate('/payments', { state: { tab: 'payments', service: 'internet' } })}
                />
                <StatCard
                    title="TV Outstanding"
                    value={<AnimatedNumber value={Math.round(tvOutstanding)} prefix="₹" />}
                    subtext="Pending Cable TV"
                    icon={<IndianRupee size={20} />}
                    color="248, 113, 113"
                    onClick={() => navigate('/payments', { state: { tab: 'pending', service: 'tv' } })}
                />
                <StatCard
                    title="Internet Outstanding"
                    value={<AnimatedNumber value={Math.round(internetOutstanding)} prefix="₹" />}
                    subtext="Pending Internet"
                    icon={<IndianRupee size={20} />}
                    color="251, 146, 60"
                    onClick={() => navigate('/payments', { state: { tab: 'pending', service: 'internet' } })}
                />
                <StatCard
                    title="Total Customers"
                    value={<AnimatedNumber value={customers.length} />}
                    subtext="Active households"
                    icon={<Users size={20} />}
                    color="59, 130, 246"
                    onClick={() => navigate('/customers')}
                />
                <StatCard
                    title="Active Complaints"
                    value={<AnimatedNumber value={activeComplaints} />}
                    subtext="Pending resolution"
                    icon={<AlertCircle size={20} />}
                    color="245, 158, 11"
                    onClick={() => navigate('/complaints', { state: { statusFilter: 'Active' } })}
                />
                <StatCard
                    title="Pending Bills"
                    value={<AnimatedNumber value={pendingBills.length} />}
                    subtext={`₹${pendingBalance.toLocaleString('en-IN')} outstanding`}
                    icon={<Receipt size={20} />}
                    color="248, 113, 113"
                    onClick={() => navigate('/payments', { state: { tab: 'pending' } })}
                />
            </div>

            <div className="dashboard-charts">
                <div className="card chart-card">
                    <h3>Payment Mode Split</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={paymentModeData.length > 0 ? paymentModeData : [{ name: 'No Data', value: 1 }]}
                                cx="50%" cy="50%"
                                innerRadius={65}
                                outerRadius={88}
                                paddingAngle={4}
                                dataKey="value"
                            >
                                {paymentModeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-primary)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>Revenue Trend — TV vs Internet</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={revenueData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px' }}
                                itemStyle={{ fontSize: '12px' }}
                                cursor={{ fill: 'var(--bg-row-hover, var(--bg-card-light))' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                            <Bar dataKey="tv" name="Cable TV" fill="#3b82f6" radius={[5, 5, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="internet" name="Internet" fill="#a855f7" radius={[5, 5, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="dashboard-bottom-grid">
                {/* Recent Payments */}
                <div className="card recent-activity">
                    <div className="recent-activity-head">
                        <h3>Recent Payments</h3>
                        <button className="view-all-btn" onClick={() => navigate('/payments')}>View all →</button>
                    </div>
                    <div className="table-container no-border no-margin">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Mode</th>
                                    <th>Date</th>
                                    <th>Collected By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPayments.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center">No payments yet.</td></tr>
                                ) : (
                                    recentPayments.map(p => (
                                        <tr
                                            key={p.id}
                                            className="payment-row-clickable"
                                            onClick={() => navigate('/payments', { state: { customerId: p.customerId } })}
                                        >
                                            <td><strong>{p.customerName}</strong></td>
                                            <td className="text-paid">₹{p.amount?.toLocaleString('en-IN')}</td>
                                            <td>
                                                <span className={getPaymentBadgeClass(p.mode)}>
                                                    {p.mode}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.collectedByName || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Complaints */}
                <div className="card recent-activity">
                    <div className="recent-activity-head">
                        <h3>Recent Complaints</h3>
                        <button className="view-all-btn" onClick={() => navigate('/complaints', { state: { statusFilter: 'Active' } })}>View all →</button>
                    </div>
                    <div className="table-container no-border no-margin">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Issue</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentComplaints.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center">No complaints yet.</td></tr>
                                ) : (
                                    recentComplaints.map(c => (
                                        <tr
                                            key={c.id}
                                            className="payment-row-clickable"
                                            onClick={() => navigate('/complaints', { state: { openComplaintId: c.id } })}
                                        >
                                            <td><strong>{getComplaintCustomerName(c)}</strong></td>
                                            <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{c.description || '—'}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                {c.createdAt || c.date ? new Date(c.createdAt || c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                            </td>
                                            <td>
                                                <span className={`complaint-status-badge complaint-status-${(c.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                                    {c.status || '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Pending Bills */}
            <div className="card recent-activity" style={{ marginTop: 20 }}>
                <div className="recent-activity-head">
                    <h3 style={{ margin: 0 }}>Pending Bills</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171' }}>
                            {pendingBills.length} unpaid
                        </span>
                        <button className="view-all-btn" onClick={() => navigate('/payments', { state: { tab: 'pending' } })}>View all →</button>
                    </div>
                </div>
                {pendingBills.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', textAlign: 'center', padding: '12px 0' }}>No pending bills.</p>
                ) : (
                    <div className="table-container no-border no-margin">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Bill #</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingBills.map(b => (
                                    <tr key={b.id} className="payment-row-clickable"
                                        onClick={() => navigate('/payments', { state: { customerId: b.customerId } })}>
                                        <td><strong>{b.customerName || '—'}</strong></td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>#{b.billNumber}</td>
                                        <td style={{ fontWeight: 600 }}>₹{(b.totalAmount || 0).toLocaleString('en-IN')}</td>
                                        <td className="text-paid">₹{(b.amountPaid || 0).toLocaleString('en-IN')}</td>
                                        <td style={{ color: '#f87171', fontWeight: 700 }}>₹{(b.balance || 0).toLocaleString('en-IN')}</td>
                                        <td>
                                            <span className={`complaint-status-badge ${b.status === 'Partial' ? 'complaint-status-in-progress' : 'complaint-status-open'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

/* ── Shared styles ───────────────────────────────────────────── */
const DashboardStyles = () => (
    <style>{`
/* ── Dashboard hero ── */
.dashboard-hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08));
    border: 1px solid var(--border);
    border-left: 4px solid #6366f1;
    border-radius: 20px;
    padding: 26px 28px;
    margin-bottom: 24px;
    overflow: hidden;
}
.dashboard-hero-left { flex: 1; min-width: 0; }
.dashboard-hero-greeting {
    display: flex; align-items: center; gap: 10px;
    font-size: 1.6rem; font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
}
.dashboard-hero-meta {
    margin-top: 6px;
    font-size: 0.95rem;
    color: var(--text-secondary);
}
.dashboard-hero-tagline {
    margin-top: 4px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    opacity: 0.85;
}
.dashboard-hero-stat {
    display: flex; align-items: center; gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px 16px;
    min-width: 200px;
}
.dashboard-hero-stat-icon {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px;
    border-radius: 10px;
    background: rgba(99,102,241,0.15);
    color: #6366f1;
}
.dashboard-hero-stat-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.dashboard-hero-stat-value {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--text-primary);
}
@media (max-width: 720px) {
    .dashboard-hero {
        flex-direction: column;
        align-items: stretch;
        padding: 20px;
        gap: 14px;
    }
    .dashboard-hero-greeting { font-size: 1.3rem; }
    .dashboard-hero-stat { min-width: 0; width: 100%; }
}

/* ── Stat cards ── */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px; margin-bottom: 28px;
}
.stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 22px 20px;
    position: relative; overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--card-color);
    opacity: 0.8;
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,0.3); }
.stat-card-arrow {
    font-size: 0.85rem; font-weight: 700;
    color: var(--card-color); opacity: 0.6;
    transition: opacity 0.2s, transform 0.2s;
    display: inline-block;
}
.stat-card.clickable:hover .stat-card-arrow { opacity: 1; transform: translateX(3px); }

.stat-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.stat-icon-wrap {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    background: var(--card-color-alpha);
    color: var(--card-color);
    flex-shrink: 0;
}
.stat-trend {
    display: flex; align-items: center; gap: 2px;
    font-size: 0.72rem; font-weight: 700; padding: 3px 8px;
    border-radius: 20px;
}
.stat-trend.up { background: rgba(16,185,129,0.12); color: #10b981; }
.stat-trend.down { background: rgba(239,68,68,0.1); color: #f87171; }

.stat-value {
    font-size: 1.9rem; font-weight: 800;
    color: var(--text-primary); line-height: 1; margin-bottom: 6px;
}
.stat-title {
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--card-color); margin-bottom: 3px;
}
.stat-subtext { font-size: 0.74rem; color: var(--text-secondary); }

/* ── Charts ── */
.dashboard-charts {
    display: grid; grid-template-columns: 1fr 2fr;
    gap: 20px; margin-bottom: 28px;
}
.chart-card { padding: 22px; }
.chart-card h3 {
    font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--text-secondary); margin-bottom: 20px;
}

/* ── Bottom grid (payments + complaints side by side) ── */
.dashboard-bottom-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 20px;
}
@media (max-width: 1000px) { .dashboard-bottom-grid { grid-template-columns: 1fr; } }

/* ── Recent panels ── */
.recent-activity { padding: 22px; }
.recent-activity h3 {
    font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.07em; color: var(--text-secondary); margin-bottom: 16px;
}
.no-border { border: none; }
.no-margin { margin: 0; }

/* ── Complaint status badges ── */
.complaint-status-badge {
    font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
    border-radius: 20px; text-transform: uppercase; letter-spacing: 0.03em;
    border: 1px solid; white-space: nowrap;
}
.complaint-status-pending { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
.complaint-status-in-progress { background: rgba(99,102,241,0.1); color: #6366f1; border-color: rgba(99,102,241,0.3); }
.complaint-status-completed { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
.complaint-status-open { background: rgba(248,113,113,0.1); color: #f87171; border-color: rgba(248,113,113,0.3); }

.payment-badge {
    font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
    border-radius: 20px; text-transform: uppercase; letter-spacing: 0.03em;
    border: 1px solid;
}
.payment-badge-cash { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
.payment-badge-phonepe { background: rgba(99,102,241,0.1); color: #6366f1; border-color: rgba(99,102,241,0.3); }
.payment-badge-gpay { background: rgba(6,182,212,0.1); color: #06b6d4; border-color: rgba(6,182,212,0.3); }
.payment-badge-default { background: var(--bg-input-hover, var(--bg-card-light)); color: var(--text-secondary); border-color: var(--border); }

.payment-row-clickable { cursor: pointer; transition: background 0.15s; }
.payment-row-clickable:hover { background: var(--bg-row-hover, var(--bg-card-light)); }

/* ── Page wrapper ── */
.dashboard-page { padding: 28px 32px; }

/* ── Responsive ── */
@media (max-width: 1200px) { .dashboard-charts { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
    .dashboard-page { padding: 14px 12px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
    .stat-card { padding: 14px 12px; border-radius: 14px; }
    .stat-value { font-size: 1.35rem; }
    .stat-icon-wrap { width: 36px; height: 36px; border-radius: 10px; }
    .dashboard-charts { gap: 12px; margin-bottom: 16px; }
    .chart-card { padding: 14px; }
    .chart-card h3 { margin-bottom: 12px; }
    .chart-card .recharts-wrapper,
    .chart-card .recharts-responsive-container { height: 180px !important; min-height: unset !important; }
    .recent-activity { padding: 14px; }
    .recent-activity h3 { margin-bottom: 10px; }
    .dashboard-bottom-grid { gap: 12px; }
    .data-table th, .data-table td { padding: 8px 10px; font-size: 0.78rem; }
    .recent-activity .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
@media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-card { padding: 12px 10px; }
    .stat-value { font-size: 1.15rem; }
    .stat-subtext { font-size: 0.68rem; }
}
    `}</style>
);

/* ── Dashboard (router) ──────────────────────────────────────── */
const Dashboard = () => {
    const data = useData();
    const { customers, bills, complaints } = data;
    const { user } = useAuth();
    const navigate = useNavigate();

    const isOwner = user?.role?.toLowerCase() === 'owner';

    if (!isOwner) {
        return <WorkerDashboard user={user} navigate={navigate} bills={bills} workHours={data.workHours} salary={data.salary} complaints={complaints} users={data.users} />;
    }

    return (
        <div className="dashboard-page">
            <div className="section-header">
                <h1>Dashboard</h1>
            </div>
            <OwnerDashboard user={user} customers={customers} bills={bills} complaints={complaints} navigate={navigate} />
            <DashboardStyles />
        </div>
    );
};

export default Dashboard;
