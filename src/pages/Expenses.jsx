import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Wallet, Plus, X, Trash2, Search, Pencil, Calendar, Receipt } from 'lucide-react';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import CategoryDonut from '../components/CategoryDonut';
import { SkeletonRow } from '../components/Skeleton';
import AnimatedNumber from '../components/AnimatedNumber';

const CATEGORIES = [
    { key: 'all',               label: 'All',               color: 'var(--accent)' },
    { key: 'worker_salary',     label: 'Worker Salary',     color: '#10b981', auto: true },
    { key: 'equipment',         label: 'Equipment',         color: '#a855f7' },
    { key: 'utilities',         label: 'Utilities',         color: '#f59e0b' },
    { key: 'partner_lease',     label: 'Partner Lease',     color: '#06b6d4' },
    { key: 'provider_recharge', label: 'Provider Recharge', color: '#3b82f6' },
    { key: 'maintenance',       label: 'Maint/Repairs',     color: '#8b5cf6' },
    { key: 'misc',              label: 'Misc / Other',      color: '#ec4899' },
];
const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all' && !c.auto);

const ACCOUNTS = [
    { key: 'cash',          label: 'Cash',             short: 'Cash',  color: '#10b981' },
    { key: 'amma_canara',   label: "Amma's Canara",    short: 'A·CB',  color: '#f59e0b' },
    { key: 'amma_baroda',   label: "Amma's Baroda",    short: 'A·BB',  color: '#ec4899' },
    { key: 'nikhil_canara', label: "Nikhil's Canara",  short: 'N·CB',  color: '#06b6d4' },
    { key: 'nikhil_baroda', label: "Nikhil's Baroda",  short: 'N·BB',  color: '#a855f7' },
    { key: 'akhil_canara',  label: "Akhil's Canara",   short: 'Ak·CB', color: '#3b82f6' },
    { key: 'akhil_axis',    label: "Akhil's Axis",     short: 'Ak·AX', color: '#6366f1' },
    { key: 'other',         label: 'Other',            short: 'Other', color: '#94a3b8' },
];
const getAccount = (key) => ACCOUNTS.find(a => a.key === key) || ACCOUNTS[0];

