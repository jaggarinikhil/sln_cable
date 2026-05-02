import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    User, Plus, X, Trash2, Search, ArrowUpCircle, ArrowDownCircle, Wallet, Pencil, Calendar, Briefcase, MapPin
} from 'lucide-react';

const SYMBOL = { INR: '₹', USD: '$' };
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import CategoryDonut from '../components/CategoryDonut';
import { SkeletonRow } from '../components/Skeleton';
import AnimatedNumber from '../components/AnimatedNumber';

// Categories are direction-agnostic — the Money In / Money Out toggle handles
// whether it's an inflow or outflow (e.g. Property Money Out = bought; Money In = sold).
const CATEGORIES = [
    { key: 'all',         label: 'All',         color: 'var(--accent)',          icon: '✨' },
    { key: 'loan',        label: 'Loan',        color: '#3b82f6', icon: '🏦', sub: ['Home Loan', 'Car Loan', 'Education Loan', 'Personal Loan', 'Bank EMI', 'Friend Lent', 'Friend Borrowed', 'Credit Card', 'Other'] },
    { key: 'investment',  label: 'Investment',  color: '#10b981', icon: '📈', sub: ['Stocks', 'Mutual Fund', 'FD', 'Savings', 'Gold', 'Bonds', 'Crypto', 'Other'] },
    { key: 'chit',        label: 'Chit',        color: '#a855f7', icon: '🪙', sub: ['Monthly Pay', 'Pot Received', 'Other'] },
    { key: 'property',    label: 'Property',    color: '#8b5cf6', icon: '🏡', sub: ['Buy / Sell', 'Rent', 'Maintenance', 'Equipment', 'Tax', 'Other'] },
    { key: 'vehicle',     label: 'Vehicle',     color: '#ef4444', icon: '🚗', sub: ['EMI', 'Fuel', 'Service', 'Insurance', 'Repair', 'Other'] },
    { key: 'bills',       label: 'Bills',       color: '#eab308', icon: '💡', sub: ['Electricity', 'Water', 'Gas', 'Mobile', 'Internet', 'DTH', 'Subscription', 'Insurance', 'Tax', 'Other'] },
    { key: 'family',      label: 'Family',      color: '#ec4899', icon: '👨‍👩‍👧', sub: ['Wedding / Function', 'Medical', 'Education', 'Gift', 'Donation', 'Other'] },
    { key: 'lifestyle',   label: 'Lifestyle',   color: '#06b6d4', icon: '🛍️', sub: ['Groceries', 'Food', 'Shopping', 'Travel', 'Other'] },
    { key: 'income',      label: 'Income',      color: '#10b981', icon: '💰', sub: ['Salary', 'Business', 'Interest', 'Other'] },
    { key: 'other',       label: 'Other',       color: 'var(--text-secondary)', icon: '📌' },
];

// Suggest direction based on category + sub
const suggestType = (cat, sub) => {
    if (cat === 'income') return 'income';
    if (cat === 'loan' && (sub === 'Friend Borrowed')) return 'income';
    if (cat === 'loan' && sub === 'Friend Lent') return 'expense';
    if (cat === 'investment' && sub === 'Other') return null; // ambiguous
    return null; // don't override
};

// Should the Party field show for this category?
const partyConfig = (cat, sub, type) => {
    if (cat === 'loan' && (sub === 'Friend Lent' || sub === 'Friend Borrowed')) {
        return { show: true, label: "Friend's Name", placeholder: 'Who?' };
    }
    if (cat === 'family' && sub === 'Gift') {
        return { show: true, label: type === 'income' ? 'From' : 'To', placeholder: 'Person name' };
    }
    if (cat === 'property' && sub === 'Buy / Sell') {
        return { show: true, label: type === 'income' ? 'Buyer' : 'Seller', placeholder: 'Optional' };
    }
    if (cat === 'income' && sub === 'Salary') {
        return { show: true, label: 'Employer', placeholder: 'Company / Source' };
    }
    if (cat === 'income') return { show: true, label: 'Source', placeholder: 'Optional' };
    if (cat === 'other') return { show: true, label: type === 'income' ? 'From' : 'To', placeholder: 'Optional' };
    return { show: false };
};

const getCategory = (key) => CATEGORIES.find(c => c.key === key);

