import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    User, Plus, X, Trash2, Search, ArrowUpCircle, ArrowDownCircle, Wallet
} from 'lucide-react';

const CATEGORIES = [
    { key: 'all', label: 'All', color: 'var(--accent)' },
    { key: 'chit', label: 'Chit', color: '#a855f7' },
    { key: 'loan_taken', label: 'Loan Taken (bank)', color: '#10b981' },
    { key: 'loan_emi', label: 'Loan EMI', color: '#ef4444' },
    { key: 'rent_paid', label: 'Rent Paid', color: '#ef4444' },
    { key: 'rent_received', label: 'Rent In', color: '#10b981' },
    { key: 'medical', label: 'Medical', color: '#ef4444' },
    { key: 'vehicle_emi', label: 'Vehicle EMI', color: '#ef4444' },
    { key: 'salary_in', label: 'Salary In', color: '#10b981' },
    { key: 'groceries', label: 'Groceries', color: '#10b981' },
    { key: 'travel', label: 'Travel', color: '#06b6d4' },
    { key: 'repair', label: 'Repair', color: '#eab308' },
    { key: 'shopping', label: 'Shopping', color: '#a855f7' },
    { key: 'other', label: 'Other', color: 'var(--text-secondary)' },
];

const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all');

const ACCOUNTS = [
    { key: 'cash', label: 'Cash', short: 'Cash', color: '#10b981' },
    { key: 'bank_main', label: 'Main Bank Account', short: 'Main', color: '#3b82f6' },
    { key: 'bank_secondary', label: 'Secondary Bank Account', short: 'Sec', color: '#8b5cf6' },
    { key: 'credit_card', label: 'Credit Card', short: 'CC', color: '#ef4444' },
    { key: 'ewallet', label: 'PhonePe / GPay (Wallet)', short: 'Wallet', color: '#06b6d4' },
];
const getAccount = (key) => ACCOUNTS.find(a => a.key === key) || ACCOUNTS[0];

