import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { Banknote, ChevronDown, ChevronUp, CreditCard, Wallet, TrendingDown, AlertCircle, CheckCircle, Users } from 'lucide-react';

// Palette per worker (same as WorkHours)
const WORKER_PALETTES = [
    { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)', shadow: 'rgba(99,102,241,0.25)' },
    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', shadow: 'rgba(16,185,129,0.25)' },
    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', shadow: 'rgba(245,158,11,0.25)' },
    { color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', shadow: 'rgba(236,72,153,0.25)' },
    { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.35)',  shadow: 'rgba(6,182,212,0.25)'  },
    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', shadow: 'rgba(139,92,246,0.25)' },
];

const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;
const todayStr = new Date().toISOString().split('T')[0];
const thisMonth = new Date().toISOString().slice(0, 7);
const thisYear = new Date().getFullYear();

// Migrate old records that have `amount`+`paymentMode` but not cashAmount/digitalAmount
const migrateRecord = (r) => {
    if (r.cashAmount !== undefined || r.digitalAmount !== undefined || r.type === 'advance') return r;
    const amt = parseFloat(r.amount || 0);
    const isDigital = r.paymentMode && r.paymentMode !== 'Cash';
    return { ...r, type: 'salary', cashAmount: isDigital ? 0 : amt, digitalAmount: isDigital ? amt : 0, advanceDeduction: 0 };
};

// ── Inline Payment Form ────────────────────────────────────────
const InlinePaymentForm = ({ worker, palette, onSave }) => {
    const pal = palette || WORKER_PALETTES[0];
    const [type, setType] = useState('salary');
    const [form, setForm] = useState({
        month: thisMonth,
        paymentDate: todayStr,
        cashAmount: '',
        digitalAmount: '',
        advanceDeduction: '',
        advanceAmount: '',
        notes: '',
    });

    const totalPaid = (parseFloat(form.cashAmount) || 0) + (parseFloat(form.digitalAmount) || 0);
    const advDed = parseFloat(form.advanceDeduction) || 0;

    const resetForm = () => {
        setForm({
            month: thisMonth,
            paymentDate: todayStr,
            cashAmount: '',
            digitalAmount: '',
            advanceDeduction: '',
            advanceAmount: '',
            notes: '',
        });
    };

    const handleSave = () => {
        if (!worker) return;
        if (type === 'salary' && !totalPaid && !advDed) return;
        if (type === 'advance' && !parseFloat(form.advanceAmount)) return;

        const record = {
            id: Date.now().toString(),
            type,
            workerId: worker.id,
            workerName: worker.name || '',
            month: form.month,
            paymentDate: form.paymentDate,
            ...(type === 'salary' ? {
                cashAmount: parseFloat(form.cashAmount) || 0,
                digitalAmount: parseFloat(form.digitalAmount) || 0,
                advanceDeduction: advDed,
            } : {
                advanceAmount: parseFloat(form.advanceAmount) || 0,
                cashAmount: 0,
                digitalAmount: 0,
                advanceDeduction: 0,
            }),
            notes: form.notes.trim(),
            createdAt: new Date().toISOString(),
        };
        onSave(record);
        resetForm();
    };

    const isDisabled = !worker || (type === 'salary' ? (!totalPaid && !advDed) : !parseFloat(form.advanceAmount));

    return (
        <div className="sl-inline-form">
            <div className="sl-inline-form-title">
                <Banknote size={15} style={{ color: pal.color }} />
                Record Payment
            </div>

            {/* Type toggle */}
            <div className="sl-type-row">
                <button type="button"
                    className={`sl-type-btn ${type === 'salary' ? 'active' : ''}`}
                    style={type === 'salary' ? { borderColor: pal.border, color: pal.color, background: pal.bg } : {}}
                    onClick={() => setType('salary')}>
                    <Banknote size={15} /> Salary Payment
                </button>
                <button type="button"
                    className={`sl-type-btn ${type === 'advance' ? 'active' : ''}`}
                    style={type === 'advance' ? { borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b', background: 'rgba(245,158,11,0.1)' } : {}}
                    onClick={() => setType('advance')}>
                    <AlertCircle size={15} /> Advance
                </button>
            </div>

            {/* Month (salary only) */}
            {type === 'salary' && (
                <div className="sl-field">
                    <label>For Month</label>
                    <input type="month" className="sl-input" value={form.month}
                        onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                        max={thisMonth} />
                </div>
            )}

            {/* Payment date */}
            <div className="sl-field">
                <label>Payment Date</label>
                <input type="date" className="sl-input" value={form.paymentDate}
                    onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                    max={todayStr} />
            </div>

            {type === 'salary' ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="sl-field">
                            <label><Wallet size={12} /> Cash Amount (₹)</label>
                            <input type="number" className="sl-input" placeholder="0"
                                value={form.cashAmount}
                                onChange={e => setForm(f => ({ ...f, cashAmount: e.target.value }))} />
                        </div>
                        <div className="sl-field">
                            <label><CreditCard size={12} /> Digital Amount (₹)</label>
                            <input type="number" className="sl-input" placeholder="0"
                                value={form.digitalAmount}
                                onChange={e => setForm(f => ({ ...f, digitalAmount: e.target.value }))} />
                        </div>
                    </div>

                    {totalPaid > 0 && (
                        <div className="sl-total-preview" style={{ background: pal.bg, borderColor: pal.border, color: pal.color }}>
                            <span>Total Payment</span>
                            <strong>{fmt(totalPaid)}</strong>
                        </div>
                    )}

                    <div className="sl-field">
                        <label><TrendingDown size={12} /> Advance Deduction (₹) <span style={{ opacity: 0.6, fontWeight: 400 }}>optional</span></label>
                        <input type="number" className="sl-input" placeholder="0"
                            value={form.advanceDeduction}
                            onChange={e => setForm(f => ({ ...f, advanceDeduction: e.target.value }))} />
                        {advDed > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                                {fmt(advDed)} will be deducted from outstanding advance
                            </span>
                        )}
                    </div>
                </>
            ) : (
                <div className="sl-field">
                    <label>Advance Amount (₹)</label>
                    <input type="number" className="sl-input" placeholder="Amount given"
                        value={form.advanceAmount}
                        onChange={e => setForm(f => ({ ...f, advanceAmount: e.target.value }))} />
                    {parseFloat(form.advanceAmount) > 0 && (
                        <div className="sl-total-preview" style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.35)', color: '#f59e0b' }}>
                            <span>Advance Total</span>
                            <strong>{fmt(parseFloat(form.advanceAmount))}</strong>
                        </div>
                    )}
                </div>
            )}

            <div className="sl-field">
                <label>Notes <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                <input type="text" className="sl-input" placeholder="Any additional notes…"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <button className="sl-save-btn"
                style={{
                    background: type === 'salary'
                        ? `linear-gradient(135deg, ${pal.color}, ${pal.color}cc)`
                        : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: type === 'salary' ? `0 4px 14px ${pal.shadow}` : '0 4px 14px rgba(245,158,11,0.25)',
                }}
                onClick={handleSave}
                disabled={isDisabled}>
                <CheckCircle size={16} /> {type === 'salary' ? 'Record Payment' : 'Record Advance'}
            </button>
        </div>
    );
};