const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

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

const Personal = () => {
    const { personal, addPersonal, updatePersonal, deletePersonal, loading } = useData();
    const { user } = useAuth();
    const { success, error } = useToast();
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterMonth, setFilterMonth] = useState('all'); // 'all' or 'YYYY-MM'
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
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const blankForm = {
        type: 'expense',
        category: 'other',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        party: '',
        account: 'cash',
        notes: '',
        customCategory: '',
        customAccount: '',
        subCategory: '',
        currency: 'INR',
        location: '',
    };
    const [form, setForm] = useState(blankForm);

    const isOwner = user?.role?.toLowerCase() === 'owner';

    const handleAdd = async (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) {
            error('Please enter a valid amount');
            return;
        }

        const payload = {
            type: form.type,
            category: form.category,
            amount: amt,
            date: form.date,
            description: form.description.trim(),
            party: form.party.trim(),
            account: form.account,
            notes: form.notes.trim(),
            customCategory: form.category === 'other' ? form.customCategory.trim() : '',
            customAccount: form.account === 'other' ? form.customAccount.trim() : '',
            subCategory: getCategory(form.category)?.sub ? form.subCategory : '',
            currency: form.currency || 'INR',
            location: (form.location || '').trim(),
        };

        if (editingId) {
            await updatePersonal(editingId, payload);
            success('Entry updated');
        } else {
            await addPersonal({
                ...payload,
                addedBy: user?.name,
                createdAt: new Date().toISOString(),
            });
            success('Entry saved');
        }
        closeModal();
    };

    const handleEdit = (e, entry) => {
        e.stopPropagation();
        setForm({
            type: entry.type || 'expense',
            category: entry.category || 'other',
            amount: String(entry.amount || ''),
            date: entry.date || new Date().toISOString().slice(0, 10),
            description: entry.description || '',
            party: entry.party || '',
            account: entry.account || 'cash',
            notes: entry.notes || '',
            customCategory: entry.customCategory || '',
            customAccount: entry.customAccount || '',
            subCategory: entry.subCategory || '',
            currency: entry.currency || 'INR',
            location: entry.location || '',
        });
        setEditingId(entry.id);
        setIsAdding(true);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this entry?')) {
            await deletePersonal(id);
            success('Entry deleted');
        }
    };

    const closeModal = () => {
        setIsAdding(false);
        setEditingId(null);
        setForm(blankForm);
    };

    const activeEntries = personal.filter(p => !p.deleted).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    let filtered = activeEntries;
    if (filterCategory !== 'all') filtered = filtered.filter(p => p.category === filterCategory);
    if (filterType !== 'all') filtered = filtered.filter(p => p.type === filterType);
    if (filterAccount !== 'all') filtered = filtered.filter(p => (p.account || 'cash') === filterAccount);
    if (filterMonth !== 'all') filtered = filtered.filter(p => {
        const d = (p.date || p.createdAt || '').slice(0, 7);
        return d === filterMonth;
    });
    if (search) filtered = filtered.filter(p => (p.description || '').toLowerCase().includes(search.toLowerCase()) || (p.party || '').toLowerCase().includes(search.toLowerCase()));

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    React.useEffect(() => { setPage(1); }, [filterCategory, filterType, filterAccount, filterMonth, search]);

    const hasActiveFilter = filterCategory !== 'all' || filterType !== 'all' || filterAccount !== 'all' || filterMonth !== 'all' || search !== '';

    const filteredExpenses = filtered.filter(e => e.type === 'expense');
    const donutData = CATEGORIES
        .filter(c => c.key !== 'all')
        .map(c => ({
            label: c.label,
            value: filteredExpenses.filter(e => e.category === c.key).reduce((s, e) => s + (e.amount || 0), 0),
            color: c.color,
        }))
        .filter(d => d.value > 0);

    const isINR = (e) => (e.currency || 'INR') === 'INR';
    const isUSD = (e) => e.currency === 'USD';
    const totalIncome = activeEntries.filter(e => e.type === 'income' && isINR(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpense = activeEntries.filter(e => e.type === 'expense' && isINR(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const net = totalIncome - totalExpense;
    const totalIncomeUSD = activeEntries.filter(e => e.type === 'income' && isUSD(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenseUSD = activeEntries.filter(e => e.type === 'expense' && isUSD(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const netUSD = totalIncomeUSD - totalExpenseUSD;

    if (!isOwner) {
        return (
            <div className="personal-page" style={{ textAlign: 'center', paddingTop: 100 }}>
                <h2>Owner Only</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You don't have permission to view personal finances.</p>
            </div>
        );
    }

    return (
        <div className="personal-page">
            <div className="pp-header">
                <div>
                    <h1 className="pp-title">Personal Finance</h1>
                    <p className="pp-sub">Track outside cashflows and personal accounts</p>
                </div>
                <button className="pp-add-btn" onClick={() => setIsAdding(true)}>
                    <Plus size={18} /> New Entry
                </button>
            </div>

            <div className="pp-hero">
                <div className="pp-hero-net">
                    <span className="pp-hero-label">Net Balance</span>
                    <span className="pp-hero-value" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }}>
                        {net >= 0 ? '+' : '−'}<AnimatedNumber value={Math.abs(net)} prefix="₹" />
                    </span>
                    {(totalIncomeUSD > 0 || totalExpenseUSD > 0) && (
                        <span className="pp-hero-sub" style={{ color: netUSD >= 0 ? '#10b981' : '#ef4444' }}>
                            {netUSD >= 0 ? '+' : '−'}${Math.abs(netUSD).toLocaleString('en-US')} in USD
                        </span>
                    )}
                    <span className="pp-hero-sub">{activeEntries.length} entries logged</span>
                </div>
                <div className="pp-hero-split">
                    <div className="pp-hero-chip pp-hero-in">
                        <ArrowDownCircle size={18} />
                        <div>
                            <span className="pp-hero-chip-label">Money In</span>
                            <AnimatedNumber className="pp-hero-chip-val" value={totalIncome} prefix="₹" />
                        </div>
                    </div>
                    <div className="pp-hero-chip pp-hero-out">
                        <ArrowUpCircle size={18} />
                        <div>
                            <span className="pp-hero-chip-label">Money Out</span>
                            <AnimatedNumber className="pp-hero-chip-val" value={totalExpense} prefix="₹" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pp-filters">
                <div className="pp-toolbar-row">
                    <div className="pp-search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search entries or parties..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div
                        className={`pp-month-picker ${filterMonth !== 'all' ? 'active' : ''}`}
                        onClick={openMonthPicker}
                        role="button"
                        tabIndex={0}
                    >
                        <Calendar size={15} />
                        <span className="pp-month-text">
                            {filterMonth === 'all'
                                ? 'All months'
                                : new Date(filterMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </span>
                        <input
                            ref={monthInputRef}
                            type="month"
                            value={filterMonth === 'all' ? '' : filterMonth}
                            onChange={e => setFilterMonth(e.target.value || 'all')}
                            tabIndex={-1}
                            aria-label="Filter by month"
                        />
                        {filterMonth !== 'all' && (
                            <button
                                type="button"
                                className="pp-month-clear"
                                onClick={(e) => { e.stopPropagation(); setFilterMonth('all'); }}
                                title="Clear"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="pp-toolbar-row">
                    <select
                        className={`pp-dropdown ${filterType !== 'all' ? 'active' : ''}`}
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Money In</option>
                        <option value="expense">Money Out</option>
                    </select>
                    <select
                        className={`pp-dropdown ${filterCategory !== 'all' ? 'active' : ''}`}
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        {CATEGORIES.map(c => (
                            <option key={c.key} value={c.key}>{c.key === 'all' ? 'All Categories' : c.label}</option>
                        ))}
                    </select>
                    <select
                        className={`pp-dropdown ${filterAccount !== 'all' ? 'active' : ''}`}
                        value={filterAccount}
                        onChange={e => setFilterAccount(e.target.value)}
                    >
                        <option value="all">All Accounts</option>
                        {ACCOUNTS.map(a => (
                            <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {donutData.length > 0 && filteredExpenses.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <CategoryDonut data={donutData} label="Spending" />
                </div>
            )}

            {loading ? (
                <SkeletonRow count={5} height={72} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Briefcase}
                    title={hasActiveFilter ? 'No matches' : 'No entries yet'}
                    description="Track your personal income and expenses — chits, loans, gifts, and more — all in one place."
                    actionLabel="Add Your First Entry"
                    action={isOwner ? () => setIsAdding(true) : undefined}
                    accent="#6366f1"
                />
            ) : (
            <div className="pp-list">
                {/* paginated below */}
                {(
                    paginated.map(entry => {
                        const cat = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES.find(c => c.key === 'other');
                        const isIncome = entry.type === 'income';
                        const signColor = isIncome ? '#10b981' : '#ef4444';
                        const acctInfo = getAccount(entry.account || 'cash');

                        return (
                            <div key={entry.id} className="pp-card" style={{ borderLeftColor: signColor }}>
                                <div className="pp-card-icon" style={{ background: `${cat.color}15`, color: cat.color }}>
                                    {isIncome ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                </div>
                                <div className="pp-card-body">
                                    <h3 className="pp-card-desc">{entry.description || cat.label}</h3>
                                    <div className="pp-card-meta">
                                        <span className="pp-card-cat" style={{ color: cat.color }}>
                                            {cat.label}
                                            {entry.subCategory && <span style={{ opacity: 0.75, fontWeight: 500 }}> · {entry.subCategory}</span>}
                                        </span>
                                        {entry.party && (
                                            <>
                                                <span className="dot">·</span>
                                                <span className="pp-card-party">{isIncome ? 'from' : 'to'} {entry.party}</span>
                                            </>
                                        )}
                                        <span className="dot">·</span>
                                        <span className="pp-card-date">{new Date(entry.date || entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>

                                        <span className="pp-acct-badge" style={{ borderColor: acctInfo.color, color: acctInfo.color, background: `${acctInfo.color}12` }}>
                                            {acctInfo.short}
                                        </span>
                                    </div>
                                    {entry.notes && <div className="pp-card-notes">{entry.notes}</div>}
                                </div>
                                <div className="pp-card-right">
                                    <span className="pp-card-amt" style={{ color: signColor }}>
                                        {isIncome ? '+' : '−'}₹{(entry.amount || 0).toLocaleString('en-IN')}
                                    </span>
                                    <div className="pp-card-actions">
                                        <button className="pp-edit-btn" onClick={(e) => handleEdit(e, entry)} title="Edit">
                                            <Pencil size={14} />
                                        </button>
                                        <button className="pp-del-btn" onClick={(e) => handleDelete(e, entry.id)} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            )}

            {totalPages > 1 && (
                <div className="pp-pagination">
                    <button
                        className="pp-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                    >‹ Prev</button>
                    <span className="pp-page-info">Page {safePage} of {totalPages}</span>
                    <button
                        className="pp-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                    >Next ›</button>
                </div>
            )}

            {isAdding && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Entry' : 'Add Personal Entry'}</h2>
                            <button className="mc-close" onClick={closeModal}><X size={20} /></button>
                        </div>
                        <div className="modal-body modal-scrollable">
                            <div className="pp-type-toggle">
                                <button type="button" className={`tgl-btn ${form.type === 'income' ? 'inc' : ''}`} onClick={() => setForm({ ...form, type: 'income' })}>
                                    <ArrowDownCircle size={16} /> Money In
                                </button>
                                <button type="button" className={`tgl-btn ${form.type === 'expense' ? 'exp' : ''}`} onClick={() => setForm({ ...form, type: 'expense' })}>
                                    <ArrowUpCircle size={16} /> Money Out
                                </button>
                            </div>

                            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label>Amount (₹)</label>
                                    <input type="number" required min="1" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={form.category}
                                        onChange={e => {
                                            const newCat = e.target.value;
                                            const sugg = suggestType(newCat, '');
                                            setForm({ ...form, category: newCat, subCategory: '', type: sugg || form.type });
                                        }}
                                        className="pp-select"
                                    >
                                        {ADDABLE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                                    </select>
                                    {form.category === 'other' && (
                                        <input
                                            type="text"
                                            placeholder="Specify what this is (optional)"
                                            value={form.customCategory}
                                            onChange={e => setForm({ ...form, customCategory: e.target.value })}
                                            style={{ marginTop: 10 }}
                                        />
                                    )}
                                    {(() => {
                                        const cat = getCategory(form.category);
                                        if (!cat?.sub) return null;
                                        return (
                                            <select
                                                value={form.subCategory}
                                                onChange={e => {
                                                    const newSub = e.target.value;
                                                    const sugg = suggestType(form.category, newSub);
                                                    setForm({ ...form, subCategory: newSub, type: sugg || form.type });
                                                }}
                                                className="pp-select"
                                                style={{ marginTop: 10 }}
                                            >
                                                <option value="">— Sub-category (optional) —</option>
                                                {cat.sub.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        );
                                    })()}
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <input type="text" placeholder="e.g. Monthly chit, Loan repayment..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                {(() => {
                                    const pc = partyConfig(form.category, form.subCategory, form.type);
                                    if (!pc.show) return null;
                                    return (
                                        <div className="form-group">
                                            <label>{pc.label} <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                                            <input type="text" placeholder={pc.placeholder} value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} />
                                        </div>
                                    );
                                })()}
                                <div className="form-group">
                                    <label>Account</label>
                                    <select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} className="pp-select">
                                        {ACCOUNTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                                    </select>
                                    {form.account === 'other' && (
                                        <input
                                            type="text"
                                            placeholder="Specify the account (optional)"
                                            value={form.customAccount}
                                            onChange={e => setForm({ ...form, customAccount: e.target.value })}
                                            style={{ marginTop: 10 }}
                                        />
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optional)</label>
                                    <textarea placeholder="Extra details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="pp-textarea" />
                                </div>
                                <button type="submit" className="btn-primary" style={{ padding: '14px', width: '100%', marginTop: 8 }}>
                                    {editingId ? 'Update Entry' : 'Save Entry'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .personal-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
                .pp-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .pp-title { font-size: 1.8rem; font-weight: 800; background: linear-gradient(to right, var(--text-primary), #94a3b8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
                .pp-sub { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
                .pp-add-btn { display: flex; align-items: center; gap: 8px; background: var(--accent-gradient); border: none; padding: 10px 18px; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .pp-add-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
                
                .pp-stats { display: flex; gap: 16px; margin-bottom: 24px; }
                .pp-stat-card { flex: 1; background: var(--bg-card); padding: 18px; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
                .pp-stat-lbl { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-secondary); }
                .pp-stat-val { font-size: 1.4rem; font-weight: 800; }

                /* Hero card */
                .pp-hero {
                    background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05));
                    border: 1px solid rgba(99,102,241,0.2);
                    border-radius: 20px;
                    padding: 28px;
                    margin-bottom: 24px;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 24px;
                    align-items: center;
                }
                .pp-hero-net { display: flex; flex-direction: column; gap: 4px; }
                .pp-hero-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: var(--text-secondary); }
                .pp-hero-value { font-size: 2.2rem; font-weight: 900; line-height: 1.2; }
                .pp-hero-sub { font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px; }
                .pp-hero-split { display: flex; gap: 12px; }
                .pp-hero-chip { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; border: 1px solid; background: var(--bg-card); }
                .pp-hero-chip > div { display: flex; flex-direction: column; }
                .pp-hero-chip-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; color: var(--text-secondary); }
                .pp-hero-chip-val { font-size: 1rem; font-weight: 800; }
                .pp-hero-in { border-color: rgba(16,185,129,0.3); color: #10b981; }
                .pp-hero-in .pp-hero-chip-val { color: #10b981; }
                .pp-hero-out { border-color: rgba(239,68,68,0.3); color: #ef4444; }
                .pp-hero-out .pp-hero-chip-val { color: #ef4444; }
                @media (max-width: 720px) {
                    .pp-hero { grid-template-columns: 1fr; }
                    .pp-hero-split { flex-direction: column; }
                }

                .pp-filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
                .pp-toolbar-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
                .pp-search-box { display: flex; align-items: center; gap: 10px; background: var(--bg-input, var(--bg-card-light)); padding: 9px 14px; border-radius: 10px; border: 1px solid var(--border); flex: 1; min-width: 180px; }

                .pp-dropdown {
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
                .pp-dropdown:hover { border-color: rgba(99,102,241,0.4); color: var(--text-primary); }
                .pp-dropdown.active {
                    background-color: rgba(99,102,241,0.12);
                    border-color: var(--accent);
                    color: var(--accent);
                }
                .pp-dropdown option { background: var(--bg-card); color: var(--text-primary); }
                .pp-month-picker {
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
                .pp-month-picker:hover { border-color: rgba(99,102,241,0.4); color: var(--text-primary); }
                .pp-month-picker.active {
                    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08));
                    border-color: var(--accent);
                    color: var(--accent);
                    box-shadow: 0 0 0 1px rgba(99,102,241,0.15);
                }
                .pp-month-picker svg { flex-shrink: 0; pointer-events: none; }
                .pp-month-text { flex: 1; pointer-events: none; }
                .pp-month-picker input[type="month"] {
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
                    font-size: 16px;
                }
                .pp-month-clear {
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
                .pp-month-clear:hover { background: rgba(239,68,68,0.25); transform: scale(1.05); }
                .pp-search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                
                .pp-type-filters { display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
                .pp-type-btn { padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; border: 1px solid var(--border); background: var(--bg-subtle, var(--bg-card-light)); color: var(--text-secondary); cursor: pointer; }
                .pp-type-btn.active { background: var(--bg-input-hover, var(--bg-card-light)); color: var(--text-primary); border-color: var(--border-bright); }
                .pp-type-btn.income.active { color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.1); }
                .pp-type-btn.expense.active { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.1); }

                .pp-categories { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
                .pp-cat-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; margin-right: 4px; }
                .pp-cat-btn { padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border); background: var(--bg-subtle, var(--bg-card-light)); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
                .pp-cat-btn:hover { background: var(--bg-input-hover, var(--bg-card-light)); }
                
                .pp-list { display: flex; flex-direction: column; gap: 12px; }
                .pp-empty { text-align: center; padding: 40px; color: var(--text-secondary); font-size: 0.95rem; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border); }
                
                .pp-card { display: flex; align-items: center; gap: 16px; background: var(--bg-card); padding: 14px 18px; border-radius: 16px; border: 1px solid var(--border); border-left-width: 4px; transition: all 0.2s; }
                .pp-card:hover { border-right-color: var(--border-bright); border-top-color: var(--border-bright); border-bottom-color: var(--border-bright); }
                .pp-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pp-card-body { flex: 1; }
                .pp-card-desc { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; }
                .pp-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.75rem; }
                .pp-card-cat { font-weight: 700; }
                .pp-card-party { color: var(--text-secondary); font-style: italic; }
                .pp-card-date { color: var(--text-secondary); }
                .dot { color: var(--border); }
                .pp-acct-badge { border: 1px solid; padding: 1px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; margin-left: 4px; }
                .pp-card-notes { font-size: 0.72rem; color: var(--text-secondary); margin-top: 6px; font-style: italic; opacity: 0.8; }
                .pp-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
                .pp-card-amt { font-size: 1.15rem; font-weight: 800; }
                .pp-card-actions { display: flex; gap: 6px; }
                .pp-edit-btn { background: rgba(99,102,241,0.1); color: #6366f1; border: 1px solid rgba(99,102,241,0.2); padding: 6px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .pp-edit-btn:hover { background: rgba(99,102,241,0.2); transform: scale(1.05); }
                .pp-del-btn { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .pp-del-btn:hover { background: rgba(239,68,68,0.2); transform: scale(1.05); }
                .pp-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; }
                .pp-page-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .pp-page-btn:hover:not(:disabled) { background: rgba(99,102,241,0.1); border-color: var(--accent); color: var(--accent); }
                .pp-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .pp-page-info { font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-content { background: var(--bg-card); width: 90%; max-width: 480px; max-height: 90vh; border-radius: 20px; border: 1px solid var(--border); display: flex; flex-direction: column; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle, var(--bg-card-light)); }
                .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .mc-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; transition: color 0.2s; }
                .mc-close:hover { color: var(--text-primary); }
                .modal-scrollable { overflow-y: auto; padding: 20px; }
                
                .pp-type-toggle { display: flex; gap: 10px; margin-bottom: 20px; }
                .tgl-btn { flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px; padding: 12px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text-secondary); border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .tgl-btn.inc { border-color: #10b981; background: rgba(16,185,129,0.15); color: #10b981; }
                .tgl-btn.exp { border-color: #ef4444; background: rgba(239,68,68,0.15); color: #ef4444; }

                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
                .form-group input, .pp-select, .pp-textarea { background: var(--bg-input, var(--bg-card-light)); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: var(--text-primary); font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; }
                .form-group input:focus, .pp-select:focus, .pp-textarea:focus { border-color: var(--accent); outline: none; }
                .pp-select { cursor: pointer; }
                .pp-select option { background: var(--bg-card); color: var(--text-primary); }
                .pp-textarea { resize: vertical; min-height: 60px; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 720px) {
                    .personal-page { padding: 12px; }
                    .pp-header { flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 16px; }
                    .pp-title { font-size: 1.4rem; }
                    .pp-sub { font-size: 0.8rem; }
                    .pp-add-btn { width: 100%; justify-content: center; }

                    /* Hero card — stack vertically, tighten */
                    .pp-hero { padding: 16px; gap: 12px; }
                    .pp-hero-value { font-size: 1.6rem; }
                    .pp-hero-label { font-size: 0.65rem; }
                    .pp-hero-sub { font-size: 0.7rem; }
                    .pp-hero-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                    .pp-hero-chip { padding: 8px 10px; gap: 6px; }
                    .pp-hero-chip-label { font-size: 0.6rem; }
                    .pp-hero-chip-val { font-size: 0.85rem; }

                    /* Filter row — fully responsive grid */
                    .pp-filters { padding: 10px; gap: 10px; border-radius: 12px; }
                    .pp-toolbar-row { gap: 8px; }
                    .pp-toolbar-row > * { flex: 1 1 calc(50% - 4px); min-width: 0; }
                    .pp-search-box { flex: 1 1 100%; padding: 8px 12px; min-width: unset; }
                    .pp-search-box input { font-size: 0.9rem; }
                    .pp-dropdown { font-size: 0.8rem; padding: 8px 10px; padding-right: 26px; min-width: 0; background-position: right 8px center; }
                    .pp-month-picker { padding: 8px 10px; min-width: 0; font-size: 0.8rem; gap: 6px; flex: 1 1 100%; }

                    /* Entry cards */
                    .pp-card { padding: 12px; gap: 10px; border-radius: 12px; }
                    .pp-card-icon { width: 36px; height: 36px; flex-shrink: 0; }
                    .pp-card-body { min-width: 0; flex: 1; }
                    .pp-card-desc { font-size: 0.88rem; }
                    .pp-card-amt { font-size: 0.95rem; white-space: nowrap; }
                    .pp-card-meta { font-size: 0.68rem; gap: 4px; flex-wrap: wrap; }
                    .pp-card-right { gap: 6px; align-items: flex-end; flex-shrink: 0; }
                    .pp-card-actions { gap: 4px; }
                    .pp-edit-btn, .pp-del-btn { padding: 5px; }

                    /* Lifetime totals */
                    .pp-stats { flex-direction: column; gap: 8px; margin-bottom: 16px; }

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
                    .modal-body, .modal-scrollable { padding: 14px 16px 24px; flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }

                    /* Type toggle */
                    .pp-type-toggle { gap: 8px; margin-bottom: 14px; position: sticky; top: 0; background: var(--bg-card); padding-top: 4px; padding-bottom: 8px; z-index: 5; }
                    .tgl-btn { padding: 11px 8px; font-size: 0.85rem; gap: 6px; border-radius: 10px; }

                    /* Form fields */
                    .form-group { gap: 5px; }
                    .form-group label { font-size: 0.7rem; }
                    .form-group input, .pp-select, .pp-textarea { padding: 11px 12px; font-size: 16px; border-radius: 10px; }
                    .pp-textarea { min-height: 60px; }

                    /* Save button: natural placement, no extra space */
                    .modal-body form button[type="submit"], .modal-scrollable form button[type="submit"] { margin-top: 8px !important; }

                    /* Pagination */
                    .pp-pagination { gap: 8px; }
                    .pp-page-btn { padding: 7px 11px; font-size: 0.78rem; }
                    .pp-page-info { font-size: 0.78rem; }
                }
                @media (max-width: 380px) {
                    .pp-hero-split { grid-template-columns: 1fr; }
                    .pp-toolbar-row > * { flex: 1 1 100%; }
                }
            `}</style>
        </div>
    );
};

export default Personal;
