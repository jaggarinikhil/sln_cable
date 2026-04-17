import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBills, getComplaints } from '../utils/storage';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import './Dashboard.css';
import './DashboardCharts.css';

const fmt = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n) => {
  const v = parseFloat(n) || 0;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const PIE_COLORS = ['#10b981', '#f87171'];
const BAR_COLOR = '#3b82f6';
const LINE_COLOR = '#8b5cf6';

// ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    setBills(getBills());
    setComplaints(getComplaints());
  }, []);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const totalBills = bills.length;
    const totalCollected = bills.reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0);
    const totalDue = bills.reduce((s, b) => s + (parseFloat(b.balanceAmount) || 0), 0);
    const totalCustomers = new Set(bills.map(b => b.customerName?.toLowerCase().trim()).filter(Boolean)).size;
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;
    const clearedBills = bills.filter(b => (parseFloat(b.balanceAmount) || 0) <= 0).length;
    const dueBills = bills.filter(b => (parseFloat(b.balanceAmount) || 0) > 0).length;
    return { totalBills, totalCollected, totalDue, totalCustomers, totalComplaints, pendingComplaints, clearedBills, dueBills };
  }, [bills, complaints]);

  // ── Pie chart data ──
  const pieData = [
    { name: 'Paid Bills', value: stats.clearedBills },
    { name: 'Due Bills', value: stats.dueBills },
  ];

  // ── Bar chart: last 7 days revenue ──
  const barData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const dayBills = bills.filter(b => b.billGeneratedDate === dateStr);
      days.push({
        date: label,
        Collected: dayBills.reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
        Due: dayBills.reduce((s, b) => s + (parseFloat(b.balanceAmount) || 0), 0),
      });
    }
    return days;
  }, [bills]);

  // ── Monthly bar chart: last 6 months ──
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const mBills = bills.filter(b => b.billGeneratedDate?.startsWith(monthStr));
      months.push({
        month: label,
        Revenue: mBills.reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
        Bills: mBills.length,
      });
    }
    return months;
  }, [bills]);

  // ── Line chart: payment trend (daily collected, last 14 days) ──
  const lineData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const dayBills = bills.filter(b => b.billGeneratedDate === dateStr);
      days.push({
        date: label,
        Amount: dayBills.reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
      });
    }
    return days;
  }, [bills]);

  const summaryCards = [
    { label: 'Total Bills Collected', value: stats.totalBills, sub: `${stats.clearedBills} cleared`, icon: '🧾', color: '#3b82f6' },
    { label: 'Total Due Amount', value: fmt(stats.totalDue), sub: `${stats.dueBills} bills pending`, icon: '⚠️', color: '#f87171' },
    { label: 'Total Customers', value: stats.totalCustomers, sub: 'unique customers', icon: '👥', color: '#10b981' },
    { label: 'Total Complaints', value: stats.totalComplaints, sub: `${stats.pendingComplaints} pending`, icon: '📋', color: '#f59e0b' },
    { label: 'Amount Collected', value: fmt(stats.totalCollected), sub: 'total received', icon: '💰', color: '#8b5cf6' },
    { label: 'Today\'s Date', value: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sub: new Date().toLocaleDateString('en-IN', { weekday: 'long' }), icon: '📅', color: '#06b6d4' },
  ];

  return (
    <div className="dash-container">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-sub">Welcome back, <strong>{user.displayName}</strong> 👑 &nbsp;·&nbsp; {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* ── TOP: Summary Cards ── */}
      <div className="summary-grid">
        {summaryCards.map((card, i) => (
          <div className="summary-card" key={i} style={{ '--c': card.color }}>
            <div className="sc-top">
              <div className="sc-icon">{card.icon}</div>
              <div className="sc-trend" style={{ background: card.color + '22', color: card.color }}>●</div>
            </div>
            <div className="sc-value">{card.value}</div>
            <div className="sc-label">{card.label}</div>
            <div className="sc-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── MIDDLE: Charts ── */}
      <div className="charts-grid">

        {/* Pie Chart */}
        <div className="chart-card chart-pie">
          <div className="chart-header">
            <h2>Paid vs Due Bills</h2>
            <span className="chart-badge">Pie</span>
          </div>
          {stats.totalBills === 0 ? (
            <div className="chart-empty">No bills yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={100}
                  paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Bills']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="pie-legend-row">
            <div className="pie-stat" style={{ color: '#10b981' }}>
              <strong>{stats.clearedBills}</strong> Cleared
            </div>
            <div className="pie-divider" />
            <div className="pie-stat" style={{ color: '#f87171' }}>
              <strong>{stats.dueBills}</strong> Due
            </div>
          </div>
        </div>

        {/* Bar Chart: daily */}
        <div className="chart-card chart-bar">
          <div className="chart-header">
            <h2>Last 7 Days Revenue</h2>
            <span className="chart-badge">Bar</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem' }} />
              <Bar dataKey="Collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Due" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Bar Chart */}
        <div className="chart-card chart-monthly">
          <div className="chart-header">
            <h2>Monthly Revenue</h2>
            <span className="chart-badge">Bar</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={(v, n) => [n === 'Revenue' ? fmt(v) : v, n]} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '0.85rem' }} />
              <Bar dataKey="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bills" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart: payment trend */}
        <div className="chart-card chart-line">
          <div className="chart-header">
            <h2>Payment Trend — 14 Days</h2>
            <span className="chart-badge">Line</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={LINE_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={(v) => [fmt(v), 'Collected']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="Amount" stroke={LINE_COLOR} fill="url(#areaGrad)" strokeWidth={2} dot={{ fill: LINE_COLOR, r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── BOTTOM: Recent Activity ── */}
      <div className="activity-grid">
        <RecentBills bills={bills} />
        <RecentComplaints complaints={complaints} />
      </div>

    </div>
  );
};

// ── Recent Bills ──────────────────────────────────────────────
const RecentBills = ({ bills }) => {
  const recent = [...bills].reverse().slice(0, 8);
  const fmt2 = (n) => `₹${(parseFloat(n) || 0).toFixed(2)}`;
  return (
    <div className="activity-card">
      <div className="activity-header">
        <h2>Recent Payments</h2>
        <span className="activity-count">{bills.length} total</span>
      </div>
      {recent.length === 0 ? (
        <p className="empty-msg">No bills yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Bill Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b, i) => {
                const bal = parseFloat(b.balanceAmount) || 0;
                return (
                  <tr key={b.id}>
                    <td style={{ color: '#64748b' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#e2e8f0' }}>{b.customerName}</td>
                    <td>{b.phone || '—'}</td>
                    <td>{b.plan || '—'}</td>
                    <td>{b.billGeneratedDate || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmt2(b.totalAmount)}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{fmt2(b.amountPaid)}</td>
                    <td>
                      <span className={`balance-pill ${bal > 0 ? 'pill-due' : 'pill-clear'}`}>
                        {fmt2(b.balanceAmount)}
                      </span>
                    </td>
                    <td><span className="payment-badge">{b.paymentMode}</span></td>
                    <td>
                      <span className={`status-dot ${bal <= 0 ? 'dot-clear' : 'dot-due'}`}>
                        {bal <= 0 ? '✅ Cleared' : '⚠️ Due'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Recent Complaints ─────────────────────────────────────────
const RecentComplaints = ({ complaints }) => {
  const recent = [...complaints].reverse().slice(0, 6);
  return (
    <div className="activity-card">
      <div className="activity-header">
        <h2>Recent Complaints</h2>
        <span className="activity-count">{complaints.length} total</span>
      </div>
      {recent.length === 0 ? (
        <p className="empty-msg">No complaints yet.</p>
      ) : (
        <div className="complaint-list">
          {recent.map(c => (
            <div className="complaint-row" key={c.id}>
              <div className="complaint-row-left">
                <div className="complaint-row-name">{c.customerName}</div>
                <div className="complaint-row-issue">{c.issue}</div>
                <div className="complaint-row-meta">
                  {c.phone && <span>📞 {c.phone}</span>}
                  <span>📅 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <span className={`status-badge status-${c.status.replace(' ', '-')}`}>{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
