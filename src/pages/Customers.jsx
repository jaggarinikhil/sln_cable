import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import CustomerModal from '../components/CustomerModal';
import {
    Search, UserPlus, Phone, MapPin, Tv, Wifi,
    Users, ChevronRight, Filter, IndianRupee
} from 'lucide-react';

const PAGE_SIZE = 20;

const Customers = () => {
    const { customers, bills, addCustomer, addBill } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [prefillName, setPrefillName] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (location.state?.createCustomer) {
            setPrefillName(location.state.name || '');
            setModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    const totalTV = customers.filter(c => c.services?.tv?.active).length;
    const totalInternet = customers.filter(c => c.services?.internet?.active).length;
    const totalAnnual = customers.filter(c => c.services?.tv?.annualSubscription).length;

    const filtered = customers.filter(c => {
        const matchesSearch =
            (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search) ||
            (c.boxNumber || '').includes(search) ||
            (c.address || '').toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (filter === 'tv') return c.services?.tv?.active;
        if (filter === 'internet') return c.services?.internet?.active;
        if (filter === 'annual') return !!c.services?.tv?.annualSubscription;
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const safePage = Math.min(page, Math.max(1, totalPages));
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const getOutstanding = (customerId) =>
        bills.filter(b => b.customerId === customerId).reduce((s, b) => s + (b.balance || 0), 0);

    // Reset to page 1 when search/filter changes
    React.useEffect(() => setPage(1), [search, filter]);

    const handleSave = (data, billSpec) => {
        const newId = addCustomer(data);
        if (billSpec) {
            addBill({
                ...billSpec,
                customerId: newId,
                customerName: data.name,
                phone: data.phone,
                boxNumber: data.boxNumber || '',
                generatedBy: user?.username || user?.userId || 'admin',
                generatedByName: user?.name || 'Admin'
            });
        }
        setModalOpen(false);
        setPrefillName('');
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const avatarColors = [
        'linear-gradient(135deg, #6366f1, #a855f7)',
        'linear-gradient(135deg, #06b6d4, #3b82f6)',
        'linear-gradient(135deg, #10b981, #059669)',
        'linear-gradient(135deg, #f59e0b, #ef4444)',
        'linear-gradient(135deg, #ec4899, #8b5cf6)',
    ];

    const getAvatarColor = (id) => avatarColors[(parseInt(id) || 0) % avatarColors.length];

    return (
        <div className="cust-page">
            {/* Header */}
            <div className="cust-header">
                <div>
                    <h1 className="cust-title">Customers</h1>
                    <p className="cust-subtitle">{customers.length} total customers registered</p>
                </div>
                <button className="btn-primary" onClick={() => setModalOpen(true)}>
                    <UserPlus size={18} /> Add Customer
                </button>
            </div>

            {/* Stat Cards */}
            <div className="cust-stats">
                <div className="cust-stat-card" onClick={() => setFilter('all')} style={{ cursor: 'pointer', borderColor: filter === 'all' ? 'var(--accent)' : '' }}>
                    <div className="cust-stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="cust-stat-value">{customers.length}</p>
                        <p className="cust-stat-label">All Customers</p>
                    </div>
                </div>
                <div className="cust-stat-card" onClick={() => setFilter('tv')} style={{ cursor: 'pointer', borderColor: filter === 'tv' ? '#a855f7' : '' }}>
                    <div className="cust-stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                        <Tv size={22} />
                    </div>
                    <div>
                        <p className="cust-stat-value">{totalTV}</p>
                        <p className="cust-stat-label">Cable TV</p>
                    </div>
                </div>
                <div className="cust-stat-card" onClick={() => setFilter('internet')} style={{ cursor: 'pointer', borderColor: filter === 'internet' ? '#06b6d4' : '' }}>
                    <div className="cust-stat-icon" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                        <Wifi size={22} />
                    </div>
                    <div>
                        <p className="cust-stat-value">{totalInternet}</p>
                        <p className="cust-stat-label">Internet</p>
                    </div>
                </div>
                <div className="cust-stat-card" onClick={() => setFilter('annual')} style={{ cursor: 'pointer', borderColor: filter === 'annual' ? '#f59e0b' : '' }}>
                    <div className="cust-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                        <IndianRupee size={22} />
                    </div>
                    <div>
                        <p className="cust-stat-value">{totalAnnual}</p>
                        <p className="cust-stat-label">Annual TV</p>
                    </div>
                </div>
            </div>

            {/* Search + Filter Row */}
            <div className="cust-toolbar">
                <div className="cust-search">
                    <Search size={18} className="cust-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, address or box number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="cust-clear" onClick={() => setSearch('')}>✕</button>
                    )}
                </div>
                <div className="cust-filter-wrap">
                    <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                    <select
                        className="cust-filter-select"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="all">All Customers</option>
                        <option value="tv">Cable TV</option>
                        <option value="internet">Internet</option>
                        <option value="annual">Annual TV</option>
                    </select>
                </div>
            </div>

            {/* Results count */}
            <div className="cust-results-info">
                Showing <strong>{filtered.length}</strong> of {customers.length} customers
                {filter !== 'all' && <span className="cust-active-filter">
                    · Filtered by: {filter === 'tv' ? 'Cable TV' : filter === 'internet' ? 'Internet' : 'Annual TV'}
                    <button onClick={() => setFilter('all')}>✕</button>
                </span>}
            </div>

            {/* Table */}
            <div className="cust-table-wrap">
                {filtered.length === 0 ? (
                    <div className="cust-empty">
                        <Users size={48} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                        <p>No customers found</p>
                        <span>Try adjusting your search or filter</span>
                    </div>
                ) : (
                    <table className="cust-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Contact</th>
                                <th>Services</th>
                                <th>Box No.</th>
                                <th>Total Due</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(c => (
                                <tr
                                    key={c.id}
                                    className="cust-row"
                                    onClick={() => navigate(`/customers/${c.id}`)}
                                >
                                    <td>
                                        <div className="cust-name-cell">
                                            <div className="cust-avatar" style={{ background: getAvatarColor(c.id) }}>
                                                {getInitials(c.name)}
                                            </div>
                                            <div>
                                                <p className="cust-name">{c.name || 'Unnamed'}</p>
                                                <p className="cust-addr">
                                                    <MapPin size={11} /> {c.address || '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cust-phone">
                                            <Phone size={13} /> {c.phone || '—'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="cust-badges">
                                            {c.services?.tv?.active && (
                                                <span className="cust-badge cust-badge-tv" title="Cable TV">
                                                    <Tv size={14} />
                                                </span>
                                            )}
                                            {c.services?.internet?.active && (
                                                <span className="cust-badge cust-badge-net" title="Internet">
                                                    <Wifi size={14} />
                                                </span>
                                            )}
                                            {!c.services?.tv?.active && !c.services?.internet?.active && (
                                                <span className="cust-badge cust-badge-none">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="cust-box">{c.boxNumber || '—'}</span>
                                    </td>
                                    <td>
                                        {(() => {
                                            const due = getOutstanding(c.id); return due > 0
                                                ? <span className="cust-due-amt">₹{due.toLocaleString('en-IN')}</span>
                                                : <span className="cust-due-clear">Clear</span>;
                                        })()}
                                    </td>
                                    <td>
                                        <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Mobile card list */}
            <div className="cust-mobile-list">
                {filtered.length === 0 ? (
                    <div className="cust-empty">
                        <Users size={48} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                        <p>No customers found</p>
                        <span>Try adjusting your search or filter</span>
                    </div>
                ) : paginated.map(c => (
                    <div
                        key={c.id}
                        className="cust-mobile-card"
                        onClick={() => navigate(`/customers/${c.id}`)}
                    >
                        <div className="cust-mobile-card-top">
                            <div className="cust-avatar" style={{ background: getAvatarColor(c.id) }}>
                                {getInitials(c.name)}
                            </div>
                            <div className="cust-mobile-card-info">
                                <p className="cust-mobile-card-name">{c.name || 'Unnamed'}</p>
                                <p className="cust-mobile-card-addr"><MapPin size={11} /> {c.address || '—'}</p>
                            </div>
                            <span className="cust-status-active">Active</span>
                        </div>
                        <div className="cust-mobile-card-bottom">
                            <div className="cust-mobile-card-meta">
                                <p className="cust-mobile-phone"><Phone size={13} /> {c.phone || '—'}</p>
                                <div className="cust-badges" style={{ marginTop: 4 }}>
                                    {c.services?.tv?.active && <span className="cust-badge cust-badge-tv" title="Cable TV"><Tv size={14} /></span>}
                                    {c.services?.internet?.active && <span className="cust-badge cust-badge-net" title="Internet"><Wifi size={14} /></span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {(() => {
                                    const due = getOutstanding(c.id); return due > 0
                                        ? <span className="cust-due-amt">₹{due.toLocaleString('en-IN')}</span>
                                        : <span className="cust-due-clear">Clear</span>;
                                })()}
                                <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="cust-pagination">
                    <button
                        className="cust-page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                    >← Prev</button>
                    <span className="cust-page-info">
                        Page {safePage} of {totalPages}
                        <span className="cust-page-sub"> · {filtered.length} total</span>
                    </span>
                    <button
                        className="cust-page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                    >Next →</button>
                </div>
            )}

            {modalOpen && (
                <CustomerModal
                    customer={null}
                    initialName={prefillName}
                    onClose={() => { setModalOpen(false); setPrefillName(''); }}
                    onSave={handleSave}
                />
            )}

            <style>{`
                .cust-page {
                    padding: 32px;
                }

                /* Header */
                .cust-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 28px;
                }
                .cust-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    background: linear-gradient(to right, #fff, #94a3b8);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .cust-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-top: 4px;
                }

                /* Stat Cards */
                .cust-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                }
                .cust-stat-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.2s;
                }
                .cust-stat-card:hover {
                    border-color: var(--border-bright);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                }
                .cust-stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .cust-stat-value {
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1;
                }
                .cust-stat-label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin-top: 4px;
                    font-weight: 500;
                }

                /* Toolbar */
                .cust-toolbar {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .cust-search {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px 18px;
                    transition: all 0.2s;
                }
                .cust-search:focus-within {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
                }
                .cust-search-icon { color: var(--text-secondary); flex-shrink: 0; }
                .cust-search input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                }
                .cust-search input::placeholder { color: var(--text-secondary); }
                .cust-clear {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 0.85rem;
                    padding: 2px 6px;
                    border-radius: 6px;
                }
                .cust-clear:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }

                .cust-filter-wrap {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px 18px;
                }
                .cust-filter-select {
                    background: none;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    appearance: none;
                    padding-right: 4px;
                }
                .cust-filter-select option { background: #0f172a; }

                /* Results Info */
                .cust-results-info {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 16px;
                }
                .cust-results-info strong { color: var(--text-primary); }
                .cust-active-filter {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-left: 6px;
                    color: var(--accent);
                }
                .cust-active-filter button {
                    background: none;
                    border: none;
                    color: var(--accent);
                    cursor: pointer;
                    font-size: 0.8rem;
                    padding: 0 2px;
                }

                /* Table */
                .cust-table-wrap {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    overflow: hidden;
                }
                .cust-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .cust-table thead tr {
                    background: rgba(255,255,255,0.03);
                }
                .cust-table th {
                    padding: 14px 20px;
                    text-align: left;
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border);
                }
                .cust-row {
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .cust-row:hover td {
                    background: rgba(99,102,241,0.05);
                }
                .cust-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border);
                    vertical-align: middle;
                }
                .cust-table tbody tr:last-child td {
                    border-bottom: none;
                }

                /* Name Cell */
                .cust-name-cell {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .cust-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.85rem;
                    color: white;
                    flex-shrink: 0;
                }
                .cust-name {
                    font-weight: 700;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                }
                .cust-addr {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.78rem;
                    color: var(--text-secondary);
                    margin-top: 3px;
                }
                .cust-phone {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    color: var(--text-secondary);
                    font-size: 0.88rem;
                }

                /* Badges */
                .cust-badges { display: flex; gap: 6px; flex-wrap: wrap; }
                .cust-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .cust-badge-tv {
                    background: rgba(168,85,247,0.15);
                    color: #a855f7;
                    border: 1px solid rgba(168,85,247,0.25);
                }
                .cust-badge-net {
                    background: rgba(6,182,212,0.15);
                    color: #06b6d4;
                    border: 1px solid rgba(6,182,212,0.25);
                }
                .cust-badge-none {
                    background: rgba(255,255,255,0.05);
                    color: var(--text-secondary);
                    border: 1px solid var(--border);
                }

                /* Box */
                .cust-box {
                    font-family: monospace;
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    background: rgba(255,255,255,0.05);
                    padding: 3px 10px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                }

                /* Status */
                .cust-status-active {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    background: rgba(16,185,129,0.12);
                    color: #10b981;
                    border: 1px solid rgba(16,185,129,0.2);
                }
                .cust-status-active::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                }

                /* Due amounts */
                .cust-due-amt {
                    font-weight: 800;
                    font-size: 0.9rem;
                    color: #f87171;
                }
                .cust-due-clear {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: #10b981;
                    background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.2);
                    padding: 3px 10px;
                    border-radius: 20px;
                }

                /* Empty */
                .cust-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 80px 40px;
                }
                .cust-empty p {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .cust-empty span {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                }

                @media (max-width: 768px) {
                    .cust-page { padding: 12px; }
                    .cust-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
                    .cust-header .btn-primary { width: 100%; justify-content: center; }
                    .cust-title { font-size: 1.4rem; }
                    .cust-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
                    .cust-stat-card { padding: 14px; gap: 10px; border-radius: 12px; }
                    .cust-stat-icon { width: 38px; height: 38px; border-radius: 10px; }
                    .cust-stat-value { font-size: 1.3rem; }
                    .cust-toolbar { flex-direction: column; gap: 10px; }
                    .cust-filter-wrap { width: 100%; }
                    .cust-filter-select { width: 100%; }

                    /* Hide table on mobile, show cards instead */
                    .cust-table-wrap { background: none; border: none; border-radius: 0; }
                    .cust-table { display: none; }
                    .cust-mobile-list { display: flex; flex-direction: column; gap: 10px; }

                    .cust-mobile-card {
                        background: var(--bg-card);
                        border: 1px solid var(--border);
                        border-radius: 16px;
                        padding: 16px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .cust-mobile-card:active { transform: scale(0.98); }
                    .cust-mobile-card-top {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .cust-mobile-card-info { flex: 1; min-width: 0; }
                    .cust-mobile-card-name {
                        font-weight: 700;
                        font-size: 0.95rem;
                        color: var(--text-primary);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .cust-mobile-card-addr {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 0.78rem;
                        color: var(--text-secondary);
                        margin-top: 2px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }
                    .cust-mobile-card-bottom {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    .cust-mobile-card-meta {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .cust-mobile-phone {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 0.83rem;
                        color: var(--text-secondary);
                    }
                    .cust-mobile-card-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                }
                @media (min-width: 769px) {
                    .cust-mobile-list { display: none; }
                }

                /* Pagination */
                .cust-pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-top: 20px;
                    padding: 4px 0;
                }
                .cust-page-btn {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 8px 18px;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.18s;
                    font-family: inherit;
                }
                .cust-page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
                .cust-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
                .cust-page-info {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .cust-page-sub { color: var(--text-secondary); font-weight: 400; }
            `}</style>
        </div>
    );
};

export default Customers;