const Expenses = () => {
    const { expenses, salary, addExpense, updateExpense, deleteExpense, updateSalary, deleteSalary, loading } = useData();
    const { user } = useAuth();
    const { success, error } = useToast();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' or 'YYYY-MM'
    const monthInputRef = useRef(null);
    const openMonthPicker = () => {
        const el = monthInputRef.current;
        if (!el) return;
        try { el.showPicker?.(); } catch {}
        el.focus();
        el.click();
    };
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingSource, setEditingSource] = useState('manual'); // 'manual' | 'salary'
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const [form, setForm] = useState({ description: '', amount: '', category: 'misc', account: 'cash', customCategory: '', customAccount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

    const isOwner = user?.role?.toLowerCase() === 'owner';

    const resetForm = () => setForm({ description: '', amount: '', category: 'misc', account: 'cash', customCategory: '', customAccount: '', date: new Date().toISOString().slice(0, 10), notes: '' });

    const handleAdd = async (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) {
            error('Please enter a valid amount');
            return;
        }

        const payload = {
            description: form.description,
            amount: amt,
            category: form.category,
            account: form.account,
            customCategory: form.customCategory.trim(),
            customAccount: form.account === 'other' ? form.customAccount.trim() : '',
            date: form.date,
            notes: form.notes.trim(),
        };
        try {
            if (editingId && editingSource === 'salary') {
                // Round-trip back to salary record
                const salaryId = editingId.replace(/^salary_/, '');
                const orig = (salary || []).find(s => s.id === salaryId) || {};
                const oldCash = Number(orig.cashAmount) || 0;
                const oldDigital = Number(orig.digitalAmount) || 0;
                const oldDed = Number(orig.advanceDeduction) || 0;
                const oldTotal = oldCash + oldDigital + oldDed;
                // Distribute new amount preserving old ratios; if no ratio, dump into cash
                let newCash = amt, newDigital = 0, newDed = 0;
                if (oldTotal > 0) {
                    newCash = Math.round((oldCash / oldTotal) * amt);
                    newDigital = Math.round((oldDigital / oldTotal) * amt);
                    newDed = amt - newCash - newDigital;
                }
                await updateSalary(salaryId, {
                    cashAmount: newCash,
                    digitalAmount: newDigital,
                    advanceDeduction: newDed,
                    paymentDate: form.date,
                    account: form.account,
                    notes: form.notes.trim(),
                });
            } else if (editingId) {
                await updateExpense(editingId, payload);
            } else {
                await addExpense({
                    ...payload,
                    createdBy: user?.name,
                    createdAt: new Date().toISOString(),
                });
            }
            success(editingId ? 'Expense updated' : 'Expense added');
            setIsAdding(false);
            setEditingId(null);
            setEditingSource('manual');
            resetForm();
        } catch (err) {
            error('Failed to save expense');
        }
    };

    const handleEdit = (e, exp) => {
        e.stopPropagation();
        setForm({
            description: exp.description || '',
            amount: String(exp.amount || ''),
            category: exp.category || 'misc',
            account: exp.account || 'cash',
            customCategory: exp.customCategory || '',
            customAccount: exp.customAccount || '',
            date: exp.date || (exp.createdAt ? exp.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            notes: exp.notes || '',
        });
        setEditingId(exp.id);
        setEditingSource(exp.source === 'salary' ? 'salary' : 'manual');
        setIsAdding(true);
    };

    const handleDelete = async (e, exp) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            if (exp.source === 'salary') {
                const salaryId = String(exp.id).replace(/^salary_/, '');
                await deleteSalary(salaryId);
            } else {
                await deleteExpense(exp.id);
            }
            success('Expense deleted');
        } catch (err) {
            error('Failed to delete expense');
        }
    };

    const closeModal = () => {
        setIsAdding(false);
        setEditingId(null);
        resetForm();
    };

    const manualExpenses = expenses.filter(e => !e.deleted).map(e => ({ ...e, source: 'manual' }));
    const extraLabels = { bonus: 'Bonus', fuel: 'Fuel', vehicle_maintenance: 'Vehicle Maintenance', other: 'Other' };
    const salaryExpenses = (salary || [])
        .filter(s => !s.deleted && (s.type === 'salary' || s.type === 'extra'))
        .map(s => {
            const amt = (s.cashAmount || 0) + (s.digitalAmount || 0) + (s.advanceDeduction || 0);
            const isExtra = s.type === 'extra';
            const label = isExtra ? (extraLabels[s.extraType] || 'Extra') : '';
            return {
                id: `salary_${s.id}`,
                description: isExtra ? `${s.workerName || 'Worker'} — ${label}` : (s.workerName || 'Worker'),
                amount: amt,
                category: 'worker_salary',
                account: s.account || 'cash',
                date: s.paymentDate || (s.createdAt ? s.createdAt.slice(0, 10) : ''),
                createdAt: s.createdAt || s.paymentDate,
                createdBy: s.addedBy,
                notes: s.month ? `Month: ${s.month}${s.notes ? ' · ' + s.notes : ''}` : (s.notes || ''),
                source: 'salary',
            };
        })
        .filter(s => s.amount > 0);
    const activeExpenses = [...manualExpenses, ...salaryExpenses]
        .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));

    let filtered = activeExpenses;
    if (selectedCategory !== 'all') filtered = filtered.filter(e => e.category === selectedCategory);
    if (selectedAccount !== 'all') filtered = filtered.filter(e => (e.account || 'cash') === selectedAccount);
    if (selectedMonth !== 'all') filtered = filtered.filter(e => {
        const d = (e.date || e.createdAt || '').slice(0, 7);
        return d === selectedMonth;
    });
    if (search) filtered = filtered.filter(e => (e.description || '').toLowerCase().includes(search.toLowerCase()));

    const totalFiltered = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalOverall = activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    React.useEffect(() => { setPage(1); }, [selectedCategory, selectedAccount, selectedMonth, search]);

    const hasFilter = selectedCategory !== 'all' || selectedAccount !== 'all' || selectedMonth !== 'all' || !!search;
    const donutData = CATEGORIES
        .filter(c => c.key !== 'all')
        .map(c => ({
            key: c.key,
            label: c.label,
            color: c.color,
            value: filtered.filter(e => e.category === c.key).reduce((s, e) => s + (e.amount || 0), 0),
        }))
        .filter(d => d.value > 0);
    const donutTotal = donutData.reduce((s, d) => s + d.value, 0);

    return (
        <div className="expenses-page">
            <div className="ep-header">
                <div>
                    <h1 className="ep-title">Business Expenses</h1>
                    <p className="ep-sub">Track and manage business expenses</p>
                </div>
                {isOwner && (
                    <button className="ep-add-btn" onClick={() => setIsAdding(true)}>
                        <Plus size={18} /> New Expense
                    </button>
                )}
            </div>

            <div className="ep-stats">
                <div className="ep-stat-card total">
                    <span className="ep-stat-lbl">Total Expenses</span>
                    <AnimatedNumber className="ep-stat-val" value={totalOverall} prefix="₹" />
                </div>
                <div className="ep-stat-card filtered">
                    <span className="ep-stat-lbl">Filtered Expenses</span>
                    <AnimatedNumber className="ep-stat-val" value={totalFiltered} prefix="₹" />
                </div>
            </div>

            <div className="ep-filters">
                <div className="ep-toolbar-row">
                    <div className="ep-search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search expenses..."
                            value={search}
                            onChange={d => setSearch(d.target.value)}
                        />
                    </div>
                    <select
                        className={`ep-dropdown ${selectedCategory !== 'all' ? 'active' : ''}`}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        {CATEGORIES.map(c => (
                            <option key={c.key} value={c.key}>{c.key === 'all' ? 'All Categories' : c.label}</option>
                        ))}
                    </select>
                    <select
                        className={`ep-dropdown ${selectedAccount !== 'all' ? 'active' : ''}`}
                        value={selectedAccount}
                        onChange={e => setSelectedAccount(e.target.value)}
                    >
                        <option value="all">All Accounts</option>
                        {ACCOUNTS.map(a => (
                            <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                    </select>
                    <div
                        className={`ep-month-picker ${selectedMonth !== 'all' ? 'active' : ''}`}
                        onClick={openMonthPicker}
                        role="button"
                        tabIndex={0}
                    >
                        <Calendar size={15} />
                        <span className="ep-month-text">
                            {selectedMonth === 'all'
                                ? 'All months'
                                : new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                        <input
                            ref={monthInputRef}
                            type="month"
                            value={selectedMonth === 'all' ? '' : selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value || 'all')}
                            tabIndex={-1}
                            aria-label="Filter by month"
                        />
                        {selectedMonth !== 'all' && (
                            <button
                                type="button"
                                className="ep-month-clear"
                                onClick={(e) => { e.stopPropagation(); setSelectedMonth('all'); }}
                                title="Clear"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {filtered.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <CategoryDonut data={donutData} total={donutTotal} label="This view" />
                </div>
            )}

            <div className="ep-list">
                {loading ? (
                    <SkeletonRow count={5} height={72} />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title={hasFilter ? 'No matches' : 'No expenses yet'}
                        description="Track every business expense — from worker salaries to utilities — in one place."
                        actionLabel={isOwner ? 'Add Expense' : undefined}
                        action={isOwner ? () => setIsAdding(true) : undefined}
                        accent="#a855f7"
                    />
                ) : (
                    paginated.map(exp => {
                        const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES.find(c => c.key === 'misc');
                        return (
                            <div key={exp.id} className="ep-card">
                                <div className="ep-card-icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                                    <Wallet size={20} />
                                </div>
                                <div className="ep-card-body">
                                    <h3 className="ep-card-desc">
                                        {exp.description}
                                        {exp.customCategory ? <span className="ep-card-custom"> ({exp.customCategory})</span> : null}
                                    </h3>
                                    <div className="ep-card-meta">
                                        <span className="ep-card-cat" style={{ color: cat.color }}>{cat.label}</span>
                                        {exp.account ? (() => {
                                            const acc = getAccount(exp.account);
                                            return (
                                                <span className="ep-acct-badge" style={{ borderColor: `${acc.color}55`, background: `${acc.color}15`, color: acc.color }}>
                                                    {exp.customAccount || acc.short}
                                                </span>
                                            );
                                        })() : null}
                                        <span className="ep-card-date">{new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    {exp.createdBy && <div className="ep-card-user">By: {exp.createdBy}</div>}
                                </div>
                                <div className="ep-card-right">
                                    <span className="ep-card-amt">₹{(exp.amount || 0).toLocaleString('en-IN')}</span>
                                    {exp.source === 'salary' && (
                                        <span className="ep-auto-tag" title="Auto-logged from Salary screen">AUTO</span>
                                    )}
                                    {isOwner && (
                                        <div className="ep-card-actions">
                                            <button className="ep-edit-btn" onClick={(e) => handleEdit(e, exp)} title="Edit">
                                                <Pencil size={14} />
                                            </button>
                                            <button className="ep-del-btn" onClick={(e) => handleDelete(e, exp)} title="Delete">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {totalPages > 1 && (
                <div className="ep-pagination">
                    <button
                        className="ep-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                    >‹ Prev</button>
                    <span className="ep-page-info">Page {safePage} of {totalPages}</span>
                    <button
                        className="ep-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                    >Next ›</button>
                </div>
            )}

            {isAdding && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
                            <button className="mc-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form className="modal-body" onSubmit={handleAdd}>
                            <div className="form-group">
                                <label>Description (optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Purchased 100m wire"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="0"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <div className="cat-grid">
                                    {ADDABLE_CATEGORIES.map(c => (
                                        <div
                                            key={c.key}
                                            className={`cat-opt ${form.category === c.key ? 'active' : ''}`}
                                            onClick={() => setForm(f => ({ ...f, category: c.key }))}
                                            style={form.category === c.key ? { borderColor: c.color, background: `${c.color}15`, color: c.color } : {}}
                                        >
                                            {c.label}
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder={
                                        form.category === 'equipment' ? 'e.g. Set-top box, wires, nodes…' :
                                        form.category === 'utilities' ? 'e.g. Electricity, Water…' :
                                        form.category === 'partner_lease' ? 'Partner name' :
                                        form.category === 'provider_recharge' ? 'Provider name' :
                                        form.category === 'maintenance' ? 'What was repaired?' :
                                        'Add details (optional)'
                                    }
                                    value={form.customCategory}
                                    onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))}
                                    style={{ marginTop: 10 }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Account / Paid From</label>
                                <select
                                    value={form.account}
                                    onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
                                    className="ep-select"
                                >
                                    {ACCOUNTS.map(a => (
                                        <option key={a.key} value={a.key}>{a.label}</option>
                                    ))}
                                </select>
                                {form.account === 'other' && (
                                    <input
                                        type="text"
                                        placeholder="Specify the account (optional)"
                                        value={form.customAccount}
                                        onChange={e => setForm(f => ({ ...f, customAccount: e.target.value }))}
                                        style={{ marginTop: 10 }}
                                    />
                                )}
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Any extra details…"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: 10, width: '100%', padding: '12px' }}>
                                {editingId ? 'Update Expense' : 'Save Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .expenses-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
                .ep-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .ep-title { font-size: 1.8rem; font-weight: 800; background: linear-gradient(to right, var(--text-primary), #94a3b8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
                .ep-sub { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
                .ep-add-btn { display: flex; align-items: center; gap: 8px; background: var(--accent-gradient); border: none; padding: 10px 18px; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .ep-add-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
                
                .ep-stats { display: flex; gap: 16px; margin-bottom: 24px; }
                .ep-stat-card { flex: 1; padding: 20px; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
                .ep-stat-card.total { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02)); border-color: rgba(99,102,241,0.2); }
                .ep-stat-card.filtered { background: var(--bg-subtle, var(--bg-card-light)); }
                .ep-stat-lbl { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: var(--text-secondary); }
                .ep-stat-val { font-size: 1.6rem; font-weight: 800; }
                .ep-stat-card.total .ep-stat-val { color: var(--accent); }

                .ep-filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
                .ep-toolbar-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                .ep-search-box { display: flex; align-items: center; gap: 10px; background: var(--bg-input, var(--bg-card-light)); padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); flex: 1; min-width: 180px; }

                .ep-dropdown {
                    background: var(--bg-subtle, var(--bg-card-light));
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    border-radius: 10px;
                    padding: 9px 12px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    outline: none;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    appearance: none;
                    -webkit-appearance: none;
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    padding-right: 30px;
                    min-width: 140px;
                }
                .ep-dropdown:hover { border-color: rgba(99,102,241,0.4); color: var(--text-primary); }
                .ep-dropdown.active {
                    background-color: rgba(99,102,241,0.12);
                    border-color: var(--accent);
                    color: var(--accent);
                }
                .ep-dropdown option { background: var(--bg-card); color: var(--text-primary); }
                .ep-month-picker {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 12px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: var(--bg-subtle, var(--bg-card-light));
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    min-width: 170px;
                    font-size: 0.88rem;
                    font-weight: 600;
                }
                .ep-month-picker:hover { border-color: rgba(99,102,241,0.4); color: var(--text-primary); }
                .ep-month-picker.active {
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08));
                    border-color: var(--accent);
                    color: var(--accent);
                    box-shadow: 0 0 0 1px rgba(99,102,241,0.15);
                }
                .ep-month-picker svg { flex-shrink: 0; pointer-events: none; }
                .ep-month-text { flex: 1; pointer-events: none; }
                .ep-month-picker input[type="month"] {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                    color-scheme: dark;
                    width: 100%;
                    height: 100%;
                    border: none;
                    padding: 0;
                    margin: 0;
                    font-size: 16px; /* prevents iOS zoom */
                }
                .ep-month-clear {
                    position: relative;
                    z-index: 2;
                    background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.3);
                    color: #ef4444;
                    border-radius: 6px;
                    width: 22px; height: 22px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .ep-month-clear:hover { background: rgba(239,68,68,0.25); transform: scale(1.05); }
                .ep-search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                
                .ep-categories { display: flex; flex-wrap: wrap; gap: 8px; }
                .ep-cat-btn { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg-subtle, var(--bg-card-light)); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
                .ep-cat-btn:hover { background: var(--bg-input-hover, var(--bg-card-light)); }
                
                .ep-list { display: flex; flex-direction: column; gap: 12px; }
                .ep-empty { text-align: center; padding: 40px; color: var(--text-secondary); font-size: 0.95rem; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border); }
                
                .ep-card { display: flex; align-items: center; gap: 16px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); transition: all 0.2s; }
                .ep-card:hover { border-color: var(--border-bright); }
                .ep-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .ep-card-body { flex: 1; }
                .ep-card-desc { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; }
                .ep-card-meta { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; }
                .ep-card-cat { font-weight: 700; background: var(--bg-subtle, var(--bg-card-light)); padding: 2px 8px; border-radius: 6px; }
                .ep-card-date { color: var(--text-secondary); }
                .ep-card-user { font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; font-style: italic; }
                .ep-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
                .ep-card-amt { font-size: 1.1rem; font-weight: 800; }
                .ep-card-actions { display: flex; gap: 6px; }
                .ep-auto-tag { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.6px; color: #10b981; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 2px 8px; border-radius: 6px; }
                .ep-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; }
                .ep-page-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .ep-page-btn:hover:not(:disabled) { background: rgba(99,102,241,0.1); border-color: var(--accent); color: var(--accent); }
                .ep-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .ep-page-info { font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; }
                .ep-edit-btn { background: rgba(99,102,241,0.1); color: #6366f1; border: 1px solid rgba(99,102,241,0.2); padding: 6px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .ep-edit-btn:hover { background: rgba(99,102,241,0.2); transform: scale(1.05); }
                .ep-del-btn { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .ep-del-btn:hover { background: rgba(239,68,68,0.2); transform: scale(1.05); }
                .ep-acct-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid; letter-spacing: 0.4px; }
                .ep-card-custom { font-weight: 500; color: var(--text-secondary); font-size: 0.9rem; font-style: italic; }
                .ep-select { background: var(--bg-input, var(--bg-card-light)); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: var(--text-primary); font-size: 0.95rem; }
                .form-group textarea { background: var(--bg-input, var(--bg-card-light)); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: var(--text-primary); font-size: 0.95rem; font-family: inherit; resize: vertical; }
                .form-group textarea:focus { border-color: var(--accent); outline: none; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-content { background: var(--bg-card); width: 90%; max-width: 480px; max-height: 90vh; display: flex; flex-direction: column; border-radius: 20px; border: 1px solid var(--border); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle, var(--bg-card-light)); }
                .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .mc-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; transition: color 0.2s; }
                .mc-close:hover { color: var(--text-primary); }
                .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
                .form-group input { background: var(--bg-input, var(--bg-card-light)); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: var(--text-primary); font-size: 0.95rem; transition: border-color 0.2s; }
                .form-group input:focus { border-color: var(--accent); outline: none; }
                .cat-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                .cat-opt { padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; text-align: center; color: var(--text-secondary); transition: all 0.2s; }
                .cat-opt:hover { background: var(--bg-subtle, var(--bg-card-light)); }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 720px) {
                    .expenses-page { padding: 12px; }
                    .ep-header { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 16px; }
                    .ep-title { font-size: 1.4rem; }
                    .ep-sub { font-size: 0.8rem; }
                    .ep-add-btn { width: 100%; justify-content: center; }
                    .ep-stats { flex-direction: column; gap: 8px; margin-bottom: 16px; }
                    .ep-stat-card { padding: 14px; }
                    .ep-stat-val { font-size: 1.3rem; }

                    /* Filter row */
                    .ep-filters { padding: 10px; gap: 10px; border-radius: 12px; }
                    .ep-toolbar-row { gap: 8px; }
                    .ep-toolbar-row > * { flex: 1 1 calc(50% - 4px); min-width: 0; }
                    .ep-search-box { flex: 1 1 100%; padding: 8px 12px; min-width: unset; }
                    .ep-search-box input { font-size: 0.9rem; }
                    .ep-dropdown { font-size: 0.8rem; padding: 8px 10px; padding-right: 26px; min-width: 0; background-position: right 8px center; }
                    .ep-month-picker { padding: 8px 10px; min-width: 0; font-size: 0.8rem; gap: 6px; flex: 1 1 100%; }

                    /* Cards */
                    .ep-card { padding: 12px; gap: 10px; border-radius: 12px; }
                    .ep-card-icon { width: 36px; height: 36px; flex-shrink: 0; }
                    .ep-card-body { min-width: 0; flex: 1; }
                    .ep-card-desc { font-size: 0.88rem; }
                    .ep-card-amt { font-size: 0.95rem; white-space: nowrap; }
                    .ep-card-meta { font-size: 0.7rem; gap: 6px; flex-wrap: wrap; }
                    .ep-card-actions { gap: 4px; }
                    .ep-edit-btn, .ep-del-btn { padding: 5px; }

                    /* Modal: full-screen sheet */
                    .modal-overlay { align-items: stretch; justify-content: stretch; }
                    .modal-content {
                        width: 100%; max-width: 100%;
                        height: 100dvh; max-height: 100dvh;
                        border-radius: 0;
                        display: flex; flex-direction: column;
                        animation: none;
                    }
                    .modal-header { padding: 14px 16px; flex-shrink: 0; position: sticky; top: 0; background: var(--bg-card); z-index: 10; border-bottom: 1px solid var(--border); }
                    .modal-header h2 { font-size: 1.05rem; }
                    .modal-body { padding: 14px 16px 12px; flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; gap: 12px; }

                    /* Form fields */
                    .form-group { gap: 5px; }
                    .form-group label { font-size: 0.72rem; }
                    .form-group input, .form-group textarea, .ep-select { padding: 11px 12px; font-size: 16px; border-radius: 10px; }
                    .cat-grid { gap: 6px; }
                    .cat-opt { font-size: 0.78rem; padding: 8px 10px; }

                    /* Submit button: regular, just the natural form bottom — no extra space */
                    .modal-body form { display: flex; flex-direction: column; gap: 12px; }
                    .modal-body button[type="submit"] { margin-top: 4px !important; }
                }
                @media (max-width: 380px) {
                    .ep-toolbar-row > * { flex: 1 1 100%; }
                }
            `}</style>
        </div>
    );
};

export default Expenses;