// ── Financial Summary Card ─────────────────────────────────────
const FinancialSummaryCard = ({ workerData, allWorkerRecords, palette, onRecordPayment, isOwner }) => {
    const pal = palette || WORKER_PALETTES[0];
    const monthlySalary = parseFloat(workerData?.monthlySalary) || 0;
    const salaryStartDay = workerData?.salaryStartDay || 1;

    const today = new Date();
    const curCycleStart = today.getDate() >= salaryStartDay
        ? new Date(today.getFullYear(), today.getMonth(), salaryStartDay)
        : new Date(today.getFullYear(), today.getMonth() - 1, salaryStartDay);
    const curCycleStartStr = curCycleStart.toLocaleDateString('en-CA');

    const paidThisCycle = allWorkerRecords
        .filter(r => r.type === 'salary' && (r.paymentDate || '') >= curCycleStartStr)
        .reduce((s, r) => s + (r.cashAmount || 0) + (r.digitalAmount || 0), 0);

    const balanceDue = monthlySalary - paidThisCycle;

    const totalAdvancesGiven = allWorkerRecords
        .filter(r => r.type === 'advance')
        .reduce((s, r) => s + (r.advanceAmount || 0), 0);
    const totalAdvanceDeductions = allWorkerRecords
        .filter(r => r.type === 'salary')
        .reduce((s, r) => s + (r.advanceDeduction || 0), 0);
    const outstandingAdvance = totalAdvancesGiven - totalAdvanceDeductions;
    const netPosition = balanceDue - outstandingAdvance;

    const fmtCycleDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="sl-summary-card" style={{ '--wc': pal.color, '--wbg': pal.bg, '--wborder': pal.border }}>
            {/* Accent stripe */}
            <div className="sl-summary-accent" style={{ background: pal.color }} />

            {/* Header row */}
            <div className="sl-summary-header">
                <div className="sl-summary-worker-dot" style={{ background: pal.color }} />
                <span className="sl-summary-worker-name">{workerData?.name}</span>
                <div className="sl-summary-header-right">
                    <span className="sl-summary-cycle-badge">
                        Cycle from {fmtCycleDate(curCycleStart)}
                    </span>
                    {isOwner && onRecordPayment && (
                        <button
                            className="sl-record-pay-btn"
                            style={{ background: `linear-gradient(135deg, ${pal.color}, ${pal.color}cc)`, boxShadow: `0 4px 14px ${pal.shadow}` }}
                            onClick={onRecordPayment}
                        >
                            + Record Payment
                        </button>
                    )}
                </div>
            </div>

            {/* Not-configured notice */}
            {monthlySalary === 0 && (
                <div className="sl-summary-unconfigured">
                    <Banknote size={14} />
                    Monthly salary not configured — edit the worker profile to set it.
                </div>
            )}

            {/* Stats row */}
            <div className="sl-summary-grid">

                {/* Monthly Salary */}
                <div className="sl-summary-item">
                    <div className="sl-summary-item-icon" style={{ background: pal.bg, color: pal.color }}>
                        <Banknote size={14} />
                    </div>
                    <div>
                        <div className="sl-summary-item-val" style={{
                            color: monthlySalary > 0 ? pal.color : 'var(--text-secondary)',
                            opacity: monthlySalary > 0 ? 1 : 0.55,
                        }}>
                            {monthlySalary > 0 ? fmt(monthlySalary) : 'Not set'}
                        </div>
                        <div className="sl-summary-item-lbl">Monthly Salary</div>
                    </div>
                </div>

                {/* Paid This Cycle */}
                <div className="sl-summary-item">
                    <div className="sl-summary-item-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        <CheckCircle size={14} />
                    </div>
                    <div>
                        <div className="sl-summary-item-val" style={{
                            color: paidThisCycle > 0 ? '#10b981' : 'var(--text-secondary)',
                            opacity: paidThisCycle > 0 ? 1 : 0.5,
                        }}>
                            {paidThisCycle > 0 ? fmt(paidThisCycle) : '—'}
                        </div>
                        <div className="sl-summary-item-lbl">Paid This Cycle</div>
                    </div>
                </div>

                {/* Balance Due — prominent */}
                <div
                    className="sl-summary-item sl-summary-item-prominent"
                    style={balanceDue > 0 ? {
                        background: 'rgba(239,68,68,0.08)',
                        borderColor: 'rgba(239,68,68,0.4)',
                    } : balanceDue < 0 ? {
                        background: 'rgba(16,185,129,0.07)',
                        borderColor: 'rgba(16,185,129,0.35)',
                    } : {
                        background: 'rgba(16,185,129,0.07)',
                        borderColor: 'rgba(16,185,129,0.35)',
                    }}
                >
                    <div className="sl-summary-item-icon" style={{
                        background: balanceDue > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        color: balanceDue > 0 ? '#f87171' : '#10b981',
                    }}>
                        {balanceDue > 0 ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                    </div>
                    <div>
                        <div className="sl-summary-item-val sl-summary-item-val-lg" style={{
                            color: monthlySalary === 0 ? 'var(--text-secondary)' : balanceDue > 0 ? '#f87171' : '#10b981',
                            opacity: monthlySalary === 0 ? 0.45 : 1,
                        }}>
                            {monthlySalary === 0 ? '—' : balanceDue > 0 ? fmt(balanceDue) : balanceDue < 0 ? `+${fmt(-balanceDue)}` : 'Paid ✓'}
                        </div>
                        <div className="sl-summary-item-lbl">
                            {balanceDue < 0 ? 'Excess Paid' : 'Balance Due'}
                        </div>
                    </div>
                </div>

                {/* Outstanding Advance */}
                <div className="sl-summary-item">
                    <div className="sl-summary-item-icon" style={{
                        background: outstandingAdvance > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: outstandingAdvance > 0 ? '#f59e0b' : '#10b981',
                    }}>
                        <TrendingDown size={14} />
                    </div>
                    <div>
                        <div className="sl-summary-item-val" style={{
                            color: outstandingAdvance > 0 ? '#f59e0b' : '#10b981',
                            opacity: outstandingAdvance === 0 ? 0.6 : 1,
                        }}>
                            {outstandingAdvance > 0 ? fmt(outstandingAdvance) : 'Clear'}
                        </div>
                        <div className="sl-summary-item-lbl">Outstanding Advance</div>
                    </div>
                </div>

                {/* Net Position */}
                <div className="sl-summary-item">
                    <div className="sl-summary-item-icon" style={{
                        background: netPosition > 0 ? 'rgba(96,165,250,0.12)' : netPosition < 0 ? 'rgba(251,146,60,0.12)' : 'rgba(16,185,129,0.12)',
                        color: netPosition > 0 ? '#60a5fa' : netPosition < 0 ? '#fb923c' : '#10b981',
                    }}>
                        <Wallet size={14} />
                    </div>
                    <div>
                        <div className="sl-summary-item-val" style={{
                            color: netPosition > 0 ? '#60a5fa' : netPosition < 0 ? '#fb923c' : '#10b981',
                            opacity: netPosition === 0 ? 0.6 : 1,
                        }}>
                            {netPosition > 0 ? `Owe ${fmt(netPosition)}` : netPosition < 0 ? `+${fmt(-netPosition)}` : 'Clear'}
                        </div>
                        <div className="sl-summary-item-lbl">Net Position</div>
                    </div>
                </div>

            </div>
        </div>
    );
};

