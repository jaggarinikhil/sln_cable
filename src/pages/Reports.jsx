import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    Calendar, FileText, ChevronDown, ChevronRight,
    Receipt, Wallet, AlertCircle, Clock, IndianRupee, Users
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, ReferenceLine
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
const C_TV = '#a855f7';
const C_NET = '#06b6d4';
const C_CASH = '#10b981';
const C_DIGITAL = '#6366f1';

const CHART_TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '10px',
        fontSize: '12px',
        color: 'white',
    }
};
const CHART_GRID_STROKE = 'rgba(255,255,255,0.05)';
const CHART_AXIS_PROPS = {
    stroke: '#64748b',
    fontSize: 11,
    tickLine: false,
    axisLine: false,
};

// ── Helper ──────────────────────────────────────────────────────────────────
const toLocalDate = (d) => new Date(d).toLocaleDateString('en-CA'); // YYYY-MM-DD

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const serviceLabel = (type) =>
    type === 'both' ? 'TV + Internet' : type === 'tv' ? 'Cable TV' : 'Internet';

// ── Collapsible Section Card ─────────────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, count, accentColor, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="section-card" style={{ borderLeftColor: accentColor }}>
            <button className="section-card-header" onClick={() => setOpen(o => !o)}>
                <div className="section-card-left">
                    <span className="section-icon" style={{ color: accentColor, background: `${accentColor}22` }}>
                        <Icon size={17} />
                    </span>
                    <span className="section-title">{title}</span>
                    <span className="section-badge" style={{ background: `${accentColor}33`, color: accentColor }}>
                        {count}
                    </span>
                </div>
                <span className="section-chevron" style={{ color: accentColor }}>
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
            </button>
            {open && (
                <div className="section-card-body">
                    {children}
                </div>
            )}
        </div>
    );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ label }) => (
    <p className="section-empty">No {label} for this date.</p>
);