const Personal = () => {
    const { personal, addPersonal, deletePersonal } = useData();
    const { user } = useAuth();
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [form, setForm] = useState({
        type: 'expense',
        category: 'other',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: '',
        party: '',
        account: 'cash',
        notes: ''
    });

    const isOwner = user?.role?.toLowerCase() === 'owner';

    const handleAdd = async (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (isNaN(amt) || amt <= 0) return;

        await addPersonal({
            ...form,
            amount: amt,
            description: form.description.trim(),
            party: form.party.trim(),
            notes: form.notes.trim(),
            addedBy: user?.name,
            createdAt: new Date().toISOString(),
        });
        setIsAdding(false);
        setForm({ ...form, description: '', amount: '', party: '', notes: '' });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this entry?')) {
            await deletePersonal(id);
        }
    };

    const activeEntries = personal.filter(p => !p.deleted).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    let filtered = activeEntries;
    if (filterCategory !== 'all') filtered = filtered.filter(p => p.category === filterCategory);
    if (filterType !== 'all') filtered = filtered.filter(p => p.type === filterType);
    if (search) filtered = filtered.filter(p => (p.description || '').toLowerCase().includes(search.toLowerCase()) || (p.party || '').toLowerCase().includes(search.toLowerCase()));

    const totalIncome = activeEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpense = activeEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0);
    const net = totalIncome - totalExpense;

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

            <div className="pp-stats">
                <div className="pp-stat-card">
                    <span className="pp-stat-lbl">Total Built</span>
                    <span className="pp-stat-val" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }}>
                        {net >= 0 ? '+' : '−'}₹{Math.abs(net).toLocaleString('en-IN')}
                    </span>
                </div>
                <div className="pp-stat-card">
                    <span className="pp-stat-lbl" style={{ color: '#10b981' }}><ArrowDownCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Income</span>
                    <span className="pp-stat-val">₹{totalIncome.toLocaleString('en-IN')}</span>
                </div>
                <div className="pp-stat-card">
                    <span className="pp-stat-lbl" style={{ color: '#ef4444' }}><ArrowUpCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Expenses</span>
                    <span className="pp-stat-val">₹{totalExpense.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div className="pp-filters">
                <div className="pp-search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search entries or parties..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="pp-type-filters">
                    <button className={`pp-type-btn ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
                    <button className={`pp-type-btn income ${filterType === 'income' ? 'active' : ''}`} onClick={() => setFilterType('income')}>Money In</button>
                    <button className={`pp-type-btn expense ${filterType === 'expense' ? 'active' : ''}`} onClick={() => setFilterType('expense')}>Money Out</button>
                </div>

                <div className="pp-categories">
                    <span className="pp-cat-label">Categories:</span>
                    {CATEGORIES.map(c => (
                        <button
                            key={c.key}
                            className={`pp-cat-btn ${filterCategory === c.key ? 'active' : ''}`}
                            onClick={() => setFilterCategory(c.key)}
                            style={filterCategory === c.key ? { borderColor: c.color, color: c.color, background: `${c.color}15` } : {}}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="pp-list">
                {filtered.length === 0 ? (
                    <div className="pp-empty">No entries found.</div>
                ) : (
                    filtered.map(entry => {
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
                                        <span className="pp-card-cat" style={{ color: cat.color }}>{cat.label}</span>
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
                                    <button className="pp-del-btn" onClick={(e) => handleDelete(e, entry.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {isAdding && (
                <div className="modal-overlay" onClick={() => setIsAdding(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Personal Entry</h2>
                            <button className="mc-close" onClick={() => setIsAdding(false)}><X size={20} /></button>
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
                                    <input type="number" required min="1" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} autoFocus />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="pp-select">
                                        {ADDABLE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Description (Optional)</label>
                                    <input type="text" placeholder="e.g. Monthly chit, Loan repayment..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>{form.type === 'income' ? 'From (Optional)' : 'To (Optional)'}</label>
                                    <input type="text" placeholder={form.type === 'income' ? 'Who paid you?' : 'Who are you paying?'} value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Account</label>
                                    <select value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} className="pp-select">
                                        {ACCOUNTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Notes (Optional)</label>
                                    <textarea placeholder="Extra details..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="pp-textarea" />
                                </div>
                                <button type="submit" className="btn-primary" style={{ padding: '14px', width: '100%', marginTop: 8 }}>Save Entry</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .personal-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
                .pp-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .pp-title { font-size: 1.8rem; font-weight: 800; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
                .pp-sub { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
                .pp-add-btn { display: flex; align-items: center; gap: 8px; background: var(--accent-gradient); border: none; padding: 10px 18px; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .pp-add-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
                
                .pp-stats { display: flex; gap: 16px; margin-bottom: 24px; }
                .pp-stat-card { flex: 1; background: var(--bg-card); padding: 18px; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
                .pp-stat-lbl { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: var(--text-secondary); }
                .pp-stat-val { font-size: 1.4rem; font-weight: 800; }

                .pp-filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
                .pp-search-box { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); }
                .pp-search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                
                .pp-type-filters { display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 16px; }
                .pp-type-btn { padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; }
                .pp-type-btn.active { background: rgba(255,255,255,0.15); color: var(--text-primary); border-color: var(--border-bright); }
                .pp-type-btn.income.active { color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.1); }
                .pp-type-btn.expense.active { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.1); }

                .pp-categories { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
                .pp-cat-label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; margin-right: 4px; }
                .pp-cat-btn { padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
                .pp-cat-btn:hover { background: rgba(255,255,255,0.1); }
                
                .pp-list { display: flex; flex-direction: column; gap: 12px; }
                .pp-empty { text-align: center; padding: 40px; color: var(--text-secondary); font-size: 0.95rem; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border); }
                
                .pp-card { display: flex; align-items: center; gap: 16px; background: var(--bg-card); padding: 14px 18px; border-radius: 16px; border: 1px solid var(--border); border-left-width: 4px; transition: all 0.2s; }
                .pp-card:hover { border-right-color: rgba(255,255,255,0.2); border-top-color: rgba(255,255,255,0.2); border-bottom-color: rgba(255,255,255,0.2); }
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
                .pp-del-btn { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .pp-del-btn:hover { background: rgba(239,68,68,0.2); transform: scale(1.05); }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-content { background: var(--bg-card); width: 90%; max-width: 480px; max-height: 90vh; border-radius: 20px; border: 1px solid var(--border); display: flex; flex-direction: column; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); }
                .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .mc-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; transition: color 0.2s; }
                .mc-close:hover { color: white; }
                .modal-scrollable { overflow-y: auto; padding: 20px; }
                
                .pp-type-toggle { display: flex; gap: 10px; margin-bottom: 20px; }
                .tgl-btn { flex: 1; display: flex; justify-content: center; align-items: center; gap: 6px; padding: 12px; border: 1px solid var(--border); background: var(--bg-dark); color: var(--text-secondary); border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .tgl-btn.inc { border-color: #10b981; background: rgba(16,185,129,0.15); color: #10b981; }
                .tgl-btn.exp { border-color: #ef4444; background: rgba(239,68,68,0.15); color: #ef4444; }

                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
                .form-group input, .pp-select, .pp-textarea { background: rgba(0,0,0,0.2); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: white; font-size: 0.95rem; font-family: inherit; transition: border-color 0.2s; }
                .form-group input:focus, .pp-select:focus, .pp-textarea:focus { border-color: var(--accent); outline: none; }
                .pp-select { cursor: pointer; }
                .pp-select option { background: var(--bg-card); color: white; }
                .pp-textarea { resize: vertical; min-height: 60px; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 600px) {
                    .pp-header { flex-direction: column; align-items: stretch; gap: 16px; }
                    .pp-stats { flex-direction: column; gap: 12px; }
                    .pp-type-filters { justify-content: space-between; }
                }
            `}</style>
        </div>
    );
};

export default Personal;
