import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Wallet, Plus, X, Trash2, Search } from 'lucide-react';

const CATEGORIES = [
    { key: 'all', label: 'All', color: 'var(--accent)' },
    { key: 'worker_salary', label: 'Worker Salary', color: '#10b981', auto: true },
    { key: 'materials', label: 'Materials/Equipment', color: '#3b82f6' },
    { key: 'petrol', label: 'Petrol/Travel', color: '#f59e0b' },
    { key: 'food', label: 'Food & Snacks', color: '#ef4444' },
    { key: 'maintenance', label: 'Maint/Repairs', color: '#8b5cf6' },
    { key: 'misc', label: 'Misc', color: '#ec4899' },
];
const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.key !== 'all' && !c.auto);

const Expenses = () => {
    const { expenses, addExpense, deleteExpense } = useData();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const [form, setForm] = useState({ description: '', amount: '', category: 'misc' });

    const isOwner = user?.role?.toLowerCase() === 'owner';

    const handleAdd = async (e) => {
        e.preventDefault();
        const amt = parseFloat(form.amount);
        if (!form.description || isNaN(amt) || amt <= 0) return;

        await addExpense({
            description: form.description,
            amount: amt,
            category: form.category,
            createdBy: user?.name,
            createdAt: new Date().toISOString(),
        });
        setIsAdding(false);
        setForm({ description: '', amount: '', category: 'misc' });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this expense?')) {
            await deleteExpense(id);
        }
    };

    const activeExpenses = expenses.filter(e => !e.deleted).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let filtered = activeExpenses;
    if (selectedCategory !== 'all') filtered = filtered.filter(e => e.category === selectedCategory);
    if (search) filtered = filtered.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));

    const totalFiltered = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalOverall = activeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return (
        <div className="expenses-page">
            <div className="ep-header">
                <div>
                    <h1 className="ep-title">Expenses</h1>
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
                    <span className="ep-stat-val">₹{totalOverall.toLocaleString('en-IN')}</span>
                </div>
                <div className="ep-stat-card filtered">
                    <span className="ep-stat-lbl">Filtered Expenses</span>
                    <span className="ep-stat-val">₹{totalFiltered.toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div className="ep-filters">
                <div className="ep-search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        value={search}
                        onChange={d => setSearch(d.target.value)}
                    />
                </div>
                <div className="ep-categories">
                    {CATEGORIES.map(c => (
                        <button
                            key={c.key}
                            className={`ep-cat-btn ${selectedCategory === c.key ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(c.key)}
                            style={selectedCategory === c.key ? { borderColor: c.color, color: c.color, background: `${c.color}15` } : {}}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ep-list">
                {filtered.length === 0 ? (
                    <div className="ep-empty">No expenses found matching the criteria.</div>
                ) : (
                    filtered.map(exp => {
                        const cat = CATEGORIES.find(c => c.key === exp.category) || CATEGORIES.find(c => c.key === 'misc');
                        return (
                            <div key={exp.id} className="ep-card">
                                <div className="ep-card-icon" style={{ color: cat.color, background: `${cat.color}15` }}>
                                    <Wallet size={20} />
                                </div>
                                <div className="ep-card-body">
                                    <h3 className="ep-card-desc">{exp.description}</h3>
                                    <div className="ep-card-meta">
                                        <span className="ep-card-cat" style={{ color: cat.color }}>{cat.label}</span>
                                        <span className="ep-card-date">{new Date(exp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    {exp.createdBy && <div className="ep-card-user">By: {exp.createdBy}</div>}
                                </div>
                                <div className="ep-card-right">
                                    <span className="ep-card-amt">₹{(exp.amount || 0).toLocaleString('en-IN')}</span>
                                    {isOwner && (
                                        <button className="ep-del-btn" onClick={(e) => handleDelete(e, exp.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
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
                            <h2>Add Expense</h2>
                            <button className="mc-close" onClick={() => setIsAdding(false)}><X size={20} /></button>
                        </div>
                        <form className="modal-body" onSubmit={handleAdd}>
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Purchased 100m wire"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    autoFocus
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
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: 10, width: '100%', padding: '12px' }}>Save Expense</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .expenses-page { padding: 24px; max-width: 1000px; margin: 0 auto; }
                .ep-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
                .ep-title { font-size: 1.8rem; font-weight: 800; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
                .ep-sub { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }
                .ep-add-btn { display: flex; align-items: center; gap: 8px; background: var(--accent-gradient); border: none; padding: 10px 18px; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .ep-add-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
                
                .ep-stats { display: flex; gap: 16px; margin-bottom: 24px; }
                .ep-stat-card { flex: 1; padding: 20px; border-radius: 16px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
                .ep-stat-card.total { background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.02)); border-color: rgba(99,102,241,0.2); }
                .ep-stat-card.filtered { background: rgba(255,255,255,0.03); }
                .ep-stat-lbl { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; color: var(--text-secondary); }
                .ep-stat-val { font-size: 1.6rem; font-weight: 800; }
                .ep-stat-card.total .ep-stat-val { color: var(--accent); }

                .ep-filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); }
                .ep-search-box { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); }
                .ep-search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                
                .ep-categories { display: flex; flex-wrap: wrap; gap: 8px; }
                .ep-cat-btn { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
                .ep-cat-btn:hover { background: rgba(255,255,255,0.1); }
                
                .ep-list { display: flex; flex-direction: column; gap: 12px; }
                .ep-empty { text-align: center; padding: 40px; color: var(--text-secondary); font-size: 0.95rem; background: var(--bg-card); border-radius: 16px; border: 1px dashed var(--border); }
                
                .ep-card { display: flex; align-items: center; gap: 16px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); transition: all 0.2s; }
                .ep-card:hover { border-color: rgba(255,255,255,0.2); }
                .ep-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .ep-card-body { flex: 1; }
                .ep-card-desc { font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; }
                .ep-card-meta { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; }
                .ep-card-cat { font-weight: 700; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 6px; }
                .ep-card-date { color: var(--text-secondary); }
                .ep-card-user { font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; font-style: italic; }
                .ep-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
                .ep-card-amt { font-size: 1.1rem; font-weight: 800; }
                .ep-del-btn { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; }
                .ep-del-btn:hover { background: rgba(239,68,68,0.2); transform: scale(1.05); }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-content { background: var(--bg-card); width: 90%; max-width: 480px; border-radius: 20px; border: 1px solid var(--border); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .modal-header { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); }
                .modal-header h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .mc-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; display: flex; transition: color 0.2s; }
                .mc-close:hover { color: white; }
                .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
                .form-group input { background: rgba(0,0,0,0.2); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: white; font-size: 0.95rem; transition: border-color 0.2s; }
                .form-group input:focus { border-color: var(--accent); outline: none; }
                .cat-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                .cat-opt { padding: 10px 14px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; text-align: center; color: var(--text-secondary); transition: all 0.2s; }
                .cat-opt:hover { background: rgba(255,255,255,0.05); }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @media (max-width: 600px) {
                    .ep-header { flex-direction: column; align-items: stretch; gap: 16px; }
                    .ep-stats { flex-direction: column; }
                }
            `}</style>
        </div>
    );
};

export default Expenses;