// ── Payment History ────────────────────────────────────────────
const PaymentHistory = ({ cycleGroups, activePalette, curCycleStartStr, monthlySalary, yearFilter, availableYears, onYearChange }) => {
    const [expandedMonth, setExpandedMonth] = useState(null);
    const pal = activePalette || WORKER_PALETTES[0];

    return (
        <div className="sl-history-section">
            <div className="sl-history-header">
                <span className="sl-history-title">Payment History</span>
                <div className="sl-year-bar">
                    <span className="sl-year-label">Year:</span>
                    {availableYears.map(y => (
                        <button key={y} type="button"
                            className={`sl-year-btn ${yearFilter === y ? 'active' : ''}`}
                            style={yearFilter === y ? { borderColor: pal.border, color: pal.color, background: pal.bg } : {}}
                            onClick={() => onYearChange(y)}>
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            {cycleGroups.length === 0 ? (
                <div className="sl-empty">
                    <Banknote size={32} style={{ opacity: 0.3 }} />
                    <p>No records for {yearFilter}.</p>
                </div>
            ) : (
                <div className="sl-month-list">
                    {cycleGroups.map(([cycleKey, records]) => {
                        const salaryRecs = records.filter(r => r.type === 'salary');
                        const advanceRecs = records.filter(r => r.type === 'advance');
                        const cashTotal = salaryRecs.reduce((s, r) => s + (r.cashAmount || 0), 0);
                        const digitalTotal = salaryRecs.reduce((s, r) => s + (r.digitalAmount || 0), 0);
                        const paidTotal = cashTotal + digitalTotal;
                        const deductionsTotal = salaryRecs.reduce((s, r) => s + (r.advanceDeduction || 0), 0);
                        const advancesTotal = advanceRecs.reduce((s, r) => s + (r.advanceAmount || 0), 0);
                        const isExpanded = expandedMonth === cycleKey;

                        const csDate = new Date(cycleKey + 'T00:00:00');
                        const ceDate = new Date(csDate.getFullYear(), csDate.getMonth() + 1, csDate.getDate() - 1);
                        const fmtD = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        const monthLabel = `${fmtD(csDate)} – ${fmtD(ceDate)}`;
                        const isCurrentCycle = cycleKey === curCycleStartStr;

                        return (
                            <div key={cycleKey} className="sl-month-card"
                                style={{ '--wc': pal.color, '--wbg': pal.bg, '--wborder': pal.border }}>
                                <div className="sl-month-header" onClick={() => setExpandedMonth(isExpanded ? null : cycleKey)}>
                                    <div className="sl-month-left">
                                        <span className="sl-month-name">
                                            {monthLabel}
                                            {isCurrentCycle && <span style={{ marginLeft: 8, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '1px 6px' }}>Current</span>}
                                        </span>
                                        <div className="sl-month-chips">
                                            {cashTotal > 0 && (
                                                <span className="sl-chip sl-chip-cash"><Wallet size={9} /> Cash {fmt(cashTotal)}</span>
                                            )}
                                            {digitalTotal > 0 && (
                                                <span className="sl-chip sl-chip-digital"><CreditCard size={9} /> Digital {fmt(digitalTotal)}</span>
                                            )}
                                            {deductionsTotal > 0 && (
                                                <span className="sl-chip sl-chip-deduct"><TrendingDown size={9} /> Deducted {fmt(deductionsTotal)}</span>
                                            )}
                                            {advancesTotal > 0 && (
                                                <span className="sl-chip sl-chip-advance"><AlertCircle size={9} /> Advance {fmt(advancesTotal)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sl-month-right">
                                        <div style={{ textAlign: 'right' }}>
                                            <span className="sl-month-total" style={{ color: pal.color }}>
                                                {fmt(paidTotal)}
                                            </span>
                                            {monthlySalary > 0 && isCurrentCycle && (
                                                <div style={{ fontSize: '0.7rem', marginTop: 2 }}>
                                                    {(() => {
                                                        const due = monthlySalary - paidTotal;
                                                        if (due > 0) return <span style={{ color: '#f87171' }}>₹{due.toLocaleString('en-IN')} due</span>;
                                                        if (due < 0) return <span style={{ color: '#10b981' }}>Overpaid {fmt(-due)}</span>;
                                                        return <span style={{ color: '#10b981' }}>Fully paid ✓</span>;
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="sl-month-count">{records.length} entries</span>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="sl-month-entries">
                                        {records.map(r => {
                                            const isAdv = r.type === 'advance';
                                            const paidDate = new Date(r.paymentDate || r.date || r.createdAt)
                                                .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                            return (
                                                <div key={r.id} className={`sl-entry ${isAdv ? 'sl-entry-advance' : ''}`}>
                                                    <div className="sl-entry-icon"
                                                        style={isAdv
                                                            ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }
                                                            : { background: pal.bg, color: pal.color }}>
                                                        {isAdv ? <AlertCircle size={14} /> : <Banknote size={14} />}
                                                    </div>
                                                    <div className="sl-entry-info">
                                                        <div className="sl-entry-top">
                                                            <span className="sl-entry-type">
                                                                {isAdv ? 'Advance Given' : 'Salary Payment'}
                                                            </span>
                                                            <span className="sl-entry-date">{paidDate}</span>
                                                        </div>
                                                        {!isAdv && (
                                                            <div className="sl-entry-breakdown">
                                                                {(r.cashAmount || 0) > 0 && (
                                                                    <span className="sl-chip sl-chip-cash"><Wallet size={9} /> {fmt(r.cashAmount)}</span>
                                                                )}
                                                                {(r.digitalAmount || 0) > 0 && (
                                                                    <span className="sl-chip sl-chip-digital"><CreditCard size={9} /> {fmt(r.digitalAmount)}</span>
                                                                )}
                                                                {(r.advanceDeduction || 0) > 0 && (
                                                                    <span className="sl-chip sl-chip-deduct"><TrendingDown size={9} /> −{fmt(r.advanceDeduction)}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {isAdv && (
                                                            <div className="sl-entry-adv-amt" style={{ color: '#f59e0b' }}>
                                                                {fmt(r.advanceAmount)}
                                                            </div>
                                                        )}
                                                        {r.notes && <div className="sl-entry-notes">{r.notes}</div>}
                                                    </div>
                                                    <div className="sl-entry-total">
                                                        {isAdv ? fmt(r.advanceAmount) : fmt((r.cashAmount || 0) + (r.digitalAmount || 0))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ── Salary Page ────────────────────────────────────────────────
const Salary = () => {
    const { user } = useAuth();
    const isOwner = user?.role?.toLowerCase() === 'owner';

    const [rawSalaries, setRawSalaries] = useState(() => storage.getSalary());
    const salaries = rawSalaries.map(migrateRecord).filter(s => !s.deleted);

    const allUsers = useMemo(() => storage.getUsers().filter(u => u.active), []);

    // Read permissions from storage so it reflects any updates made after login
    const myStoredUser = useMemo(() => allUsers.find(u => u.id === user?.userId), [allUsers, user?.userId]);
    const canRecord = isOwner || !!myStoredUser?.permissions?.recordSalary;
    const workers = allUsers.filter(u => u.role?.toLowerCase() !== 'owner');

    const paletteMap = useMemo(() => {
        const map = {};
        allUsers.forEach((u, i) => { map[u.id] = WORKER_PALETTES[i % WORKER_PALETTES.length]; });
        return map;
    }, [allUsers]);

    // Owner: null = no selection, worker: always their own id
    const [selectedWorkerId, setSelectedWorkerId] = useState(() =>
        isOwner ? '' : user.userId
    );
    const [yearFilter, setYearFilter] = useState(thisYear);
    const [payDialogOpen, setPayDialogOpen] = useState(false);

    const selectedWorkerData = allUsers.find(u => u.id === selectedWorkerId);
    const activePalette = paletteMap[selectedWorkerId] || WORKER_PALETTES[0];
    const salaryStartDay = selectedWorkerData?.salaryStartDay || 1;

    const getCycleKey = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr);
        const day = d.getDate(), y = d.getFullYear(), m = d.getMonth();
        const cs = day >= salaryStartDay ? new Date(y, m, salaryStartDay) : new Date(y, m - 1, salaryStartDay);
        return cs.toLocaleDateString('en-CA');
    };

    const workerRecords = salaries.filter(s =>
        s.workerId === selectedWorkerId &&
        (s.paymentDate || s.month || '').startsWith(String(yearFilter))
    );

    const yearsWithData = [...new Set(
        salaries
            .filter(s => s.workerId === selectedWorkerId)
            .map(s => (s.paymentDate || s.month || '').slice(0, 4))
            .filter(Boolean)
    )].sort((a, b) => b - a);

    const allWorkerRecords = salaries.filter(s => s.workerId === selectedWorkerId);

    const monthlySalary = parseFloat(selectedWorkerData?.monthlySalary) || 0;
    const today2 = new Date();
    const curCycleStart = today2.getDate() >= salaryStartDay
        ? new Date(today2.getFullYear(), today2.getMonth(), salaryStartDay)
        : new Date(today2.getFullYear(), today2.getMonth() - 1, salaryStartDay);
    const curCycleStartStr = curCycleStart.toLocaleDateString('en-CA');

    const cycleGroups = useMemo(() => {
        const groups = {};
        workerRecords.forEach(r => {
            const key = getCycleKey(r.paymentDate || r.date || r.createdAt);
            if (!key) return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workerRecords, salaryStartDay]);

    const handleSave = (record) => {
        const updated = [...rawSalaries, record];
        storage.setSalary(updated);
        setRawSalaries(updated);
        setPayDialogOpen(false);
    };

    const availableYears = [...new Set([thisYear, thisYear - 1, ...yearsWithData.map(Number)])].sort((a, b) => b - a);

    // Team overview data
    const teamRows = useMemo(() => {
        const allSalaries = rawSalaries.map(migrateRecord).filter(s => !s.deleted);
        const today3 = new Date();
        return workers.map(w => {
            const pal = paletteMap[w.id] || WORKER_PALETTES[0];
            const monthly = parseFloat(w.monthlySalary) || 0;
            const sd = w.salaryStartDay || 1;
            const cs = today3.getDate() >= sd
                ? new Date(today3.getFullYear(), today3.getMonth(), sd)
                : new Date(today3.getFullYear(), today3.getMonth() - 1, sd);
            const csStr = cs.toLocaleDateString('en-CA');
            const recs = allSalaries.filter(s => s.workerId === w.id);
            const paidCycle = recs.filter(r => r.type === 'salary' && (r.paymentDate || '') >= csStr)
                .reduce((s, r) => s + (r.cashAmount || 0) + (r.digitalAmount || 0), 0);
            const advGiven = recs.filter(r => r.type === 'advance').reduce((s, r) => s + (r.advanceAmount || 0), 0);
            const advDeducted = recs.filter(r => r.type === 'salary').reduce((s, r) => s + (r.advanceDeduction || 0), 0);
            const outAdv = advGiven - advDeducted;
            const balDue = monthly - paidCycle;
            const net = balDue - outAdv;
            return { w, pal, monthly, paidCycle, balDue, outAdv, net };
        });
    }, [rawSalaries, workers, paletteMap]);

    return (
        <div className="sl-page">
            {/* Page header */}
            <div className="section-header">
                <h1>{isOwner ? 'Salary Management' : 'My Salary'}</h1>
            </div>

            {/* Worker dropdown (owner only) */}
            {isOwner && workers.length > 0 && (
                <div className="sl-worker-dropdown">
                    <label className="sl-dropdown-label">Select Worker</label>
                    <div className="sl-dropdown-wrap">
                        <select
                            className="sl-dropdown-select"
                            value={selectedWorkerId}
                            onChange={e => { setSelectedWorkerId(e.target.value); setYearFilter(thisYear); }}
                        >
                            <option value="">All Workers Overview</option>
                            {workers.map((w, i) => {
                                const pal = paletteMap[w.id] || WORKER_PALETTES[i % WORKER_PALETTES.length];
                                return (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                );
                            })}
                        </select>
                        {selectedWorkerId && (
                            <span className="sl-dropdown-dot" style={{ background: activePalette.color }} />
                        )}
                        <ChevronDown size={16} className="sl-dropdown-chevron" />
                    </div>
                </div>
            )}

            {/* ── TEAM DASHBOARD — shown when no worker is selected (owner) ── */}
            {isOwner && !selectedWorkerId && (
                <div className="sl-team-overview">
                    <div className="sl-team-overview-header">
                        <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span>All Workers Overview</span>
                        <span className="sl-team-overview-sub">Current cycle · click a card to view individual details</span>
                    </div>
                    <div className="sl-team-cards-grid">
                        {teamRows.map(({ w, pal, monthly, paidCycle, balDue, outAdv, net }) => (
                            <div
                                key={w.id}
                                className="sl-team-worker-card"
                                style={{ '--wc': pal.color, '--wbg': pal.bg, '--wborder': pal.border }}
                            >
                                <div className="sl-twc-accent" style={{ background: pal.color }} />
                                <div className="sl-twc-header">
                                    <span className="sl-twc-dot" style={{ background: pal.color }} />
                                    <span className="sl-twc-name">{w.name}</span>
                                </div>
                                <div className="sl-twc-metrics">
                                    <div className="sl-twc-metric">
                                        <span className="sl-twc-metric-label">Monthly</span>
                                        <span className="sl-twc-metric-val" style={{ color: 'var(--text-primary)' }}>
                                            {monthly > 0 ? fmt(monthly) : '—'}
                                        </span>
                                    </div>
                                    <div className="sl-twc-metric">
                                        <span className="sl-twc-metric-label">Paid This Cycle</span>
                                        <span className="sl-twc-metric-val" style={{ color: '#10b981' }}>
                                            {paidCycle > 0 ? fmt(paidCycle) : '—'}
                                        </span>
                                    </div>
                                    <div className="sl-twc-metric">
                                        <span className="sl-twc-metric-label">Balance Due</span>
                                        <span className="sl-twc-metric-val" style={{ color: balDue > 0 ? '#f87171' : '#10b981' }}>
                                            {balDue > 0 ? fmt(balDue) : balDue < 0 ? `Overpaid ${fmt(-balDue)}` : '✓ Paid'}
                                        </span>
                                    </div>
                                    <div className="sl-twc-metric">
                                        <span className="sl-twc-metric-label">Net Position</span>
                                        <span className="sl-twc-metric-val" style={{
                                            color: net > 0 ? '#60a5fa' : net < 0 ? '#fb923c' : '#10b981'
                                        }}>
                                            {net > 0 ? `We owe ${fmt(net)}` : net < 0 ? `They owe ${fmt(-net)}` : '✓ Clear'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="sl-twc-view-btn"
                                    style={{ color: pal.color, borderColor: pal.border, background: pal.bg }}
                                    onClick={() => setSelectedWorkerId(w.id)}
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                        {teamRows.length === 0 && (
                            <div className="sl-twc-empty">
                                <Users size={32} style={{ opacity: 0.3 }} />
                                <p>No workers found.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── INDIVIDUAL VIEW — shown when a worker is selected ── */}
            {selectedWorkerId && selectedWorkerData && (
                <>
                    {/* Financial summary + Record button */}
                    <FinancialSummaryCard
                        workerData={selectedWorkerData}
                        allWorkerRecords={allWorkerRecords}
                        palette={activePalette}
                        isOwner={canRecord}
                        onRecordPayment={() => setPayDialogOpen(true)}
                    />

                    {/* Payment dialog */}
                    {payDialogOpen && (
                        <div className="sl-dialog-overlay" onClick={() => setPayDialogOpen(false)}>
                            <div className="sl-dialog" onClick={e => e.stopPropagation()}
                                style={{ borderColor: activePalette.border }}>
                                <div className="sl-dialog-header">
                                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Record Payment</span>
                                    <button className="sl-dialog-close" onClick={() => setPayDialogOpen(false)}>✕</button>
                                </div>
                                <InlinePaymentForm
                                    worker={selectedWorkerData}
                                    palette={activePalette}
                                    onSave={handleSave}
                                />
                            </div>
                        </div>
                    )}

                    {/* Payment history */}
                    <PaymentHistory
                        cycleGroups={cycleGroups}
                        activePalette={activePalette}
                        curCycleStartStr={curCycleStartStr}
                        monthlySalary={monthlySalary}
                        yearFilter={yearFilter}
                        availableYears={availableYears}
                        onYearChange={setYearFilter}
                    />
                </>
            )}

            <style>{`
                .sl-page { padding: 28px 32px; }
                @media (max-width: 700px) { .sl-page { padding: 14px 12px; } }
                @media (max-width: 600px) { .sl-page { padding: 10px 10px; } }

                /* Team overview dashboard */
                .sl-team-overview { display: flex; flex-direction: column; gap: 16px; margin-bottom: 8px; }
                .sl-team-overview-header { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-primary); }
                .sl-team-overview-sub { font-size: 0.7rem; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--text-secondary); margin-left: 4px; }
                .sl-team-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
                .sl-team-worker-card { position: relative; background: var(--bg-card); border: 1.5px solid var(--wborder, var(--border)); border-radius: 18px; padding: 18px 18px 14px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; transition: border-color 0.18s, box-shadow 0.18s; }
                .sl-team-worker-card:hover { box-shadow: 0 4px 20px var(--wbg, rgba(0,0,0,0.15)); }
                .sl-twc-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 18px 18px 0 0; opacity: 0.85; }
                .sl-twc-header { display: flex; align-items: center; gap: 8px; }
                .sl-twc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
                .sl-twc-name { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
                .sl-twc-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .sl-twc-metric { display: flex; flex-direction: column; gap: 3px; }
                .sl-twc-metric-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
                .sl-twc-metric-val { font-size: 0.88rem; font-weight: 800; line-height: 1.2; }
                .sl-twc-view-btn { align-self: stretch; padding: 8px 14px; border: 1.5px solid; border-radius: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.18s; background: transparent; }
                .sl-twc-view-btn:hover { opacity: 0.8; transform: translateY(-1px); }
                .sl-twc-empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: var(--text-secondary); font-size: 0.88rem; }

                /* Record Payment button */
                .sl-record-pay-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: none; border-radius: 10px; color: white; font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.18s; white-space: nowrap; }
                .sl-record-pay-btn:hover { opacity: 0.87; }

                /* Payment dialog */
                .sl-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
                .sl-dialog { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: sl-dialog-in 0.2s ease; }
                @keyframes sl-dialog-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .sl-dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 0; margin-bottom: 4px; }
                .sl-dialog-close { background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); font-size: 0.88rem; font-weight: 700; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; transition: all 0.15s; }
                .sl-dialog-close:hover { color: var(--text-primary); border-color: var(--border-bright); }

                /* Worker dropdown */
                .sl-worker-dropdown { margin-bottom: 20px; }
                .sl-dropdown-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); margin-bottom: 8px; }
                .sl-dropdown-wrap { position: relative; display: flex; align-items: center; }
                .sl-dropdown-select { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 10px 44px 10px 16px; color: var(--text-primary); font-size: 0.95rem; font-family: inherit; width: 100%; appearance: none; -webkit-appearance: none; cursor: pointer; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
                .sl-dropdown-select:focus { border-color: var(--accent, #6366f1); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
                .sl-dropdown-select:hover { border-color: var(--border-bright); }
                .sl-dropdown-dot { position: absolute; left: 14px; width: 9px; height: 9px; border-radius: 50%; pointer-events: none; display: none; }
                .sl-dropdown-chevron { position: absolute; right: 14px; color: var(--text-secondary); pointer-events: none; }

                /* Financial summary card */
                .sl-summary-card { position: relative; background: var(--bg-card); border: 1.5px solid var(--wborder, var(--border)); border-radius: 20px; padding: 22px 22px 18px; margin-bottom: 16px; overflow: hidden; }
                .sl-summary-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 20px 20px 0 0; opacity: 0.85; }
                .sl-summary-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; row-gap: 8px; }
                .sl-summary-worker-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
                .sl-summary-worker-name { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
                .sl-summary-cycle-badge { font-size: 0.68rem; font-weight: 600; color: var(--text-secondary); background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; white-space: nowrap; letter-spacing: 0.02em; }
                .sl-summary-header-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
                .sl-summary-unconfigured { display: flex; align-items: center; gap: 7px; font-size: 0.75rem; color: var(--text-secondary); opacity: 0.65; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 12px; margin-bottom: 14px; }
                .sl-summary-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                .sl-summary-item { flex: 1 1 150px; display: flex; align-items: center; gap: 11px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; transition: border-color 0.15s; }
                .sl-summary-item-prominent { flex: 1 1 170px; border-width: 1.5px; }
                .sl-summary-item-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .sl-summary-item-val { font-size: 0.95rem; font-weight: 800; line-height: 1.2; }
                .sl-summary-item-val-lg { font-size: 1.15rem; }
                .sl-summary-item-lbl { font-size: 0.62rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-top: 3px; }
                @media (max-width: 600px) { .sl-summary-item { flex: 1 1 calc(50% - 5px); } .sl-summary-item-prominent { flex: 1 1 100%; } }
                @media (max-width: 400px) { .sl-summary-item { flex: 1 1 100%; } }

                /* Inline payment form */
                .sl-inline-form { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 14px; }
                .sl-inline-form-title { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); padding-bottom: 6px; border-bottom: 1px solid var(--border); }

                /* Payment history */
                .sl-history-section { display: flex; flex-direction: column; gap: 12px; }
                .sl-history-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
                .sl-history-title { font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); }

                /* Team panel */
                .sl-team-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 16px; }
                .sl-team-section-title { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-secondary); display: flex; align-items: center; }
                .sl-team-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                .sl-team-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; min-width: 520px; }
                .sl-team-table thead tr { border-bottom: 1px solid var(--border); }
                .sl-team-table th { padding: 8px 12px; text-align: left; font-size: 0.63rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); white-space: nowrap; }
                .sl-team-table td { padding: 12px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; color: var(--text-primary); white-space: nowrap; }
                .sl-team-table tbody tr:last-child td { border-bottom: none; }
                .sl-team-row { cursor: pointer; transition: background 0.15s; border-left: 3px solid transparent; }
                .sl-team-row:hover td { background: rgba(255,255,255,0.03); }
                .sl-team-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; vertical-align: middle; flex-shrink: 0; }
                .sl-team-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; border: 1px solid; }
                .sl-team-badge-red { background: rgba(239,68,68,0.1); color: #f87171; border-color: rgba(239,68,68,0.3); }
                .sl-team-badge-amber { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
                .sl-team-badge-blue { background: rgba(96,165,250,0.12); color: #60a5fa; border-color: rgba(96,165,250,0.3); }
                .sl-team-badge-orange { background: rgba(251,146,60,0.12); color: #fb923c; border-color: rgba(251,146,60,0.3); }
                .sl-team-badge-green { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
                .sl-team-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.68rem; color: var(--text-secondary); padding-top: 4px; border-top: 1px solid var(--border); }
                .sl-team-legend-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
                @media (max-width: 700px) {
                    .sl-team-table th:nth-child(5), .sl-team-table td:nth-child(5) { display: none; }
                }

                /* Year filter */
                .sl-year-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                .sl-year-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
                .sl-year-btn { padding: 5px 13px; border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .sl-year-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .sl-year-btn.active { font-weight: 700; }

                /* Month cards */
                .sl-month-list { display: flex; flex-direction: column; gap: 10px; }
                .sl-month-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: border-color 0.18s; }
                .sl-month-card:hover { border-color: var(--wborder, var(--border-bright)); }
                .sl-month-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; cursor: pointer; gap: 12px; }
                .sl-month-left { flex: 1; min-width: 0; }
                .sl-month-name { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: block; margin-bottom: 6px; }
                .sl-month-chips { display: flex; gap: 5px; flex-wrap: wrap; }
                .sl-month-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; color: var(--text-secondary); }
                .sl-month-total { font-size: 1.1rem; font-weight: 800; }
                .sl-month-count { font-size: 0.72rem; color: var(--text-secondary); }

                /* Chips */
                .sl-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid; }
                .sl-chip-cash { background: rgba(16,185,129,0.1); color: #10b981; border-color: rgba(16,185,129,0.3); }
                .sl-chip-digital { background: rgba(99,102,241,0.1); color: #6366f1; border-color: rgba(99,102,241,0.3); }
                .sl-chip-deduct { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
                .sl-chip-advance { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.3); }

                /* Month entries */
                .sl-month-entries { border-top: 1px solid var(--border); display: flex; flex-direction: column; }
                .sl-entry { display: flex; align-items: flex-start; gap: 12px; padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); }
                .sl-entry:last-child { border-bottom: none; }
                .sl-entry-advance { background: rgba(245,158,11,0.03); }
                .sl-entry-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .sl-entry-info { flex: 1; min-width: 0; }
                .sl-entry-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .sl-entry-type { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); }
                .sl-entry-date { font-size: 0.72rem; color: var(--text-secondary); }
                .sl-entry-breakdown { display: flex; gap: 5px; flex-wrap: wrap; }
                .sl-entry-adv-amt { font-size: 0.82rem; font-weight: 700; }
                .sl-entry-notes { font-size: 0.74rem; color: var(--text-secondary); margin-top: 3px; font-style: italic; }
                .sl-entry-total { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); flex-shrink: 0; }

                /* Empty */
                .sl-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: var(--text-secondary); font-size: 0.88rem; }

                /* Form fields */
                .sl-type-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .sl-type-btn { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px; border: 1.5px solid var(--border); border-radius: 12px; background: none; color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .sl-type-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .sl-type-btn.active { font-weight: 700; }
                .sl-field { display: flex; flex-direction: column; gap: 6px; }
                .sl-field label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }
                .sl-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; color: var(--text-primary); font-size: 0.9rem; outline: none; transition: border-color 0.2s; font-family: inherit; width: 100%; box-sizing: border-box; }
                .sl-input:focus { border-color: var(--accent); }
                .sl-total-preview { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid; border-radius: 10px; font-size: 0.85rem; font-weight: 600; }
                .sl-save-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border: none; color: white; border-radius: 14px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
                .sl-save-btn:hover { transform: translateY(-1px); }
                .sl-save-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

                /* Payment records horizontal scroll on mobile */
                .sl-month-entries-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

                /* Mobile dialog: bottom sheet on ≤640px */
                @media (max-width: 640px) {
                    .sl-dialog-overlay { align-items: flex-end; padding: 0; }
                    .sl-dialog {
                        border-radius: 20px 20px 0 0;
                        max-width: 100% !important;
                        width: 100% !important;
                        max-height: 92vh;
                    }
                }

                /* Mobile form & layout adjustments */
                @media (max-width: 600px) {
                    .sl-type-row { grid-template-columns: 1fr; flex-wrap: wrap; }
                    .sl-worker-dropdown { width: 100%; }
                    .sl-dropdown-select { font-size: 16px !important; }
                    .sl-input { font-size: 16px !important; }
                    .sl-inline-form { padding: 14px; }
                    .sl-summary-header { flex-direction: column; align-items: flex-start; }
                    .sl-summary-header-right { margin-left: 0; width: 100%; }
                    .sl-month-header { flex-wrap: wrap; }
                    .sl-month-entries { overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    .section-header h1 { font-size: 1.4rem; }
                    .section-header p { font-size: 0.78rem; }
                }

                /* Collapse inline payment amount grid on mobile */
                @media (max-width: 600px) {
                    .sl-inline-form [style*="grid-template-columns: 1fr 1fr"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Salary;
