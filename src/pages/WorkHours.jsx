import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Clock, Calendar, Sun, Moon, CalendarX, Briefcase, ChevronDown, ChevronUp, TrendingUp, BarChart2, Edit2, Check, X as XIcon, Users, User, Plus, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SHIFT_META = {
    morning: { label: 'Morning', Icon: Sun, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
    evening: { label: 'Evening', Icon: Moon, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
    full: { label: 'Full Day', Icon: Briefcase, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
    leave: { label: 'Leave', Icon: CalendarX, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Holiday', 'Half Day', 'Unpaid Leave', 'Other'];

const WORKER_PALETTES = [
    { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', shadow: 'rgba(99,102,241,0.25)' },
    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', shadow: 'rgba(16,185,129,0.25)' },
    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', shadow: 'rgba(245,158,11,0.25)' },
    { color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', shadow: 'rgba(236,72,153,0.25)' },
    { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.35)', shadow: 'rgba(6,182,212,0.25)' },
    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', shadow: 'rgba(139,92,246,0.25)' },
    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', shadow: 'rgba(239,68,68,0.25)' },
    { color: '#84cc16', bg: 'rgba(132,204,22,0.12)', border: 'rgba(132,204,22,0.35)', shadow: 'rgba(132,204,22,0.25)' },
];

// YYYY-MM-DD in local timezone (avoids UTC shift bugs)
const localDateStr = (d) => new Date(d).toLocaleDateString('en-CA');
const todayStr = localDateStr(new Date());

const calcHours = (entry, exit) => {
    if (!entry || !exit) return null;
    const [eh, em] = entry.split(':').map(Number);
    const [xh, xm] = exit.split(':').map(Number);
    const diff = (xh * 60 + xm) - (eh * 60 + em);
    if (diff <= 0) return null;
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? ` ${diff % 60}m` : ''}`;
};

const toMinutes = (entry, exit) => {
    if (!entry || !exit) return 0;
    const [eh, em] = entry.split(':').map(Number);
    const [xh, xm] = exit.split(':').map(Number);
    return Math.max(0, (xh * 60 + xm) - (eh * 60 + em));
};

const fmtMins = (mins) => {
    if (!mins) return '0h';
    return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
};

const getCycles = (startDay, count = 6) => {
    const today = new Date();
    const todayD = today.getDate(), y = today.getFullYear(), m = today.getMonth();
    const localStr = (d) => d.toLocaleDateString('en-CA');
    const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const cycles = [];
    for (let i = 0; i < count; i++) {
        let cycleStart, cycleEnd;
        if (todayD >= startDay) {
            cycleStart = new Date(y, m - i, startDay);
            cycleEnd = i === 0 ? today : new Date(y, m - i + 1, startDay - 1);
        } else {
            cycleStart = new Date(y, m - 1 - i, startDay);
            cycleEnd = i === 0 ? today : new Date(y, m - i, startDay - 1);
        }
        cycles.push({
            key: localStr(cycleStart),
            startStr: localStr(cycleStart),
            endStr: localStr(cycleEnd),
            label: i === 0
                ? `${fmt(cycleStart)} – Today (Current)`
                : `${fmt(cycleStart)} – ${fmt(cycleEnd)}`,
        });
    }
    return cycles;
};

const shiftDefaults = {
    morning: { entryTime: '09:00', exitTime: '13:00' },
    evening: { entryTime: '15:30', exitTime: '21:00' },
    full: { entryTime: '09:00', exitTime: '21:00' },
    leave: { entryTime: '', exitTime: '' },
};

const WorkHours = () => {
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    const { users, workHours: allHours, addWorkHours, updateWorkHours } = useData();

    const allUsers = React.useMemo(() => users.filter(u => u.active), [users]);
    const workers = isOwner ? allUsers.filter(u => u.role?.toLowerCase() !== 'owner') : [];

    const paletteMap = React.useMemo(() => {
        const map = {};
        allUsers.forEach((u, i) => { map[u.id] = WORKER_PALETTES[i % WORKER_PALETTES.length]; });
        return map;
    }, [allUsers]);

    const [selectedWorkerId, setSelectedWorkerId] = useState(() =>
        isOwner ? '' : user.userId
    );
    const [selectedCycleKey, setSelectedCycleKey] = useState('_current_');
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editForm, setEditForm] = useState(null);

    const activeUserId = isOwner ? selectedWorkerId : user.userId;
    const activeUserData = allUsers.find(u => u.id === activeUserId);
    const activeUserName = activeUserData?.name || (isOwner ? 'Worker' : user.name);
    const activePalette = paletteMap[activeUserId] || WORKER_PALETTES[0];

    const salaryStartDay = activeUserData?.salaryStartDay || 1;
    const cycles = React.useMemo(() => getCycles(salaryStartDay), [salaryStartDay]);

    // All entries for active user
    const myHours = allHours.filter(h => h.userId === activeUserId);

    // Period-filtered entries
    const selectedCycle = selectedCycleKey !== 'all' ? cycles.find(c => c.key === selectedCycleKey) || cycles[0] : null;
    const filteredHours = myHours.filter(h => {
        if (!selectedCycle) return true;
        return h.date >= selectedCycle.startStr && h.date <= selectedCycle.endStr;
    });

    // Stats from filtered entries
    const workEntries = filteredHours.filter(h => h.shift !== 'leave');
    const leaveEntries = filteredHours.filter(h => h.shift === 'leave');
    const daysWorked = new Set(workEntries.map(h => h.date)).size;
    const totalMins = workEntries.reduce((s, h) => s + toMinutes(h.entryTime, h.exitTime), 0);
    const avgMins = daysWorked > 0 ? Math.round(totalMins / daysWorked) : 0;

    // Log form
    const [dialogOpen, setDialogOpen] = useState(false);

    const [form, setForm] = useState({
        date: todayStr, shift: 'morning',
        entryTime: '09:00', exitTime: '13:00',
        leaveType: 'Sick Leave', notes: '',
    });
    const [saved, setSaved] = useState(false);
    const [expandedDate, setExpandedDate] = useState(null);

    const isLeave = form.shift === 'leave';
    const duration = !isLeave ? calcHours(form.entryTime, form.exitTime) : null;

    const handleShiftChange = (shift) => {
        setForm(f => ({ ...f, shift, ...shiftDefaults[shift] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duplicate = allHours.find(h =>
            h.userId === activeUserId && h.date === form.date && h.shift === form.shift
        );
        if (duplicate) {
            alert(`Already logged ${SHIFT_META[form.shift].label} for ${form.date}${isOwner ? ` (${activeUserName})` : ''}.`);
            return;
        }

        const loggedUser = isOwner ? activeUserData : null;
        const newEntry = {
            userId: activeUserId,
            userName: isOwner ? (loggedUser?.name || activeUserName) : user.name,
            date: form.date,
            shift: form.shift,
            entryTime: isLeave ? '' : form.entryTime,
            exitTime: isLeave ? '' : form.exitTime,
            leaveType: isLeave ? form.leaveType : '',
            notes: form.notes.trim(),
            hours: isLeave ? 0 : toMinutes(form.entryTime, form.exitTime) / 60,
            loggedBy: user.userId,
            createdAt: new Date().toISOString(),
        };

        await addWorkHours(newEntry);
        setForm(f => ({ ...f, date: todayStr, notes: '' }));
        setSaved(true);
        setTimeout(() => { setSaved(false); setDialogOpen(false); }, 1400);
    };

    // Owner edit handlers
    const startEdit = (entry) => {
        setEditingEntryId(entry.id);
        setEditForm({
            shift: entry.shift,
            entryTime: entry.entryTime || '',
            exitTime: entry.exitTime || '',
            leaveType: entry.leaveType || 'Sick Leave',
            notes: entry.notes || '',
        });
    };

    const cancelEdit = () => {
        setEditingEntryId(null);
        setEditForm(null);
    };

    const saveEdit = async (entryId) => {
        const ef = editForm;
        const isLv = ef.shift === 'leave';
        const updates = {
            shift: ef.shift,
            entryTime: isLv ? '' : ef.entryTime,
            exitTime: isLv ? '' : ef.exitTime,
            leaveType: isLv ? ef.leaveType : '',
            notes: ef.notes.trim(),
            hours: isLv ? 0 : toMinutes(ef.entryTime, ef.exitTime) / 60,
            updatedBy: user.userId,
        };
        await updateWorkHours(entryId, updates);
        setEditingEntryId(null);
        setEditForm(null);
    };

    // Team Overview data (owner only) — uses current cycle for each worker
    const teamRows = React.useMemo(() => {
        if (!isOwner || workers.length === 0) return [];
        const allHoursSnap = allHours;
        return workers.map((w, wi) => {
            const pal = paletteMap[w.id] || WORKER_PALETTES[wi % WORKER_PALETTES.length];
            const sd = w.salaryStartDay || 1;
            const wCycles = getCycles(sd, 1);
            const curCycle = wCycles[0];
            const wEntries = allHoursSnap.filter(h =>
                h.userId === w.id &&
                (!curCycle || (h.date >= curCycle.startStr && h.date <= curCycle.endStr))
            );
            const wWork = wEntries.filter(h => h.shift !== 'leave');
            const wLeave = wEntries.filter(h => h.shift === 'leave');
            const wDays = new Set(wWork.map(h => h.date)).size;
            const wMins = wWork.reduce((s, h) => s + toMinutes(h.entryTime, h.exitTime), 0);
            const wAvg = wDays > 0 ? Math.round(wMins / wDays) : 0;
            return {
                id: w.id, name: w.name, pal,
                daysWorked: wDays,
                totalMins: wMins,
                avgMins: wAvg,
                leaves: wLeave.length,
                cycleLabel: curCycle ? curCycle.label : 'All Time',
            };
        });
    }, [isOwner, workers, allHours, paletteMap]);

    // Grouped history
    const grouped = [...filteredHours]
        .sort((a, b) => b.date.localeCompare(a.date))
        .reduce((acc, h) => {
            if (!acc[h.date]) acc[h.date] = [];
            acc[h.date].push(h);
            return acc;
        }, {});

    return (
        <div className="wh-page">
            <div className="section-header">
                <h1>Work Hours</h1>
            </div>

            {/* Owner: Worker Dropdown */}
            {isOwner && workers.length > 0 && (
                <div className="wh-worker-dropdown-wrap">
                    <label className="wh-worker-dropdown-label">Select Worker</label>
                    <div className="wh-worker-dropdown"
                        style={{ borderLeftColor: selectedWorkerId ? activePalette.color : 'var(--border)' }}>
                        <select
                            value={selectedWorkerId || ''}
                            onChange={e => {
                                setSelectedWorkerId(e.target.value || null);
                                setSelectedCycleKey('_current_');
                            }}
                        >
                            <option value="">All Workers</option>
                            {workers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        {selectedWorkerId && (
                            <span className="wh-dropdown-swatch"
                                style={{ background: activePalette.color }} />
                        )}
                    </div>
                </div>
            )}

            {/* Individual view: Stats, Cycle filter, Log form, History */}
            {isOwner && !selectedWorkerId ? (
                <div className="wh-team-panel">
                    <div className="wh-team-section-title"><Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />All Workers · Current Cycle</div>

                    {/* Summary Table */}
                    <div className="wh-team-table-wrap">
                        <table className="wh-team-table">
                            <thead>
                                <tr>
                                    <th><User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Worker</th>
                                    <th><Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Cycle</th>
                                    <th><BarChart2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Days Worked</th>
                                    <th><Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Total Hours</th>
                                    <th><TrendingUp size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Avg / Day</th>
                                    <th><CalendarX size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Leaves</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamRows.map(row => (
                                    <tr key={row.id} className="wh-team-row-clickable"
                                        style={{ borderLeft: `3px solid ${row.pal.color}` }}
                                        onClick={() => { setSelectedWorkerId(row.id); setSelectedCycleKey('_current_'); }}>
                                        <td>
                                            <span className="wh-team-dot" style={{ background: row.pal.color }} />
                                            <span style={{ fontWeight: 600 }}>{row.name}</span>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.cycleLabel}</td>
                                        <td style={{ color: row.pal.color, fontWeight: 700 }}>{row.daysWorked}</td>
                                        <td style={{ color: row.pal.color, fontWeight: 700 }}>{fmtMins(row.totalMins)}</td>
                                        <td>{row.daysWorked > 0 ? fmtMins(row.avgMins) : '—'}</td>
                                        <td>
                                            {row.leaves > 0
                                                ? <span className="wh-team-leave-badge">{row.leaves}</span>
                                                : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                        </td>
                                    </tr>
                                ))}
                                {teamRows.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px 0' }}>No workers found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bar Chart */}
                    {teamRows.length > 0 && (
                        <div className="wh-team-chart-wrap">
                            <div className="wh-team-chart-title"><BarChart2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Total Hours This Cycle</div>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={teamRows.map(r => ({ name: r.name, minutes: r.totalMins, hours: parseFloat((r.totalMins / 60).toFixed(1)), color: r.pal.color }))} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                                    <Tooltip
                                        formatter={(val) => [`${val}h`, 'Total Hours']}
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.82rem' }}
                                        labelStyle={{ fontWeight: 700, color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                    />
                                    <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                                        {teamRows.map((row) => (
                                            <Cell key={row.id} fill={row.pal.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            ) : <>

                {/* Stats Dashboard */}
                <div className="wh-stats" style={{ '--wc': activePalette.color, '--wbg': activePalette.bg, '--wborder': activePalette.border }}>
                    <div className="wh-stat-card">
                        <div className="wh-stat-icon"><BarChart2 size={18} /></div>
                        <div className="wh-stat-body">
                            <div className="wh-stat-value">{daysWorked}</div>
                            <div className="wh-stat-label">Days Worked</div>
                        </div>
                    </div>
                    <div className="wh-stat-card">
                        <div className="wh-stat-icon"><Clock size={18} /></div>
                        <div className="wh-stat-body">
                            <div className="wh-stat-value">{fmtMins(totalMins)}</div>
                            <div className="wh-stat-label">Total Hours</div>
                        </div>
                    </div>
                    <div className="wh-stat-card">
                        <div className="wh-stat-icon"><TrendingUp size={18} /></div>
                        <div className="wh-stat-body">
                            <div className="wh-stat-value">{daysWorked > 0 ? fmtMins(avgMins) : '—'}</div>
                            <div className="wh-stat-label">Avg / Day</div>
                        </div>
                    </div>
                    <div className="wh-stat-card">
                        <div className="wh-stat-icon"><CalendarX size={18} /></div>
                        <div className="wh-stat-body">
                            <div className="wh-stat-value">{leaveEntries.length}</div>
                            <div className="wh-stat-label">Leaves</div>
                        </div>
                    </div>
                </div>

                {/* Cycle filter */}
                <div className="wh-period-bar">
                    <span className="wh-period-label">Cycle:</span>
                    <select
                        className="wh-cycle-select"
                        value={selectedCycleKey === '_current_' ? (cycles[0]?.key || 'all') : selectedCycleKey}
                        onChange={e => setSelectedCycleKey(e.target.value)}
                        style={{
                            background: 'var(--bg-card)',
                            border: `1.5px solid ${activePalette.border}`,
                            color: activePalette.color,
                            borderRadius: 10,
                            padding: '7px 32px 7px 12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            outline: 'none',
                            cursor: 'pointer',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 10px center',
                        }}
                    >
                        <option value="all">All Time</option>
                        {cycles.map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Today Banner + Log Button */}
                {(() => {
                    const todayLogs = myHours.filter(h => h.date === todayStr);
                    const todayDisplay = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
                    const doneShifts = todayLogs.map(h => h.shift);
                    const hasMorning = doneShifts.includes('morning');
                    const hasEvening = doneShifts.includes('evening');
                    const hasFull = doneShifts.includes('full');
                    const hasLeave = doneShifts.includes('leave');
                    const allDone = hasFull || (hasMorning && hasEvening);
                    return (
                        <div className="wh-today-banner" onClick={() => { setForm(f => ({ ...f, date: todayStr })); setDialogOpen(true); }}
                            style={{ '--wc': activePalette.color, '--wbg': activePalette.bg, '--wborder': activePalette.border }}>
                            <div className="wh-today-left">
                                <div className="wh-today-date"><Calendar size={13} /> {todayDisplay}</div>
                                {todayLogs.length > 0 ? (
                                    <div className="wh-today-shifts">
                                        {hasMorning && <span className="wh-shift-pill wh-shift-morning">Morning</span>}
                                        {hasEvening && <span className="wh-shift-pill wh-shift-evening">Evening</span>}
                                        {hasFull && <span className="wh-shift-pill wh-shift-full">Full Day</span>}
                                        {hasLeave && <span className="wh-shift-pill wh-shift-leave">Leave</span>}
                                    </div>
                                ) : null}
                            </div>
                            <div className="wh-today-right">
                                {todayLogs.length === 0
                                    ? <span className="wh-today-status wh-today-pending">No entry yet</span>
                                    : allDone
                                        ? <span className="wh-today-status wh-today-done">All shifts done</span>
                                        : <span className="wh-today-status wh-today-partial">{todayLogs.length} logged</span>
                                }
                            </div>
                        </div>
                    );
                })()}

                {/* Log Entry Dialog */}
                {dialogOpen && (
                    <div className="wh-dialog-overlay" onClick={() => setDialogOpen(false)}>
                        <div className="wh-dialog" onClick={e => e.stopPropagation()}
                            style={{ '--wc': activePalette.color, '--wbg': activePalette.bg, '--wborder': activePalette.border }}>
                            <div className="wh-dialog-header">
                                <div className="wh-form-title">
                                    <Clock size={18} style={{ color: activePalette.color }} />
                                    {isOwner ? `Log for ${activeUserName}` : 'Log Entry'}
                                </div>
                                <button type="button" className="wh-dialog-close" onClick={() => setDialogOpen(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmit} className="wh-form-body">
                                <div className="wh-field">
                                    <label><Calendar size={13} /> Date</label>
                                    <input type="date" value={form.date}
                                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        max={todayStr} required className="wh-input" />
                                </div>

                                <div className="wh-field">
                                    <label>Shift Type</label>
                                    <div className="wh-shift-row">
                                        {Object.entries(SHIFT_META).map(([val, meta]) => {
                                            const active = form.shift === val;
                                            return (
                                                <button key={val} type="button"
                                                    className={`wh-shift-btn ${active ? 'active' : ''}`}
                                                    style={active ? { borderColor: meta.border, color: meta.color, background: meta.bg } : {}}
                                                    onClick={() => handleShiftChange(val)}
                                                >
                                                    <meta.Icon size={14} /> {meta.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {!isLeave && (
                                    <div className="wh-time-row">
                                        <div className="wh-field">
                                            <label>Entry Time</label>
                                            <input type="time" value={form.entryTime}
                                                onChange={e => setForm(f => ({ ...f, entryTime: e.target.value }))}
                                                required className="wh-input" />
                                        </div>
                                        <div className="wh-field">
                                            <label>Exit Time</label>
                                            <input type="time" value={form.exitTime}
                                                onChange={e => setForm(f => ({ ...f, exitTime: e.target.value }))}
                                                required className="wh-input" />
                                        </div>
                                    </div>
                                )}

                                {!isLeave && duration && (
                                    <div className="wh-duration-preview">
                                        <Clock size={13} /> {duration} logged
                                    </div>
                                )}

                                {isLeave && (
                                    <div className="wh-field">
                                        <label><CalendarX size={13} /> Leave Type</label>
                                        <div className="wh-leave-row">
                                            {LEAVE_TYPES.map(lt => (
                                                <button key={lt} type="button"
                                                    className={`wh-leave-btn ${form.leaveType === lt ? 'active' : ''}`}
                                                    onClick={() => setForm(f => ({ ...f, leaveType: lt }))}
                                                >{lt}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="wh-field">
                                    <label>Notes <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
                                    <input type="text" value={form.notes} placeholder="What did you work on?"
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                        className="wh-input" />
                                </div>

                                <button type="submit" className={`wh-submit ${saved ? 'saved' : ''}`}
                                    style={!saved ? {
                                        background: `linear-gradient(135deg, ${activePalette.color}, ${activePalette.color}cc)`,
                                        boxShadow: `0 4px 14px ${activePalette.shadow}`
                                    } : {}}>
                                    {saved ? '✓ Logged!' : <><Clock size={16} /> Log Entry</>}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* History — full width */}
                <div className="wh-history" style={{ '--wc': activePalette.color, '--wbg': activePalette.bg, '--wborder': activePalette.border }}>
                    <div className="wh-history-header">
                        <div className="wh-history-title" style={{ color: activePalette.color }}>
                            <History size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{isOwner ? `${activeUserName}'s Logs` : 'My Logs'}
                            {filteredHours.length > 0 && <span className="wh-history-count">{filteredHours.length}</span>}
                        </div>
                        <button type="button" className="wh-log-btn"
                            style={{ background: activePalette.color }}
                            onClick={() => setDialogOpen(true)}>
                            <Plus size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Log Entry
                        </button>
                    </div>
                    {Object.keys(grouped).length === 0 ? (
                        <div className="wh-empty">No entries for this period.</div>
                    ) : (
                        Object.entries(grouped).map(([date, entries]) => {
                            const isExpanded = expandedDate === date;
                            const dateObj = new Date(date + 'T00:00:00');
                            const dateLabel = dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                            const hasLeave = entries.some(e => e.shift === 'leave');
                            const dayMins = entries.filter(e => e.shift !== 'leave')
                                .reduce((s, e) => s + toMinutes(e.entryTime, e.exitTime), 0);

                            return (
                                <div key={date} className="wh-day-group"
                                    style={{ '--wc': activePalette.color, '--wbg': activePalette.bg, '--wborder': activePalette.border }}>
                                    <div className="wh-day-header" onClick={() => setExpandedDate(isExpanded ? null : date)}>
                                        <div className="wh-day-left">
                                            <span className="wh-day-date">{dateLabel}</span>
                                            <div className="wh-day-badges">
                                                {entries.map(e => {
                                                    const m = SHIFT_META[e.shift] || SHIFT_META.morning;
                                                    return (
                                                        <span key={e.id} className="wh-badge"
                                                            style={{ background: m.bg, color: m.color, borderColor: m.border }}>
                                                            <m.Icon size={10} />
                                                            {e.shift === 'leave' ? (e.leaveType || 'Leave') : m.label}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="wh-day-right">
                                            {dayMins > 0 && <span className="wh-day-total" style={{ color: activePalette.color }}>{fmtMins(dayMins)}</span>}
                                            {hasLeave && !dayMins && <span className="wh-day-leave-tag">Leave</span>}
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="wh-day-entries">
                                            {entries.map(e => {
                                                const m = SHIFT_META[e.shift] || SHIFT_META.morning;
                                                const dur = e.shift !== 'leave' ? calcHours(e.entryTime, e.exitTime) : null;
                                                const isEditing = editingEntryId === e.id;

                                                if (isEditing && editForm) {
                                                    const ef = editForm;
                                                    const isLv = ef.shift === 'leave';
                                                    return (
                                                        <div key={e.id} className="wh-entry wh-entry-editing">
                                                            <div className="wh-edit-form">
                                                                {/* Shift selector */}
                                                                <div className="wh-shift-row" style={{ marginBottom: 8 }}>
                                                                    {Object.entries(SHIFT_META).map(([val, sm]) => {
                                                                        const a = ef.shift === val;
                                                                        return (
                                                                            <button key={val} type="button"
                                                                                className={`wh-shift-btn ${a ? 'active' : ''}`}
                                                                                style={a ? { borderColor: sm.border, color: sm.color, background: sm.bg } : {}}
                                                                                onClick={() => setEditForm(f => ({ ...f, shift: val, ...shiftDefaults[val] }))}
                                                                            >
                                                                                <sm.Icon size={12} /> {sm.label}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {!isLv && (
                                                                    <div className="wh-time-row" style={{ marginBottom: 8 }}>
                                                                        <div className="wh-field">
                                                                            <label style={{ fontSize: '0.68rem' }}>Entry</label>
                                                                            <input type="time" value={ef.entryTime} className="wh-input"
                                                                                onChange={ev => setEditForm(f => ({ ...f, entryTime: ev.target.value }))} />
                                                                        </div>
                                                                        <div className="wh-field">
                                                                            <label style={{ fontSize: '0.68rem' }}>Exit</label>
                                                                            <input type="time" value={ef.exitTime} className="wh-input"
                                                                                onChange={ev => setEditForm(f => ({ ...f, exitTime: ev.target.value }))} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {isLv && (
                                                                    <div className="wh-leave-row" style={{ marginBottom: 8 }}>
                                                                        {LEAVE_TYPES.map(lt => (
                                                                            <button key={lt} type="button"
                                                                                className={`wh-leave-btn ${ef.leaveType === lt ? 'active' : ''}`}
                                                                                onClick={() => setEditForm(f => ({ ...f, leaveType: lt }))}
                                                                            >{lt}</button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <input type="text" className="wh-input" placeholder="Notes (optional)"
                                                                    value={ef.notes}
                                                                    onChange={ev => setEditForm(f => ({ ...f, notes: ev.target.value }))}
                                                                    style={{ marginBottom: 8 }} />
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <button type="button" className="wh-edit-save-btn"
                                                                        style={{ background: activePalette.color }}
                                                                        onClick={() => saveEdit(e.id)}>
                                                                        <Check size={13} /> Save
                                                                    </button>
                                                                    <button type="button" className="wh-edit-cancel-btn" onClick={cancelEdit}>
                                                                        <XIcon size={13} /> Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={e.id} className="wh-entry">
                                                        <div className="wh-entry-icon" style={{ background: m.bg, color: m.color }}>
                                                            <m.Icon size={14} />
                                                        </div>
                                                        <div className="wh-entry-info">
                                                            <div className="wh-entry-top">
                                                                <span className="wh-entry-shift">{m.label}</span>
                                                                {e.shift === 'leave' && e.leaveType && (
                                                                    <span className="wh-entry-leave-type">{e.leaveType}</span>
                                                                )}
                                                                {dur && <span className="wh-entry-dur">{dur}</span>}
                                                            </div>
                                                            {e.entryTime && e.exitTime && (
                                                                <div className="wh-entry-times">{e.entryTime} → {e.exitTime}</div>
                                                            )}
                                                            {e.notes && <div className="wh-entry-notes">{e.notes}</div>}
                                                            {e.updatedAt && <div className="wh-entry-logged-by">Edited</div>}
                                                        </div>
                                                        {isOwner && (
                                                            <button type="button" className="wh-entry-edit-btn"
                                                                onClick={ev => { ev.stopPropagation(); startEdit(e); }}>
                                                                <Edit2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

            </>}

            <style>{`
                .wh-page { padding: 28px 32px; }
                @media (max-width: 700px) { .wh-page { padding: 14px 12px; } }
                @media (max-width: 600px) { .wh-page { padding: 10px 10px; } }

                /* Worker dropdown */
                .wh-worker-dropdown-wrap { margin-bottom: 20px; }
                .wh-worker-dropdown-label { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 7px; }
                .wh-worker-dropdown { position: relative; display: flex; align-items: center; background: var(--bg-card); border: 1px solid var(--wborder, var(--border)); border-radius: 12px; border-left-width: 3px; border-left-style: solid; transition: border-left-color 0.22s; overflow: hidden; }
                .wh-worker-dropdown select { background: transparent; border: none; border-radius: 12px; padding: 10px 16px; color: var(--text-primary); font-size: 0.95rem; font-family: inherit; width: 100%; outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; padding-right: 40px; }
                .wh-worker-dropdown select option { background: var(--bg-card, #1e1e2e); color: var(--text-primary, #f1f5f9); }
                .wh-dropdown-swatch { position: absolute; right: 14px; width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; pointer-events: none; }
                .wh-dropdown-chevron { position: absolute; right: 12px; color: var(--text-secondary); pointer-events: none; }

                /* Stats */
                .wh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
                @media (max-width: 700px) { .wh-stats { grid-template-columns: 1fr 1fr; } }
                @media (max-width: 480px) { .wh-stats { grid-template-columns: 1fr; } }
                .wh-stat-card { background: var(--bg-card); border: 1px solid var(--wborder, var(--border)); border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
                .wh-stat-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--wbg); color: var(--wc); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .wh-stat-value { font-size: 1.35rem; font-weight: 800; color: var(--wc); line-height: 1; }
                .wh-stat-label { font-size: 0.7rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }

                /* Period filter */
                .wh-period-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
                .wh-period-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); white-space: nowrap; }
                .wh-period-btn { display: flex; flex-direction: column; align-items: center; padding: 7px 14px; border: 1px solid var(--border); border-radius: 10px; background: none; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; line-height: 1.2; }
                .wh-period-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .wh-period-btn.active { font-weight: 700; }
                .wh-period-sub { font-size: 0.65rem; opacity: 0.75; font-weight: 500; margin-top: 2px; }

                /* Today banner trigger */
                .wh-today-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--wbg, rgba(99,102,241,0.08)); border: 1px solid var(--wborder, rgba(99,102,241,0.25)); border-radius: 12px; padding: 14px 18px; cursor: pointer; transition: all 0.18s; margin-bottom: 16px; }
                .wh-today-banner:hover { opacity: 0.85; }
                /* Dialog overlay */
                .wh-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
                .wh-dialog { background: var(--bg-card); border: 1px solid var(--wborder, var(--border)); border-radius: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: wh-dialog-in 0.2s ease; }
                @keyframes wh-dialog-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .wh-dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0; }
                .wh-dialog-close { background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 0.88rem; font-weight: 700; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; transition: all 0.15s; }
                .wh-dialog-close:hover { color: var(--text-primary); border-color: var(--border-bright); }
                .wh-form-body { display: flex; flex-direction: column; gap: 16px; padding: 16px 20px 20px; }

                /* Form */
                .wh-form-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1rem; }
                .wh-field { display: flex; flex-direction: column; gap: 6px; }
                .wh-field label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }
                .wh-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s; font-family: inherit; width: 100%; box-sizing: border-box; }
                .wh-input:focus { border-color: var(--wc, var(--accent)); }
                .wh-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .wh-shift-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }

                /* Mobile dialog: bottom sheet on ≤640px */
                @media (max-width: 640px) {
                    .wh-dialog-overlay { align-items: flex-end; padding: 0; }
                    .wh-dialog {
                        border-radius: 20px 20px 0 0;
                        max-width: 100% !important;
                        width: 100% !important;
                        max-height: 92vh;
                    }
                }

                /* Mobile form adjustments */
                @media (max-width: 480px) {
                    .wh-shift-row { flex-wrap: wrap; display: flex; gap: 6px; }
                    .wh-shift-btn { flex: 1 1 calc(50% - 3px); }
                    .wh-time-row { grid-template-columns: 1fr; }
                    .wh-input, .wh-worker-dropdown select, .wh-cycle-select { font-size: 16px !important; }
                    .wh-field { flex-direction: column; }
                }

                @media (max-width: 600px) {
                    .wh-worker-dropdown select, .wh-cycle-select { font-size: 16px !important; }
                    .wh-input { font-size: 16px !important; }
                    .wh-shift-row { flex-wrap: wrap; }
                    .wh-period-bar { flex-wrap: wrap; }
                    .wh-worker-dropdown-wrap { width: 100%; }
                }
                .wh-shift-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 10px; background: none; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .wh-shift-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .wh-shift-btn.active { font-weight: 700; }
                .wh-today-left { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
                .wh-today-right { flex-shrink: 0; }
                .wh-today-date { display: flex; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 700; color: var(--wc, var(--text-primary)); white-space: nowrap; }
                .wh-today-shifts { display: flex; gap: 5px; flex-wrap: wrap; }
                .wh-shift-pill { font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
                .wh-shift-pill.wh-shift-morning { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.35); }
                .wh-shift-pill.wh-shift-evening { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.35); }
                .wh-shift-pill.wh-shift-full    { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.35); }
                .wh-shift-pill.wh-shift-leave   { background: rgba(239,68,68,0.12);  color: #ef4444; border: 1px solid rgba(239,68,68,0.35); }
                .wh-today-status { font-size: 0.75rem; font-weight: 600; text-align: right; }
                .wh-today-done    { color: #10b981; }
                .wh-today-partial { color: var(--wc, var(--text-secondary)); }
                .wh-today-pending { color: var(--text-secondary); font-style: italic; }
                .wh-duration-preview { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: #10b981; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 8px; padding: 7px 12px; }
                .wh-leave-row { display: flex; flex-wrap: wrap; gap: 6px; }
                .wh-leave-btn { padding: 6px 12px; border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--text-secondary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .wh-leave-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .wh-leave-btn.active { border-color: rgba(239,68,68,0.4); color: #ef4444; background: rgba(239,68,68,0.08); }
                .wh-submit { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; border: none; color: white; border-radius: 12px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-top: 4px; }
                .wh-submit:hover { transform: translateY(-1px); }
                .wh-submit.saved { background: linear-gradient(135deg, #10b981, #059669) !important; box-shadow: 0 4px 14px rgba(16,185,129,0.35) !important; }

                /* History */
                .wh-history { display: flex; flex-direction: column; gap: 10px; }
                .wh-history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
                .wh-history-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 8px; }
                .wh-history-count { font-size: 0.7rem; background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); padding: 1px 7px; border-radius: 10px; font-weight: 600; }
                .wh-log-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 10px; color: white; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.18s; }
                .wh-log-btn:hover { opacity: 0.85; }
                .wh-empty { color: var(--text-secondary); font-size: 0.85rem; padding: 20px; text-align: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; }
                .wh-day-group { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; transition: border-color 0.18s; }
                .wh-day-group:hover { border-color: var(--wborder, var(--border-bright)); }
                .wh-day-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; gap: 12px; }
                .wh-day-left { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
                .wh-day-date { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
                .wh-day-badges { display: flex; gap: 5px; flex-wrap: wrap; }
                .wh-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid; }
                .wh-day-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; color: var(--text-secondary); }
                .wh-day-total { font-size: 0.88rem; font-weight: 800; }
                .wh-day-leave-tag { font-size: 0.72rem; font-weight: 700; color: #ef4444; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); padding: 2px 8px; border-radius: 6px; }
                .wh-day-entries { border-top: 1px solid var(--border); display: flex; flex-direction: column; }
                .wh-entry { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; }
                .wh-entry:last-child { border-bottom: none; }
                .wh-entry-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .wh-entry-info { flex: 1; min-width: 0; }
                .wh-entry-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap; }
                .wh-entry-shift { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
                .wh-entry-leave-type { font-size: 0.72rem; font-weight: 700; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); padding: 1px 7px; border-radius: 5px; }
                .wh-entry-dur { font-size: 0.75rem; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 1px 7px; border-radius: 5px; }
                .wh-entry-times { font-size: 0.78rem; color: var(--text-secondary); font-family: monospace; }
                .wh-entry-notes { font-size: 0.76rem; color: var(--text-secondary); margin-top: 3px; font-style: italic; }
                .wh-entry-logged-by { font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px; opacity: 0.5; }
                .wh-entry-edit-btn { background: none; border: 1px solid var(--border); border-radius: 7px; color: var(--text-secondary); padding: 5px 7px; cursor: pointer; display: flex; align-items: center; transition: all 0.18s; flex-shrink: 0; }
                .wh-entry-edit-btn:hover { border-color: var(--wborder); color: var(--wc); background: var(--wbg); }

                /* Edit form */
                .wh-entry-editing { background: rgba(255,255,255,0.02); }
                .wh-edit-form { flex: 1; }
                .wh-edit-save-btn { display: flex; align-items: center; gap: 5px; padding: 7px 14px; border: none; border-radius: 8px; color: white; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.18s; }
                .wh-edit-save-btn:hover { opacity: 0.85; }
                .wh-edit-cancel-btn { display: flex; align-items: center; gap: 5px; padding: 7px 14px; border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.18s; }
                .wh-edit-cancel-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }

                /* Team Overview */
                .wh-team-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 20px; }
                .wh-team-section-title { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); }
                .wh-team-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .wh-team-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 420px; }
                .wh-team-table thead tr { border-bottom: 1px solid var(--border); }
                .wh-team-table th { padding: 8px 12px; text-align: left; font-size: 0.63rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); white-space: nowrap; }
                .wh-team-table td { padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; color: var(--text-primary); white-space: nowrap; }
                .wh-team-table tbody tr:last-child td { border-bottom: none; }
                .wh-team-row-clickable { cursor: pointer; transition: background 0.15s; }
                .wh-team-row-clickable:hover td { background: rgba(255,255,255,0.04); }
                .wh-team-row-clickable td:first-child { border-left: inherit; }
                .wh-team-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; vertical-align: middle; flex-shrink: 0; }
                .wh-team-leave-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; padding: 1px 7px; border-radius: 20px; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); font-size: 0.75rem; font-weight: 700; }
                .wh-team-chart-wrap { display: flex; flex-direction: column; gap: 10px; }
                .wh-team-chart-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
            `}</style>
        </div>
    );
};

export default WorkHours;