// ── Daily Report ──────────────────────────────────────────────────────────────
const DailyReport = () => {
    const { bills, complaints, users, updateBill, updateComplaint, workHours: workHoursAll, salary: salaryAll } = useData();
    const { user: currentUser } = useAuth();

    const today = new Date().toLocaleDateString('en-CA');
    const [date, setDate] = useState(today);

    const isOwner = currentUser?.role?.toLowerCase() === 'owner';

    // ── Data Derivations ────────────────────────────────────────────────────
    const dayBills = bills.filter(b => b.generatedDate === date);

    const dayPayments = bills.flatMap(b =>
        (b.payments || [])
            .filter(p => p.date === date)
            .map(p => ({ ...p, customerName: b.customerName, billNumber: b.billNumber, _bill: b }))
    );

    const dayComplaints = complaints.filter(c => {
        try { return toLocalDate(c.createdAt) === date; } catch { return false; }
    });

    const dayHours = (workHoursAll || []).filter(h => h.date === date);

    // Group hours by worker
    const hoursByWorker = {};
    dayHours.forEach(h => {
        const key = h.userId || h.userName || 'Unknown';
        if (!hoursByWorker[key]) hoursByWorker[key] = { name: h.userName || key, entries: [], totalHours: 0 };
        hoursByWorker[key].entries.push(h);
        hoursByWorker[key].totalHours += parseFloat(h.hours) || 0;
    });
    const workerGroups = Object.values(hoursByWorker);

    const daySalary = (salaryAll || []).filter(s => {
        const d1 = s.paymentDate === date;
        const d2 = s.date === date;
        return d1 || d2;
    });

    // ── Summary Stats ───────────────────────────────────────────────────────
    const totalBilled = dayBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalCollected = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalHoursWorked = dayHours.reduce((s, h) => s + (parseFloat(h.hours) || 0), 0);

    const comparisonData = [
        { name: 'Billed', amount: totalBilled },
        { name: 'Collected', amount: totalCollected },
    ];

    // ── Attribution Handlers ────────────────────────────────────────────────
    const handleGeneratorChange = (billId, userId) => {
        const u = users.find(x => x.id === userId);
        if (!u) return;
        updateBill(billId, { generatedBy: u.id, generatedByName: u.name });
    };

    const handleCollectorChange = (billId, payDate, userId) => {
        const u = users.find(x => x.id === userId);
        if (!u) return;
        const bill = bills.find(b => b.id === billId);
        if (!bill?.payments) return;
        const updatedPayments = bill.payments.map(p =>
            p.date === payDate ? { ...p, collectedBy: u.id, collectedByName: u.name } : p
        );
        updateBill(billId, { payments: updatedPayments });
    };

    const handleComplaintLoggerChange = (complaintId, userId) => {
        const u = users.find(x => x.id === userId);
        if (!u) return;
        updateComplaint(complaintId, { createdBy: u.id, createdByName: u.name });
    };

    // ── Worker collection summary for the day ───────────────────────────────
    const workerCollectionMap = {};
    dayPayments.forEach(p => {
        const key = p.collectedBy || '__unassigned__';
        if (!workerCollectionMap[key]) {
            workerCollectionMap[key] = {
                name: p.collectedByName || (key === '__unassigned__' ? 'Unassigned' : key),
                cash: 0, digital: 0, total: 0
            };
        }
        const amt = p.amount || 0;
        const isCash = (p.mode || '').toLowerCase() === 'cash';
        if (isCash) workerCollectionMap[key].cash += amt;
        else workerCollectionMap[key].digital += amt;
        workerCollectionMap[key].total += amt;
    });
    const workerCollectionRows = Object.values(workerCollectionMap).sort((a, b) => b.total - a.total);

    // ── Enhanced stats for daily view ───────────────────────────────────────
    const totalOutstanding = dayBills.reduce((s, b) => s + (b.balance ?? (b.totalAmount - (b.amountPaid || 0))), 0);
    const cashCollected = dayPayments.filter(p => (p.mode || '').toLowerCase() === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
    const digitalCollected = dayPayments.filter(p => (p.mode || '').toLowerCase() !== 'cash').reduce((s, p) => s + (p.amount || 0), 0);

    // TV vs Internet split for collected payments
    const dayTvCollected = dayPayments.reduce((s, p) => {
        const b = p._bill;
        const total = b?.totalAmount || 0;
        const ratio = total > 0 ? (b?.tvAmount || 0) / total : (b?.serviceType === 'tv' ? 1 : 0);
        return s + (p.amount || 0) * ratio;
    }, 0);
    const dayInternetCollected = totalCollected - dayTvCollected;

    // ── Payment mode donut data ──────────────────────────────────────────────
    const modeMap = {};
    dayPayments.forEach(p => {
        const m = p.mode || 'Other';
        modeMap[m] = (modeMap[m] || 0) + (p.amount || 0);
    });
    const modePieData = Object.entries(modeMap).map(([name, value]) => ({ name, value }));
    const modePieColors = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899'];

    // ── Worker chart data ────────────────────────────────────────────────────
    const workerChartData = workerCollectionRows.map(r => ({ name: r.name, Cash: r.cash, Digital: r.digital }));

    // ── Billed vs Collected area data ────────────────────────────────────────
    const billedVsCollectedData = [
        { name: 'Billed', amount: totalBilled },
        { name: 'Collected', amount: totalCollected },
        { name: 'Outstanding', amount: Math.max(0, totalOutstanding) },
    ];

    return (
        <div className="report-view">
            {/* Date Picker */}
            <div className="rp-controls-bar">
                <div className="rp-date-field">
                    <label>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rp-date-input" />
                </div>
                <button className="rp-today-btn" onClick={() => setDate(today)}>Today</button>
            </div>

            {/* Summary Stats Row */}
            <div className="daily-stats-grid">
                <div className="daily-stat-card" style={{ borderTopColor: '#6366f1' }}>
                    <div className="daily-stat-icon" style={{ color: '#6366f1', background: '#6366f122' }}>
                        <IndianRupee size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">Total Billed</p>
                        <p className="daily-stat-value" style={{ color: '#6366f1' }}>{fmt(totalBilled)}</p>
                        <p className="daily-stat-sub">{dayBills.length} bill{dayBills.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: '#10b981' }}>
                    <div className="daily-stat-icon" style={{ color: '#10b981', background: '#10b98122' }}>
                        <Wallet size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">Total Collected</p>
                        <p className="daily-stat-value" style={{ color: '#10b981' }}>{fmt(totalCollected)}</p>
                        <p className="daily-stat-sub">{dayPayments.length} payment{dayPayments.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: C_TV }}>
                    <div className="daily-stat-icon" style={{ color: C_TV, background: `${C_TV}22` }}>
                        <Receipt size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">TV Collected</p>
                        <p className="daily-stat-value" style={{ color: C_TV }}>{fmt(dayTvCollected)}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: C_NET }}>
                    <div className="daily-stat-icon" style={{ color: C_NET, background: `${C_NET}22` }}>
                        <Wallet size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">Internet Collected</p>
                        <p className="daily-stat-value" style={{ color: C_NET }}>{fmt(dayInternetCollected)}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: '#ef4444' }}>
                    <div className="daily-stat-icon" style={{ color: '#ef4444', background: '#ef444422' }}>
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">Outstanding</p>
                        <p className="daily-stat-value" style={{ color: '#ef4444' }}>{fmt(Math.max(0, totalOutstanding))}</p>
                        <p className="daily-stat-sub">from today's bills</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: '#f59e0b' }}>
                    <div className="daily-stat-icon" style={{ color: '#f59e0b', background: '#f59e0b22' }}>
                        <IndianRupee size={20} />
                    </div>
                    <div>
                        <p className="daily-stat-label">Cash / Digital</p>
                        <p className="daily-stat-value" style={{ color: '#f59e0b', fontSize: '1.1rem' }}>{fmt(cashCollected)}</p>
                        <p className="daily-stat-sub" style={{ color: '#6366f1' }}>{fmt(digitalCollected)} digital</p>
                    </div>
                </div>
            </div>

            {/* Charts Row: Billed vs Collected + Payment Mode Donut */}
            <div className="daily-charts-row">
                {/* Billed vs Collected Bar Chart */}
                <div className="card daily-chart-card">
                    <h4 className="chart-heading">Billed vs Collected vs Outstanding</h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={billedVsCollectedData} barSize={40}>
                            <defs>
                                <linearGradient id="gradBilled" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
                                </linearGradient>
                                <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                                </linearGradient>
                                <linearGradient id="gradOutstanding" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
                            <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                            <YAxis {...CHART_AXIS_PROPS} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {billedVsCollectedData.map((_, i) => (
                                    <Cell key={i} fill={i === 0 ? 'url(#gradBilled)' : i === 1 ? 'url(#gradCollected)' : 'url(#gradOutstanding)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Mode Donut Chart */}
                {modePieData.length > 0 && (
                    <div className="card daily-chart-card">
                        <h4 className="chart-heading">Payment Modes</h4>
                        <div style={{ position: 'relative' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={modePieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={82}
                                        dataKey="value"
                                        paddingAngle={3}
                                    >
                                        {modePieData.map((_, i) => (
                                            <Cell key={i} fill={modePieColors[i % modePieColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center label */}
                            <div className="donut-center-label">
                                <span className="donut-center-total">{fmt(totalCollected)}</span>
                                <span className="donut-center-sub">collected</span>
                            </div>
                        </div>
                        {/* Custom legend */}
                        <div className="donut-legend">
                            {modePieData.map((entry, i) => {
                                const pct = totalCollected > 0 ? ((entry.value / totalCollected) * 100).toFixed(1) : 0;
                                return (
                                    <div className="donut-legend-item" key={i}>
                                        <span className="donut-legend-dot" style={{ background: modePieColors[i % modePieColors.length] }} />
                                        <span className="donut-legend-name">{entry.name}</span>
                                        <span className="donut-legend-amt">{fmt(entry.value)}</span>
                                        <span className="donut-legend-pct">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Collection by Worker Chart */}
            {workerChartData.length > 0 && (
                <div className="card daily-chart-card">
                    <h4 className="chart-heading">Collection by Worker</h4>
                    <ResponsiveContainer width="100%" height={Math.max(160, workerChartData.length * 52)}>
                        <BarChart data={workerChartData} layout="vertical" barSize={16}>
                            <defs>
                                <linearGradient id="gradCash" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={C_CASH} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={C_CASH} stopOpacity={0.6} />
                                </linearGradient>
                                <linearGradient id="gradDigital" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={C_DIGITAL} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={C_DIGITAL} stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
                            <XAxis type="number" {...CHART_AXIS_PROPS} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                            <YAxis type="category" dataKey="name" {...CHART_AXIS_PROPS} width={90} />
                            <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                            <Bar dataKey="Cash" name="Cash" stackId="a" fill="url(#gradCash)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Digital" name="Digital" stackId="a" fill="url(#gradDigital)" radius={[4, 4, 4, 4]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Bills Generated ─────────────────────────────────────────── */}
            <SectionCard
                icon={Receipt}
                title="Bills Generated"
                count={dayBills.length}
                accentColor="#6366f1"
                defaultOpen={false}
            >
                {dayBills.length === 0 ? (
                    <EmptyState label="bills generated" />
                ) : (
                    <div className="section-list">
                        {dayBills.map((b, idx) => (
                            <div className="section-list-item" key={b.id}>
                                <div className="item-index">{idx + 1}</div>
                                <div className="item-main">
                                    <span className="item-name">{b.customerName}</span>
                                    <span className="item-sub">{serviceLabel(b.serviceType)}</span>
                                </div>
                                <div className="item-meta">
                                    <span className="item-amount text-total">{fmt(b.totalAmount)}</span>
                                    <span className={`status-pill ${b.status === 'Paid' ? 'status-paid' : b.status === 'Partial' ? 'status-partial' : 'status-due'}`}>
                                        {b.status === 'Paid' ? 'CLEARED' : b.status?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="item-attr">
                                    {isOwner ? (
                                        <select
                                            className="att-select-inline"
                                            value={b.generatedBy || ''}
                                            onChange={e => handleGeneratorChange(b.id, e.target.value)}
                                        >
                                            <option value="">— Assign —</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="attr-name">{b.generatedByName || '—'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* ── Payments Received ────────────────────────────────────────── */}
            <SectionCard
                icon={Wallet}
                title="Payments Received"
                count={dayPayments.length}
                accentColor="#10b981"
                defaultOpen={false}
            >
                {dayPayments.length === 0 ? (
                    <EmptyState label="payments received" />
                ) : (
                    <div className="section-list">
                        {dayPayments.map((p, idx) => {
                            const b = p._bill;
                            return (
                                <div className="section-list-item" key={p.id || idx}>
                                    <div className="item-index">{idx + 1}</div>
                                    <div className="item-main">
                                        <span className="item-name">{p.customerName}</span>
                                        <span className="item-sub">{serviceLabel(b?.serviceType)}</span>
                                    </div>
                                    <div className="item-meta">
                                        <span className="item-amount text-paid">{fmt(p.amount)}</span>
                                        <span className="mode-chip">{p.mode || '—'}</span>
                                    </div>
                                    <div className="item-attr">
                                        {isOwner ? (
                                            <select
                                                className="att-select-inline"
                                                value={p.collectedBy || ''}
                                                onChange={e => handleCollectorChange(b.id, p.date, e.target.value)}
                                            >
                                                <option value="">— Assign —</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className="attr-name">{p.collectedByName || '—'}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* ── Collection by Worker ─────────────────────────────────────── */}
            {dayPayments.length > 0 && workerCollectionRows.length > 0 && (
                <div className="worker-coll-card">
                    <div className="worker-coll-title">
                        <Users size={15} style={{ color: '#10b981' }} />
                        Collection by Worker
                    </div>
                    <div className="worker-coll-table">
                        <div className="worker-coll-thead">
                            <span>Worker</span>
                            <span>Cash</span>
                            <span>Digital</span>
                            <span>Total</span>
                        </div>
                        {workerCollectionRows.map((row, i) => (
                            <div className="worker-coll-row" key={i}>
                                <span className="worker-coll-name">{row.name}</span>
                                <span className="worker-coll-cash">{row.cash > 0 ? fmt(row.cash) : '—'}</span>
                                <span className="worker-coll-digital">{row.digital > 0 ? fmt(row.digital) : '—'}</span>
                                <span className="worker-coll-total">{fmt(row.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Complaints ───────────────────────────────────────────────── */}
            <SectionCard
                icon={AlertCircle}
                title="Complaints"
                count={dayComplaints.length}
                accentColor="#ef4444"
                defaultOpen={false}
            >
                {dayComplaints.length === 0 ? (
                    <EmptyState label="complaints" />
                ) : (
                    <div className="section-list">
                        {dayComplaints.map((c, idx) => (
                            <div className="section-list-item" key={c.id}>
                                <div className="item-index">{idx + 1}</div>
                                <div className="item-main">
                                    <span className="item-name">{c.customerName || '—'}</span>
                                    <span className="item-sub complaint-desc">{c.description || c.issue || '—'}</span>
                                </div>
                                <div className="item-meta">
                                    <span className={`status-pill ${c.status === 'Completed' ? 'status-paid' : c.status === 'In Progress' ? 'status-partial' : 'status-due'}`}>
                                        {c.status?.toUpperCase() || 'PENDING'}
                                    </span>
                                </div>
                                <div className="item-attr">
                                    {isOwner ? (
                                        <select
                                            className="att-select-inline"
                                            value={c.createdBy || ''}
                                            onChange={e => handleComplaintLoggerChange(c.id, e.target.value)}
                                        >
                                            <option value="">— Logged by —</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                        </select>
                                    ) : (
                                        <span className="attr-name">{c.createdByName || '—'}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* ── Work Hours ───────────────────────────────────────────────── */}
            <SectionCard
                icon={Clock}
                title="Work Hours"
                count={dayHours.length}
                accentColor="#f59e0b"
                defaultOpen={false}
            >
                {dayHours.length === 0 ? (
                    <EmptyState label="work hour entries" />
                ) : (
                    <div className="section-list">
                        {workerGroups.map((wg, gi) => (
                            <div key={gi} className="worker-group">
                                <div className="worker-group-header">
                                    <Users size={14} />
                                    <strong>{wg.name}</strong>
                                    <span className="worker-total">{wg.totalHours.toFixed(1)}h total</span>
                                </div>
                                {wg.entries.map((h, hi) => (
                                    <div className="section-list-item worker-entry" key={h.id || hi}>
                                        <div className="item-index">{hi + 1}</div>
                                        <div className="item-main">
                                            <span className="item-name">{h.shift || 'Shift'}</span>
                                            <span className="item-sub">
                                                {h.entryTime && h.exitTime ? `${h.entryTime} – ${h.exitTime}` : h.leaveType || '—'}
                                            </span>
                                        </div>
                                        <div className="item-meta">
                                            <span className="item-amount" style={{ color: '#f59e0b' }}>
                                                {parseFloat(h.hours || 0).toFixed(1)}h
                                            </span>
                                            {h.notes && <span className="item-sub">{h.notes}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* ── Salary Payments ──────────────────────────────────────────── */}
            <SectionCard
                icon={IndianRupee}
                title="Salary Payments"
                count={daySalary.length}
                accentColor="#a855f7"
                defaultOpen={false}
            >
                {daySalary.length === 0 ? (
                    <EmptyState label="salary payments" />
                ) : (
                    <div className="section-list">
                        {daySalary.map((s, idx) => {
                            const totalAmt = (s.cashAmount || 0) + (s.digitalAmount || 0) + (s.advanceAmount || 0) + (s.amount || 0);
                            return (
                                <div className="section-list-item" key={s.id || idx}>
                                    <div className="item-index">{idx + 1}</div>
                                    <div className="item-main">
                                        <span className="item-name">{s.workerName || '—'}</span>
                                        <span className="item-sub">{s.type || 'Payment'}{s.month ? ` · ${s.month}` : ''}</span>
                                    </div>
                                    <div className="item-meta">
                                        <span className="item-amount" style={{ color: '#a855f7' }}>{fmt(totalAmt)}</span>
                                        <span className="mode-chip">
                                            {s.cashAmount > 0 && s.digitalAmount > 0 ? 'Cash + Digital' : s.cashAmount > 0 ? 'Cash' : 'Digital'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>
        </div>
    );
};

// ── Monthly Report ────────────────────────────────────────────────────────────
const MonthlyReport = () => {
    const { bills, complaints, updateBill, users, workHours: workHoursAll, salary: salaryAll } = useData();
    const { user: currentUser } = useAuth();

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [detailSection, setDetailSection] = useState(null); // null | 'bills' | 'complaints' | 'hours'

    const isOwner = currentUser?.role?.toLowerCase() === 'owner';

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

    const inSelectedMonth = (dateStr) => {
        try {
            const d = new Date(dateStr);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        } catch { return false; }
    };

    const filteredBills = bills.filter(b => inSelectedMonth(b.generatedDate));
    const filteredPayments = bills.flatMap(b =>
        (b.payments || [])
            .filter(p => inSelectedMonth(p.date))
            .map(p => ({ ...p, customerName: b.customerName, _bill: b }))
    );
    const monthComplaints = complaints.filter(c => {
        try { return inSelectedMonth(c.createdAt); } catch { return false; }
    });
    const monthHours = (workHoursAll || []).filter(h => {
        if (!h.date) return false;
        const [y, m] = h.date.split('-').map(Number);
        return m - 1 === selectedMonth && y === selectedYear;
    });

    const totalBilled = filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalCollected = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalHoursWorked = monthHours.reduce((s, h) => s + (parseFloat(h.hours) || 0), 0);

    const monthTvCollected = filteredPayments.reduce((s, p) => {
        const b = p._bill;
        const total = b?.totalAmount || 0;
        const ratio = total > 0 ? (b?.tvAmount || 0) / total : (b?.serviceType === 'tv' ? 1 : 0);
        return s + (p.amount || 0) * ratio;
    }, 0);
    const monthInternetCollected = totalCollected - monthTvCollected;

    const serviceSplit = [
        { name: 'Cable TV', value: filteredBills.reduce((s, b) => s + (b.tvAmount || 0), 0) },
        { name: 'Internet', value: filteredBills.reduce((s, b) => s + (b.internetAmount || 0), 0) },
    ].filter(d => d.value > 0);

    const modeSplit = [
        { name: 'Cash', value: filteredPayments.filter(p => p.mode?.toLowerCase() === 'cash').reduce((s, p) => s + p.amount, 0) },
        { name: 'PhonePe', value: filteredPayments.filter(p => p.mode?.toLowerCase() === 'phonepe').reduce((s, p) => s + p.amount, 0) },
        { name: 'GPay', value: filteredPayments.filter(p => p.mode?.toLowerCase() === 'gpay').reduce((s, p) => s + p.amount, 0) },
    ].filter(d => d.value > 0);

    const workerStats = {};
    filteredPayments.forEach(p => {
        const name = p.collectedByName || 'Unknown';
        if (!workerStats[name]) workerStats[name] = { name, cash: 0, online: 0, count: 0 };
        workerStats[name].count++;
        if (p.mode?.toLowerCase() === 'cash') workerStats[name].cash += p.amount;
        else workerStats[name].online += p.amount;
    });
    const workerData = Object.values(workerStats);

    const hoursByWorker = {};
    monthHours.forEach(h => {
        const key = h.userId || h.userName || 'Unknown';
        if (!hoursByWorker[key]) hoursByWorker[key] = { name: h.userName || key, totalHours: 0, days: 0, entries: [] };
        hoursByWorker[key].totalHours += parseFloat(h.hours) || 0;
        hoursByWorker[key].days += 1;
        hoursByWorker[key].entries.push(h);
    });
    const workerHourGroups = Object.values(hoursByWorker);

    const handleGeneratorChange = (billId, userId) => {
        const u = users.find(x => x.id === userId);
        if (!u) return;
        updateBill(billId, { generatedBy: u.id, generatedByName: u.name });
    };

    // ── Detail: Bills ─────────────────────────────────────────────────────────
    if (detailSection === 'bills') return (
        <div className="report-view">
            <button className="mr-back-btn" onClick={() => setDetailSection(null)}>
                ← {monthLabel} Overview
            </button>
            <div className="mr-detail-header">
                <Receipt size={20} style={{ color: '#6366f1' }} />
                <div>
                    <h2 className="mr-detail-title">Bills Generated</h2>
                    <p className="mr-detail-sub">{filteredBills.length} bills · {monthLabel}</p>
                </div>
            </div>
            {filteredBills.length === 0 ? (
                <p className="section-empty" style={{ padding: '24px 0' }}>No bills generated this month.</p>
            ) : (
                <div className="section-list">
                    {filteredBills.map((b, idx) => (
                        <div className="section-list-item" key={b.id}>
                            <div className="item-index">{idx + 1}</div>
                            <div className="item-main">
                                <span className="item-name">{b.customerName}</span>
                                <span className="item-sub">{serviceLabel(b.serviceType)} · {new Date(b.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div className="item-meta">
                                <span className="item-amount text-total">{fmt(b.totalAmount)}</span>
                                <span className={`status-pill ${b.status === 'Paid' ? 'status-paid' : b.status === 'Partial' ? 'status-partial' : 'status-due'}`}>
                                    {b.status === 'Paid' ? 'CLEARED' : b.status?.toUpperCase()}
                                </span>
                            </div>
                            {isOwner && (
                                <div className="item-attr">
                                    <select className="att-select-inline" value={b.generatedBy || ''} onChange={e => handleGeneratorChange(b.id, e.target.value)}>
                                        <option value="">— Assign —</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── Detail: Payments Collected ────────────────────────────────────────────
    if (detailSection === 'payments') return (
        <div className="report-view">
            <button className="mr-back-btn" onClick={() => setDetailSection(null)}>
                ← {monthLabel} Overview
            </button>
            <div className="mr-detail-header">
                <Wallet size={20} style={{ color: '#10b981' }} />
                <div>
                    <h2 className="mr-detail-title">Payments Collected</h2>
                    <p className="mr-detail-sub">{filteredPayments.length} payments · {fmt(totalCollected)} · {monthLabel}</p>
                </div>
            </div>
            {filteredPayments.length === 0 ? (
                <p className="section-empty" style={{ padding: '24px 0' }}>No payments recorded this month.</p>
            ) : (
                <div className="section-list">
                    {[...filteredPayments].sort((a, b) => new Date(b.date) - new Date(a.date)).map((p, idx) => (
                        <div className="section-list-item" key={p.id || idx}>
                            <div className="item-index">{idx + 1}</div>
                            <div className="item-main">
                                <span className="item-name">{p.customerName || '—'}</span>
                                <span className="item-sub">Bill #{p._bill?.billNumber} · {new Date(p.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div className="item-meta">
                                <span className="item-amount text-paid">{fmt(p.amount)}</span>
                                <span className="mode-chip">{p.mode || '—'}</span>
                            </div>
                            <div className="item-attr">
                                <span className="attr-name">{p.collectedByName || '—'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── Detail: Complaints ────────────────────────────────────────────────────
    if (detailSection === 'complaints') return (
        <div className="report-view">
            <button className="mr-back-btn" onClick={() => setDetailSection(null)}>
                ← {monthLabel} Overview
            </button>
            <div className="mr-detail-header">
                <AlertCircle size={20} style={{ color: '#ef4444' }} />
                <div>
                    <h2 className="mr-detail-title">Complaints</h2>
                    <p className="mr-detail-sub">{monthComplaints.length} complaints · {monthLabel}</p>
                </div>
            </div>
            {monthComplaints.length === 0 ? (
                <p className="section-empty" style={{ padding: '24px 0' }}>No complaints this month.</p>
            ) : (
                <div className="section-list">
                    {monthComplaints.map((c, idx) => (
                        <div className="section-list-item" key={c.id}>
                            <div className="item-index">{idx + 1}</div>
                            <div className="item-main">
                                <span className="item-name">{c.customerName || '—'}</span>
                                <span className="item-sub complaint-desc">{c.description || c.issue || '—'}</span>
                            </div>
                            <div className="item-meta">
                                <span className="item-sub">{toLocalDate(c.createdAt)}</span>
                                <span className={`status-pill ${c.status === 'Completed' ? 'status-paid' : c.status === 'In Progress' ? 'status-partial' : 'status-due'}`}>
                                    {c.status?.toUpperCase() || 'PENDING'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── Detail: Work Hours ────────────────────────────────────────────────────
    if (detailSection === 'hours') return (
        <div className="report-view">
            <button className="mr-back-btn" onClick={() => setDetailSection(null)}>
                ← {monthLabel} Overview
            </button>
            <div className="mr-detail-header">
                <Clock size={20} style={{ color: '#f59e0b' }} />
                <div>
                    <h2 className="mr-detail-title">Work Hours</h2>
                    <p className="mr-detail-sub">{monthHours.length} entries · {totalHoursWorked.toFixed(1)}h total · {monthLabel}</p>
                </div>
            </div>
            {workerHourGroups.length === 0 ? (
                <p className="section-empty" style={{ padding: '24px 0' }}>No work hours logged this month.</p>
            ) : workerHourGroups.map((wg, gi) => (
                <div key={gi}>
                    <div className="worker-group-header" style={{ marginBottom: 8 }}>
                        <Users size={14} />
                        <strong>{wg.name}</strong>
                        <span className="worker-total">{wg.totalHours.toFixed(1)}h · {wg.days} day{wg.days !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="section-list" style={{ marginBottom: 16 }}>
                        {wg.entries.map((h, hi) => (
                            <div className="section-list-item" key={h.id || hi}>
                                <div className="item-index">{hi + 1}</div>
                                <div className="item-main">
                                    <span className="item-name">{h.date}</span>
                                    <span className="item-sub">{h.shift || ''}{h.entryTime && h.exitTime ? ` · ${h.entryTime} – ${h.exitTime}` : ''}{h.leaveType ? ` · ${h.leaveType}` : ''}</span>
                                </div>
                                <div className="item-meta">
                                    <span className="item-amount" style={{ color: '#f59e0b' }}>{parseFloat(h.hours || 0).toFixed(1)}h</span>
                                    {h.notes && <span className="item-sub">{h.notes}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    // ── Overview ──────────────────────────────────────────────────────────────
    return (
        <div className="report-view">
            {/* Month/Year Selectors */}
            <div className="rp-controls-bar">
                <div className="rp-date-field">
                    <label>Month</label>
                    <select value={selectedMonth} onChange={e => { setSelectedMonth(parseInt(e.target.value)); setDetailSection(null); }} className="rp-date-input">
                        {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <div className="rp-date-field">
                    <label>Year</label>
                    <select value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setDetailSection(null); }} className="rp-date-input">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="daily-stats-grid">
                <div className="daily-stat-card" style={{ borderTopColor: '#6366f1' }}>
                    <div className="daily-stat-icon" style={{ color: '#6366f1', background: '#6366f122' }}><IndianRupee size={20} /></div>
                    <div><p className="daily-stat-label">Total Billed</p><p className="daily-stat-value" style={{ color: '#6366f1' }}>{fmt(totalBilled)}</p></div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: '#10b981' }}>
                    <div className="daily-stat-icon" style={{ color: '#10b981', background: '#10b98122' }}><Wallet size={20} /></div>
                    <div><p className="daily-stat-label">Total Collected</p><p className="daily-stat-value" style={{ color: '#10b981' }}>{fmt(totalCollected)}</p></div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: C_TV }}>
                    <div className="daily-stat-icon" style={{ color: C_TV, background: `${C_TV}22` }}><Receipt size={20} /></div>
                    <div>
                        <p className="daily-stat-label">TV Collected</p>
                        <p className="daily-stat-value" style={{ color: C_TV }}>{fmt(monthTvCollected)}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: C_NET }}>
                    <div className="daily-stat-icon" style={{ color: C_NET, background: `${C_NET}22` }}><Wallet size={20} /></div>
                    <div>
                        <p className="daily-stat-label">Internet Collected</p>
                        <p className="daily-stat-value" style={{ color: C_NET }}>{fmt(monthInternetCollected)}</p>
                    </div>
                </div>
                <div className="daily-stat-card" style={{ borderTopColor: '#ef4444' }}>
                    <div className="daily-stat-icon" style={{ color: '#ef4444', background: '#ef444422' }}><AlertCircle size={20} /></div>
                    <div><p className="daily-stat-label">Complaints</p><p className="daily-stat-value" style={{ color: '#ef4444' }}>{monthComplaints.length}</p></div>
                </div>
                {totalHoursWorked > 0 && (
                    <div className="daily-stat-card" style={{ borderTopColor: '#f59e0b' }}>
                        <div className="daily-stat-icon" style={{ color: '#f59e0b', background: '#f59e0b22' }}><Clock size={20} /></div>
                        <div><p className="daily-stat-label">Hours Worked</p><p className="daily-stat-value" style={{ color: '#f59e0b' }}>{totalHoursWorked.toFixed(1)}h</p></div>
                    </div>
                )}
            </div>

            {/* Charts */}
            <div className="report-charts-grid">
                {/* Service Split Donut */}
                <div className="card chart-card">
                    <h4 className="chart-heading">Service Split (TV vs Internet)</h4>
                    {serviceSplit.length > 0 ? (
                        <>
                            <div style={{ position: 'relative' }}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <defs>
                                            <linearGradient id="mGradTV" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor={C_TV} />
                                                <stop offset="100%" stopColor="#7c3aed" />
                                            </linearGradient>
                                            <linearGradient id="mGradNet" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor={C_NET} />
                                                <stop offset="100%" stopColor="#0284c7" />
                                            </linearGradient>
                                        </defs>
                                        <Pie data={serviceSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                                            {serviceSplit.map((_, i) => (
                                                <Cell key={i} fill={i === 0 ? 'url(#mGradTV)' : 'url(#mGradNet)'} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="donut-center-label">
                                    <span className="donut-center-total">{fmt(serviceSplit.reduce((s, d) => s + d.value, 0))}</span>
                                    <span className="donut-center-sub">billed</span>
                                </div>
                            </div>
                            <div className="donut-legend">
                                {serviceSplit.map((entry, i) => {
                                    const tot = serviceSplit.reduce((s, d) => s + d.value, 0);
                                    const pct = tot > 0 ? ((entry.value / tot) * 100).toFixed(1) : 0;
                                    return (
                                        <div className="donut-legend-item" key={i}>
                                            <span className="donut-legend-dot" style={{ background: i === 0 ? C_TV : C_NET }} />
                                            <span className="donut-legend-name">{entry.name}</span>
                                            <span className="donut-legend-amt">{fmt(entry.value)}</span>
                                            <span className="donut-legend-pct">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : <div className="empty-chart">No data</div>}
                </div>

                {/* Collection Modes Donut */}
                <div className="card chart-card">
                    <h4 className="chart-heading">Collection Modes</h4>
                    {modeSplit.length > 0 ? (
                        <>
                            <div style={{ position: 'relative' }}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={modeSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={4}>
                                            {modeSplit.map((_, i) => (
                                                <Cell key={i} fill={[C_CASH, C_DIGITAL, '#f59e0b', C_NET, C_TV][i % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="donut-center-label">
                                    <span className="donut-center-total">{fmt(totalCollected)}</span>
                                    <span className="donut-center-sub">total</span>
                                </div>
                            </div>
                            <div className="donut-legend">
                                {modeSplit.map((entry, i) => {
                                    const pct = totalCollected > 0 ? ((entry.value / totalCollected) * 100).toFixed(1) : 0;
                                    return (
                                        <div className="donut-legend-item" key={i}>
                                            <span className="donut-legend-dot" style={{ background: [C_CASH, C_DIGITAL, '#f59e0b', C_NET, C_TV][i % 5] }} />
                                            <span className="donut-legend-name">{entry.name}</span>
                                            <span className="donut-legend-amt">{fmt(entry.value)}</span>
                                            <span className="donut-legend-pct">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : <div className="empty-chart">No data</div>}
                </div>

                {/* Worker-wise Collection horizontal stacked bar */}
                <div className="card chart-card wide">
                    <h4 className="chart-heading">Worker-wise Collection</h4>
                    <ResponsiveContainer width="100%" height={Math.max(200, workerData.length * 56)}>
                        {workerData.length > 0 ? (
                            <BarChart data={workerData} layout="vertical" barSize={16}>
                                <defs>
                                    <linearGradient id="mGradCash" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={C_CASH} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={C_CASH} stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="mGradDig" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={C_DIGITAL} stopOpacity={0.9} />
                                        <stop offset="100%" stopColor={C_DIGITAL} stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
                                <XAxis type="number" {...CHART_AXIS_PROPS} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                <YAxis type="category" dataKey="name" {...CHART_AXIS_PROPS} width={90} />
                                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, '']} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                <Bar dataKey="cash" name="Cash" stackId="a" fill="url(#mGradCash)" />
                                <Bar dataKey="online" name="Online" stackId="a" fill="url(#mGradDig)" radius={[4, 4, 4, 4]} />
                            </BarChart>
                        ) : <div className="empty-chart">No data</div>}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Worker Collection Table */}
            <div className="card mr-worker-card">
                <div className="mr-worker-card-header">
                    <Users size={17} style={{ color: '#10b981' }} />
                    <span className="mr-worker-card-title">Collection by Worker</span>
                    <span className="mr-worker-card-total">{filteredPayments.length} payments · {fmt(totalCollected)}</span>
                </div>
                {workerData.length === 0 ? (
                    <p className="section-empty" style={{ padding: '12px 20px' }}>No payments recorded this month.</p>
                ) : (
                    <div className="mr-worker-table-wrap">
                        <table className="mr-worker-table">
                            <thead><tr><th>Worker</th><th>Payments</th><th>Cash</th><th>Online</th><th>Total</th></tr></thead>
                            <tbody>
                                {workerData.map((w, i) => (
                                    <tr key={i}>
                                        <td><strong>{w.name}</strong></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{w.count}</td>
                                        <td style={{ color: '#f59e0b' }}>{fmt(w.cash)}</td>
                                        <td style={{ color: '#3b82f6' }}>{fmt(w.online)}</td>
                                        <td><strong style={{ color: '#10b981' }}>{fmt(w.cash + w.online)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section Nav Cards */}
            <div className="mr-section-nav">
                <button className="mr-nav-card" onClick={() => setDetailSection('bills')}>
                    <div className="mr-nav-icon" style={{ background: '#6366f122', color: '#6366f1' }}><Receipt size={20} /></div>
                    <div className="mr-nav-text">
                        <span className="mr-nav-title">Bills Generated</span>
                        <span className="mr-nav-sub">{filteredBills.length} bills · {fmt(totalBilled)}</span>
                    </div>
                    <ChevronRight size={18} className="mr-nav-arrow" />
                </button>
                <button className="mr-nav-card" onClick={() => setDetailSection('payments')}>
                    <div className="mr-nav-icon" style={{ background: '#10b98122', color: '#10b981' }}><Wallet size={20} /></div>
                    <div className="mr-nav-text">
                        <span className="mr-nav-title">Payments Collected</span>
                        <span className="mr-nav-sub">{filteredPayments.length} payments · {fmt(totalCollected)}</span>
                    </div>
                    <ChevronRight size={18} className="mr-nav-arrow" />
                </button>
                <button className="mr-nav-card" onClick={() => setDetailSection('complaints')}>
                    <div className="mr-nav-icon" style={{ background: '#ef444422', color: '#ef4444' }}><AlertCircle size={20} /></div>
                    <div className="mr-nav-text">
                        <span className="mr-nav-title">Complaints</span>
                        <span className="mr-nav-sub">{monthComplaints.length} complaints this month</span>
                    </div>
                    <ChevronRight size={18} className="mr-nav-arrow" />
                </button>
                <button className="mr-nav-card" onClick={() => setDetailSection('hours')}>
                    <div className="mr-nav-icon" style={{ background: '#f59e0b22', color: '#f59e0b' }}><Clock size={20} /></div>
                    <div className="mr-nav-text">
                        <span className="mr-nav-title">Work Hours</span>
                        <span className="mr-nav-sub">{totalHoursWorked.toFixed(1)}h logged · {monthHours.length} entries</span>
                    </div>
                    <ChevronRight size={18} className="mr-nav-arrow" />
                </button>
            </div>
        </div>
    );
};

// ── Root Page ─────────────────────────────────────────────────────────────────
const Reports = () => {
    const [activeTab, setActiveTab] = useState('daily');

    return (
        <div className="reports-page">
            <div className="section-header">
                <h1>Reports</h1>
            </div>

            <div className="rp-tab-bar">
                {[['daily', Calendar, 'Daily Report'], ['monthly', FileText, 'Monthly Report']].map(([key, Icon, label]) => (
                    <button key={key} className={`rp-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            <div className="report-content">
                {activeTab === 'daily' && <DailyReport />}
                {activeTab === 'monthly' && <MonthlyReport />}
            </div>

            <style>{`
                /* ── Page shell ── */
                .reports-page { padding: 28px 32px; }
                @media (max-width: 700px) { .reports-page { padding: 14px 12px; } }

                /* ── Tab bar ── */
                .rp-tab-bar {
                    display: flex; gap: 6px; margin-bottom: 24px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 5px;
                    width: fit-content;
                }
                .rp-tab {
                    display: flex; align-items: center; gap: 7px;
                    padding: 8px 20px; border-radius: 10px;
                    border: none; background: none;
                    color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;
                    cursor: pointer; transition: all 0.18s; font-family: inherit;
                }
                .rp-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
                .rp-tab.active { background: var(--accent-gradient, linear-gradient(135deg,#6366f1,#a855f7)); color: white; box-shadow: 0 4px 12px rgba(99,102,241,0.35); }

                /* ── Controls bar ── */
                .rp-controls-bar {
                    display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 14px 18px;
                }
                .rp-date-field { display: flex; flex-direction: column; gap: 5px; }
                .rp-date-field label {
                    font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.06em; color: var(--text-secondary);
                }
                .rp-date-input {
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    border-radius: 9px; padding: 8px 12px;
                    color: var(--text-primary); font-size: 0.88rem; font-family: inherit;
                    outline: none; cursor: pointer; transition: border-color 0.2s;
                    min-width: 140px;
                }
                .rp-date-input:focus { border-color: var(--accent); }
                .rp-today-btn {
                    padding: 8px 16px; border-radius: 9px;
                    border: 1.5px solid var(--border); background: none;
                    color: var(--text-secondary); font-size: 0.82rem; font-weight: 700;
                    cursor: pointer; transition: all 0.18s; font-family: inherit;
                    height: fit-content; align-self: flex-end;
                }
                .rp-today-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.08); }

                /* ── Report view wrapper ── */
                .report-view { display: flex; flex-direction: column; gap: 14px; }

                /* ── Daily stat cards ── */
                .daily-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
                .daily-stat-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-top: 3px solid transparent; border-radius: 14px;
                    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
                    transition: border-color 0.2s;
                }
                .daily-stat-card:hover { border-color: var(--border-bright); }
                .daily-stat-icon {
                    width: 42px; height: 42px; border-radius: 11px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .daily-stat-label {
                    font-size: 0.67rem; color: var(--text-secondary);
                    text-transform: uppercase; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 5px;
                }
                .daily-stat-value { font-size: 1.4rem; font-weight: 800; line-height: 1; }

                /* ── Daily stat sub-label ── */
                .daily-stat-sub { font-size: 0.67rem; color: var(--text-secondary); margin-top: 3px; }

                /* ── Daily charts row ── */
                .daily-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                @media (max-width: 700px) { .daily-charts-row { grid-template-columns: 1fr; } }

                /* ── Daily bar chart ── */
                .daily-chart-card { padding: 20px 22px; }

                /* ── Donut center label ── */
                .donut-center-label {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -56%);
                    display: flex; flex-direction: column; align-items: center;
                    pointer-events: none;
                }
                .donut-center-total { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); white-space: nowrap; }
                .donut-center-sub { font-size: 0.62rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

                /* ── Donut legend ── */
                .donut-legend { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
                .donut-legend-item {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 0.78rem; padding: 5px 8px;
                    border-radius: 8px; background: rgba(255,255,255,0.025);
                }
                .donut-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
                .donut-legend-name { flex: 1; color: var(--text-secondary); font-weight: 500; }
                .donut-legend-amt { font-weight: 700; color: var(--text-primary); }
                .donut-legend-pct { font-size: 0.7rem; color: var(--text-secondary); min-width: 38px; text-align: right; }

                /* ── Chart grid (monthly) ── */
                .report-charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
                .chart-card.wide { grid-column: span 2; }
                .chart-heading {
                    font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;
                    letter-spacing: 0.06em; font-weight: 800; margin-bottom: 16px;
                }
                .empty-chart {
                    display: flex; align-items: center; justify-content: center;
                    height: 250px; color: var(--text-secondary); font-style: italic;
                }

                /* ── Monthly section nav cards ── */
                .mr-section-nav { display: flex; flex-direction: column; gap: 10px; }
                .mr-nav-card {
                    display: flex; align-items: center; gap: 14px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 16px 18px;
                    cursor: pointer; text-align: left; font-family: inherit;
                    color: var(--text-primary); transition: all 0.18s; width: 100%;
                }
                .mr-nav-card:hover { border-color: var(--accent); background: rgba(99,102,241,0.04); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
                .mr-nav-icon {
                    width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .mr-nav-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
                .mr-nav-title { font-weight: 700; font-size: 0.92rem; }
                .mr-nav-sub { font-size: 0.76rem; color: var(--text-secondary); }
                .mr-nav-arrow { color: var(--text-secondary); flex-shrink: 0; transition: transform 0.18s; }
                .mr-nav-card:hover .mr-nav-arrow { transform: translateX(4px); color: var(--accent); }

                /* ── Detail view back + header ── */
                .mr-back-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: none; border: 1.5px solid var(--border);
                    color: var(--text-secondary); border-radius: 9px;
                    padding: 7px 14px; font-size: 0.82rem; font-weight: 700;
                    cursor: pointer; font-family: inherit; transition: all 0.18s;
                    align-self: flex-start;
                }
                .mr-back-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.06); }
                .mr-detail-header {
                    display: flex; align-items: center; gap: 14px;
                    padding: 16px 0 4px;
                }
                .mr-detail-title { font-size: 1.2rem; font-weight: 800; margin: 0; }
                .mr-detail-sub { font-size: 0.78rem; color: var(--text-secondary); margin: 2px 0 0; }

                /* ── Worker Collection Card (monthly) ── */
                .mr-worker-card { padding: 0; overflow: hidden; }
                .mr-worker-card-header {
                    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
                    padding: 16px 20px; border-bottom: 1px solid var(--border);
                }
                .mr-worker-card-title { font-weight: 700; font-size: 0.93rem; flex: 1; }
                .mr-worker-card-total { font-size: 0.78rem; color: var(--text-secondary); }
                .mr-worker-table-wrap { overflow-x: auto; }
                .mr-worker-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
                .mr-worker-table th {
                    padding: 10px 18px; text-align: left; font-size: 0.68rem; font-weight: 800;
                    text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary);
                    border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02);
                }
                .mr-worker-table td { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); }
                .mr-worker-table tr:last-child td { border-bottom: none; }
                .mr-worker-table tbody tr:hover { background: rgba(255,255,255,0.03); }

                /* ── Collapsible Section Card ── */
                .section-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-left: 4px solid transparent; border-radius: 14px; overflow: hidden;
                    transition: border-color 0.18s;
                }
                .section-card:hover { border-color: var(--border-bright); }
                .section-card-header {
                    width: 100%; background: none; border: none; color: var(--text-primary);
                    padding: 15px 20px; display: flex; align-items: center; justify-content: space-between;
                    cursor: pointer; transition: background 0.15s;
                }
                .section-card-header:hover { background: rgba(255,255,255,0.025); }
                .section-card-left { display: flex; align-items: center; gap: 12px; }
                .section-icon {
                    width: 34px; height: 34px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .section-title { font-weight: 700; font-size: 0.93rem; }
                .section-badge {
                    font-size: 0.7rem; font-weight: 800; padding: 2px 9px;
                    border-radius: 20px; letter-spacing: 0.02em;
                }
                .section-chevron { display: flex; align-items: center; }
                .section-card-body { padding: 0 16px 16px; }
                .section-empty { color: var(--text-secondary); font-style: italic; font-size: 0.875rem; padding: 10px 0; }

                /* ── List items ── */
                .section-list { display: flex; flex-direction: column; gap: 6px; }
                .section-list-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 14px; background: rgba(255,255,255,0.025);
                    border: 1px solid var(--border); border-radius: 10px;
                    transition: background 0.15s;
                }
                .section-list-item:hover { background: rgba(255,255,255,0.05); }
                .item-index {
                    font-size: 0.68rem; color: var(--text-secondary); font-weight: 700;
                    width: 18px; text-align: right; flex-shrink: 0;
                }
                .item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
                .item-name {
                    font-weight: 600; font-size: 0.88rem;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .item-sub {
                    font-size: 0.73rem; color: var(--text-secondary);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .complaint-desc { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                .item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
                .item-amount { font-weight: 700; font-size: 0.9rem; }
                .item-attr { flex-shrink: 0; min-width: 110px; }
                .attr-name { font-size: 0.75rem; color: var(--text-secondary); }

                /* ── Status pills ── */
                .status-pill {
                    font-size: 0.63rem; font-weight: 800; padding: 2px 8px;
                    border-radius: 20px; letter-spacing: 0.04em; text-transform: uppercase;
                    border: 1px solid;
                }
                .status-paid { background: rgba(16,185,129,0.12); color: #10b981; border-color: rgba(16,185,129,0.3); }
                .status-partial { background: rgba(245,158,11,0.12); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
                .status-due { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }

                /* ── Amount colors ── */
                .text-total { color: #6366f1; }
                .text-paid { color: #10b981; }

                /* ── Mode chip ── */
                .mode-chip {
                    font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
                    background: rgba(255,255,255,0.07); color: var(--text-secondary);
                    text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--border);
                }

                /* ── Worker Collection Card (daily) ── */
                .worker-coll-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-left: 4px solid #10b981; border-radius: 14px; overflow: hidden;
                }
                .worker-coll-title {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 18px; font-weight: 700; font-size: 0.88rem;
                    border-bottom: 1px solid var(--border); color: var(--text-primary);
                }
                .worker-coll-table { width: 100%; }
                .worker-coll-thead {
                    display: grid; grid-template-columns: 1fr 100px 100px 100px;
                    padding: 7px 18px; font-size: 0.65rem; font-weight: 800;
                    text-transform: uppercase; letter-spacing: 0.06em;
                    color: var(--text-secondary); background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid var(--border);
                }
                .worker-coll-row {
                    display: grid; grid-template-columns: 1fr 100px 100px 100px;
                    padding: 10px 18px; align-items: center; font-size: 0.85rem;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    transition: background 0.15s;
                }
                .worker-coll-row:last-child { border-bottom: none; }
                .worker-coll-row:hover { background: rgba(255,255,255,0.03); }
                .worker-coll-name { font-weight: 600; }
                .worker-coll-cash { color: #f59e0b; font-weight: 600; }
                .worker-coll-digital { color: #6366f1; font-weight: 600; }
                .worker-coll-total { color: #10b981; font-weight: 800; }
                @media (max-width: 600px) {
                    .worker-coll-thead { grid-template-columns: 1fr 80px 80px; }
                    .worker-coll-thead span:nth-child(3) { display: none; }
                    .worker-coll-row { grid-template-columns: 1fr 80px 80px; }
                    .worker-coll-digital { display: none; }
                }

                /* ── Worker group (daily hours) ── */
                .worker-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
                .worker-group-header {
                    display: flex; align-items: center; gap: 8px; padding: 7px 10px;
                    font-size: 0.8rem; color: var(--text-secondary); font-weight: 700;
                    background: rgba(245,158,11,0.06); border-radius: 8px; border: 1px solid rgba(245,158,11,0.15);
                }
                .worker-total { margin-left: auto; font-weight: 800; color: #f59e0b; font-size: 0.82rem; }
                .worker-entry { margin-left: 12px; }

                /* ── Attribution select ── */
                .att-select-inline {
                    background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border);
                    border-radius: 7px; font-size: 0.74rem; padding: 4px 8px;
                    min-width: 100px; cursor: pointer; outline: none; transition: all 0.2s; width: 100%;
                }
                .att-select-inline:hover { border-color: var(--accent); background: rgba(99,102,241,0.08); }

                /* ── Responsive ── */
                @media (max-width: 900px) {
                    .daily-stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .report-charts-grid { grid-template-columns: 1fr; }
                    .chart-card.wide { grid-column: span 1; }
                    .rp-controls-bar { padding: 12px 14px; }
                }
                @media (max-width: 700px) {
                    .rp-controls-bar { flex-direction: row; flex-wrap: wrap; gap: 10px; }
                    .rp-date-field { flex: 1; min-width: 120px; }
                    .rp-date-input { width: 100%; min-width: 0; }
                    .daily-charts-row { grid-template-columns: 1fr; }
                    .daily-chart-card { padding: 14px 16px; }
                    .section-card-header { padding: 12px 16px; }
                    .section-card-body { padding: 0 12px 12px; }
                }
                @media (max-width: 600px) {
                    .reports-page { padding: 12px 10px; }
                    .rp-tab-bar { width: 100%; }
                    .rp-tab { flex: 1; justify-content: center; padding: 8px 10px; font-size: 0.8rem; }
                    .daily-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .daily-stat-card { padding: 10px 12px; gap: 10px; }
                    .daily-stat-icon { width: 36px; height: 36px; border-radius: 9px; }
                    .daily-stat-value { font-size: 1.05rem; }
                    .daily-stat-label { font-size: 0.62rem; }
                    .section-list-item { flex-wrap: wrap; gap: 6px; padding: 8px 10px; }
                    .item-main { min-width: 55%; }
                    .item-meta { align-items: flex-start; }
                    .item-attr { min-width: 0; width: 100%; margin-top: 2px; }
                    .att-select-inline { min-width: 0; width: 100%; }
                    .mr-worker-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .mr-nav-card { padding: 12px 14px; }
                    .mr-nav-icon { width: 38px; height: 38px; border-radius: 10px; }
                    .mr-nav-title { font-size: 0.85rem; }
                    .report-charts-grid { gap: 12px; }
                    .chart-card { padding: 14px 16px; }
                }
            `}</style>
        </div>
    );
};

export default Reports;
