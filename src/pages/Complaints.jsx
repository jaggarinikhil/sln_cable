import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, AlertCircle, X, Clock, CheckCircle, Loader, Tv, Wifi, ChevronRight, Send, StickyNote, MessageCircle } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { Button, Badge } from '../components/ui';

const SVC_META = {
    tv:       { label: 'TV',       bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', border: 'rgba(168,85,247,0.3)'  },
    internet: { label: 'Internet', bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4', border: 'rgba(6,182,212,0.3)'   },
    general:  { label: 'General',  bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'var(--border)' },
};
const STATUS_META = {
    'Pending':     { color: '#f87171', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',    Icon: Clock       },
    'In Progress': { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',   Icon: Loader      },
    'Completed':   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.25)',   Icon: CheckCircle },
};

const ComplaintDetailModal = ({ complaint, customer, onClose, onUpdate, user }) => {
    const [noteText, setNoteText] = useState('');
    const notes = complaint.notes || [];
    const status = complaint.status;
    const svc = (complaint.serviceType || 'general').toLowerCase();
    const sm = SVC_META[svc] || SVC_META.general;
    const stm = STATUS_META[status] || STATUS_META['Pending'];
    const { Icon: StatusIcon } = stm;

    const handleStatusChange = (newStatus) => {
        onUpdate({ status: newStatus });
    };

    const handleAddNote = () => {
        if (!noteText.trim()) return;
        const newNote = {
            id: Date.now().toString(),
            text: noteText.trim(),
            addedBy: user?.name || 'Unknown',
            addedAt: new Date().toISOString(),
        };
        onUpdate({ notes: [...notes, newNote] });
        setNoteText('');
    };

    return (
        <div className="bm-overlay" onClick={onClose}>
            <div className="bm-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <div className="bm-header">
                    <div className="bm-header-icon" style={{ background: stm.bg, color: stm.color }}><AlertCircle size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bm-header-title">
                            {customer?.name || complaint.customerName || 'Customer'}
                        </div>
                        <div className="bm-header-sub">
                            {(customer?.phone || complaint.phone) || ''}
                            {(customer?.boxNumber || complaint.boxNumber) ? ` · Box ${customer?.boxNumber || complaint.boxNumber}` : ''}
                        </div>
                    </div>
                    <button className="bm-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="bm-body">
                    {/* Service + Status */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge color={svc === 'general' ? undefined : sm.color} icon={svc === 'tv' ? <Tv size={11} /> : svc === 'internet' ? <Wifi size={11} /> : <AlertCircle size={11} />} size="sm">
                            {sm.label}
                        </Badge>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {complaint.createdByName && ` · by ${complaint.createdByName}`}
                        </span>
                    </div>

                    {/* Description */}
                    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>Issue Description</div>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-primary)', margin: 0 }}>{complaint.description}</p>
                    </div>

                    {/* Status update */}
                    <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Update Status</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {['Pending', 'In Progress', 'Completed'].map(s => {
                                const m = STATUS_META[s];
                                const active = status === s;
                                return (
                                    <button key={s}
                                        style={{
                                            flex: 1, padding: '8px 10px', border: `1px solid ${active ? m.border : 'var(--border)'}`,
                                            borderRadius: 10, background: active ? m.bg : 'none', color: active ? m.color : 'var(--text-secondary)',
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                        }}
                                        onClick={() => handleStatusChange(s)}
                                    >
                                        {React.createElement(STATUS_META[s].Icon, { size: 12 })} {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes timeline */}
                    <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 10 }}>
                            Notes & Findings {notes.length > 0 && `(${notes.length})`}
                        </div>
                        {notes.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '8px 0', opacity: 0.7 }}>No notes yet. Add findings or updates below.</p>
                        ) : (
                            <div className="cdm-notes-list">
                                {[...notes].reverse().map(n => (
                                    <div key={n.id} className="cdm-note">
                                        <div className="cdm-note-dot" />
                                        <div className="cdm-note-content">
                                            <p className="cdm-note-text">{n.text}</p>
                                            <span className="cdm-note-meta">
                                                {n.addedBy} · {new Date(n.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {' · '}{new Date(n.addedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add note */}
                    <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Add Note</div>
                        <textarea
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', minHeight: 80, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            placeholder="Write findings, updates, or next steps…"
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
                        />
                        <button
                            className="bm-submit"
                            style={{ marginTop: 8 }}
                            onClick={handleAddNote}
                            disabled={!noteText.trim()}
                        >
                            <Send size={15} /> Add Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CP_PAGE_SIZE = 15;

const Complaints = () => {
    const location = useLocation();
    const { complaints, customers, addComplaint, updateComplaintStatus, updateComplaint } = useData();
    const { user } = useAuth();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [datePreset, setDatePreset] = useState('all');
    const [customDate, setCustomDate] = useState('');
    const [customerIdFilter, setCustomerIdFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ customerId: '', customerName: '', description: '', serviceType: 'general' });
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedComplaintId, setSelectedComplaintId] = useState(null);
    const [cpPage, setCpPage] = useState(1);

    // Get local date string YYYY-MM-DD — avoids all UTC/timezone issues
    const localDate = (d) => {
        if (!d) return '';
        if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        return new Date(d).toLocaleDateString('en-CA');
    };
    const todayStr = new Date().toLocaleDateString('en-CA');
    const daysAgoStr = (n) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
    };

    useEffect(() => {
        if (location.state?.openModal) {
            openModal(location.state.customerId || '');
            window.history.replaceState({}, '');
        }
        if (location.state?.filterCustomerId) {
            setCustomerIdFilter(location.state.filterCustomerId);
            window.history.replaceState({}, '');
        }
        if (location.state?.openComplaintId) {
            setSelectedComplaintId(location.state.openComplaintId);
            window.history.replaceState({}, '');
        }
        if (location.state?.statusFilter) {
            setStatusFilter(location.state.statusFilter);
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    const filtered = complaints.filter(c => {
        if (customerIdFilter && String(c.customerId) !== String(customerIdFilter)) return false;
        if (search) {
            const q = search.toLowerCase();
            const customer = customers.find(cu => String(cu.id) === String(c.customerId));
            if (!(customer?.name || c.customerName || '').toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
        }
        if (statusFilter === 'Active') {
            if (c.status === 'Completed') return false;
        } else if (statusFilter !== 'All' && c.status !== statusFilter) return false;
        if (serviceFilter !== 'All' && (c.serviceType || 'general').toLowerCase() !== serviceFilter.toLowerCase()) return false;
        const cDate = localDate(c.createdAt);
        if (datePreset === 'today'  && cDate !== todayStr) return false;
        if (datePreset === '7d'     && cDate < daysAgoStr(6))  return false;
        if (datePreset === '15d'    && cDate < daysAgoStr(14)) return false;
        if (datePreset === '1m'     && cDate < daysAgoStr(29)) return false;
        if (datePreset === 'custom' && customDate && cDate !== customDate) return false;
        return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Reset to page 1 when filters change
    useEffect(() => setCpPage(1), [search, statusFilter, serviceFilter, datePreset, customDate, customerIdFilter]);

    const cpTotalPages = Math.ceil(filtered.length / CP_PAGE_SIZE);
    const cpSafePage = Math.min(cpPage, Math.max(1, cpTotalPages));
    const paginatedComplaints = filtered.slice((cpSafePage - 1) * CP_PAGE_SIZE, cpSafePage * CP_PAGE_SIZE);

    const counts = {
        all: complaints.length,
        pending: complaints.filter(c => c.status === 'Pending').length,
        inProgress: complaints.filter(c => c.status === 'In Progress').length,
        completed: complaints.filter(c => c.status === 'Completed').length,
    };

    const handleSave = () => {
        if ((!form.customerId && !form.customerName.trim()) || !form.description.trim()) return;
        addComplaint({ ...form, createdBy: user?.userId, createdByName: user?.name });
        setModalOpen(false);
        setForm({ customerId: '', customerName: '', description: '', serviceType: 'general' });
        setCustomerSearch('');
    };

    const openModal = (customerId = '') => {
        setForm({ customerId, customerName: '', description: '', serviceType: 'general' });
        setCustomerSearch('');
        setModalOpen(true);
    };

    const selectedCustomerObj = form.customerId ? customers.find(c => c.id === form.customerId) : null;
    const searchedCustomers = customerSearch
        ? customers.filter(c =>
            (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.phone || '').includes(customerSearch) ||
            (c.boxNumber || '').includes(customerSearch)
          ).slice(0, 6)
        : [];
    const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const filteredCustomer = customerIdFilter ? customers.find(c => String(c.id) === String(customerIdFilter)) : null;
    const selectedComplaintData = selectedComplaintId ? complaints.find(c => c.id === selectedComplaintId) : null;

    return (
        <div className="cp-page">
            {/* Header */}
            <div className="section-header">
                <h1>Complaints</h1>
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => openModal()}>
                    New Complaint
                </Button>
            </div>

            {/* Customer filter banner */}
            {filteredCustomer && (
                <div className="cp-customer-banner">
                    <span>Showing complaints for <strong>{filteredCustomer.name}</strong></span>
                    <button className="cp-clear-btn" onClick={() => setCustomerIdFilter('')}><X size={14} /> Show all</button>
                </div>
            )}

            {/* Stats — clickable to filter by status */}
            <div className="cp-stats">
                {[
                    { key: 'All',         label: 'Total',       count: counts.all,        cls: '' },
                    { key: 'Pending',     label: 'Pending',     count: counts.pending,    cls: 'cp-stat-pending' },
                    { key: 'In Progress', label: 'In Progress', count: counts.inProgress, cls: 'cp-stat-inprog'  },
                    { key: 'Completed',   label: 'Completed',   count: counts.completed,  cls: 'cp-stat-done'    },
                ].map(({ key, label, count, cls }) => (
                    <div key={key} className={`cp-stat ${cls} ${statusFilter === key ? 'cp-stat-active' : ''}`}
                        onClick={() => setStatusFilter(s => s === key ? 'All' : key)}>
                        <span className="cp-stat-num">{count}</span>
                        <span className="cp-stat-lbl">{label}</span>
                    </div>
                ))}
            </div>

            {/* Search + date presets + service filter */}
            <div className="cp-toolbar">
                <div className="search-box" style={{ flex: 1, minWidth: 160 }}>
                    <Search size={16} />
                    <input type="text" placeholder="Search name or description…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* Service filter */}
                <div className="cp-pill-group">
                    {[['All', null], ['TV', 'tv'], ['Internet', 'internet'], ['General', 'general']].map(([label, val]) => {
                        const active = serviceFilter === label;
                        const meta = val ? SVC_META[val] : null;
                        return (
                            <button key={label}
                                className={`cp-svc-pill-btn ${active ? 'active' : ''}`}
                                style={active && meta ? { borderColor: meta.border, color: meta.color, background: meta.bg } : {}}
                                onClick={() => setServiceFilter(label)}
                            >
                                {val === 'tv' && <Tv size={11} />}
                                {val === 'internet' && <Wifi size={11} />}
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Date presets */}
            <div className="cp-date-bar">
                <span className="cp-date-label">Period:</span>
                {[['all','All time'],['today','Today'],['7d','Last 7 days'],['15d','Last 15 days'],['1m','Last month'],['custom','Pick date']].map(([val, label]) => (
                    <button key={val}
                        className={`cp-date-btn ${datePreset === val ? 'active' : ''}`}
                        onClick={() => {
                            setDatePreset(val);
                            if (val !== 'custom') setCustomDate('');
                            else if (!customDate) setCustomDate(new Date().toISOString().slice(0, 10));
                        }}
                    >{label}</button>
                ))}
                {datePreset === 'custom' && (
                    <input type="date" className="cp-date-picker" value={customDate} onChange={e => setCustomDate(e.target.value)} />
                )}
                {datePreset !== 'all' && (
                    <button className="cp-clear-btn" onClick={() => { setDatePreset('all'); setCustomDate(''); }}><X size={13} /></button>
                )}
            </div>

            {/* Complaint cards */}
            {filtered.length === 0 ? (
                <EmptyState
                    icon={MessageCircle}
                    title="No complaints found"
                    description="No complaints match your filters."
                    accent="#f87171"
                />
            ) : (
                <div className="cp-list">
                    {paginatedComplaints.map(c => {
                        const customer = customers.find(cu => String(cu.id) === String(c.customerId));
                        const svc = (c.serviceType || 'general').toLowerCase();
                        const sm = SVC_META[svc] || SVC_META.general;
                        const stm = STATUS_META[c.status] || STATUS_META['Pending'];
                        const { Icon: StatusIcon } = stm;
                        return (
                            <div key={c.id} className="cp-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedComplaintId(c.id)}>
                                <div className="cp-card-left">
                                    <div className="cp-card-top">
                                        <span className="cp-customer-name">{customer?.name || c.customerName || '—'}</span>
                                        <Badge color={svc === 'general' ? undefined : sm.color} icon={svc === 'tv' ? <Tv size={11} /> : svc === 'internet' ? <Wifi size={11} /> : <AlertCircle size={11} />} size="sm">
                                            {sm.label}
                                        </Badge>
                                        <span className="cp-status-tag" style={{ background: stm.bg, color: stm.color, borderColor: stm.border }}>
                                            <StatusIcon size={11} /> {c.status}
                                        </span>
                                        {(c.notes || []).length > 0 && (
                                            <span className="cp-notes-badge"><StickyNote size={10} /> {c.notes.length}</span>
                                        )}
                                    </div>
                                    <p className="cp-desc">{c.description}</p>
                                    <div className="cp-meta">
                                        <span>{customer?.phone}</span>
                                        {c.createdAt && <span>· {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                        {c.createdByName && <span>· by {c.createdByName}</span>}
                                    </div>
                                </div>
                                <div className="cp-card-right">
                                    <select
                                        className="cp-status-sel"
                                        value={c.status}
                                        onChange={e => { e.stopPropagation(); updateComplaintStatus(c.id, e.target.value); }}
                                        onClick={e => e.stopPropagation()}
                                        style={{ borderColor: stm.border, color: stm.color }}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                    <ChevronRight size={16} style={{ color: 'var(--text-secondary)', marginLeft: 8, flexShrink: 0 }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {cpTotalPages > 1 && (
                <div className="cp-pagination">
                    <button className="cp-page-btn" onClick={() => setCpPage(p => Math.max(1, p - 1))} disabled={cpSafePage === 1}>← Prev</button>
                    <span className="cp-page-info">Page {cpSafePage} of {cpTotalPages} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>· {filtered.length} total</span></span>
                    <button className="cp-page-btn" onClick={() => setCpPage(p => Math.min(cpTotalPages, p + 1))} disabled={cpSafePage === cpTotalPages}>Next →</button>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="bm-overlay" onClick={() => { setModalOpen(false); setCustomerSearch(''); }}>
                    <div className="bm-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="bm-header">
                            <div className="bm-header-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}><AlertCircle size={20} /></div>
                            <div>
                                <div className="bm-header-title">New Complaint</div>
                                <div className="bm-header-sub">{customers.length} customers</div>
                            </div>
                            <button className="bm-close" onClick={() => { setModalOpen(false); setCustomerSearch(''); }}><X size={18} /></button>
                        </div>
                        <div className="bm-body">
                            {/* Customer picker */}
                            {!selectedCustomerObj && !form.customerName ? (
                                <div className="bm-section">
                                    <div className="bm-section-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Customer</div>
                                    <div className="bl-search">
                                        <Search size={16} className="bl-search-icon" />
                                        <input
                                            type="text" placeholder="Search by name, phone or box…"
                                            value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                                        />
                                        {customerSearch && <button className="bl-search-clear" onClick={() => setCustomerSearch('')}><X size={13} /></button>}
                                    </div>
                                    {!customerSearch && <p className="bm-hint">Search to find a customer, or proceed with just a name</p>}
                                    {customerSearch && (
                                        <div className="bm-results">
                                            {searchedCustomers.length === 0 ? (
                                                <div>
                                                    <div className="bm-no-customer-warning">
                                                        <AlertCircle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                        <span>No customer found matching "{customerSearch}"</span>
                                                    </div>
                                                    <button className="bm-use-name-btn" onClick={() => { setForm(f => ({ ...f, customerName: customerSearch, customerId: '' })); setCustomerSearch(''); }}>
                                                        + Log complaint as "{customerSearch}"
                                                    </button>
                                                </div>
                                            ) : searchedCustomers.map(c => (
                                                <div key={c.id} className="bm-result-row" onClick={() => { setForm(f => ({ ...f, customerId: c.id, customerName: '' })); setCustomerSearch(''); }}>
                                                    <div className="bm-result-avatar">{getInitials(c.name)}</div>
                                                    <div className="bm-result-info">
                                                        <p className="bm-result-name">{c.name}</p>
                                                        <p className="bm-result-meta">{c.phone}{c.boxNumber ? ` · Box ${c.boxNumber}` : ''}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : selectedCustomerObj ? (
                                <div className="bm-customer-chip">
                                    <div className="bm-chip-avatar" style={{ background: 'linear-gradient(135deg, #f87171, #ef4444)' }}>{getInitials(selectedCustomerObj.name)}</div>
                                    <div className="bm-chip-info">
                                        <p className="bm-chip-name">{selectedCustomerObj.name}</p>
                                        <p className="bm-chip-sub">{selectedCustomerObj.phone}{selectedCustomerObj.boxNumber ? ` · Box ${selectedCustomerObj.boxNumber}` : ''}</p>
                                    </div>
                                    <button type="button" className="bm-chip-change" onClick={() => setForm(f => ({ ...f, customerId: '', customerName: '' }))}>Change</button>
                                </div>
                            ) : (
                                <div className="bm-customer-chip">
                                    <div className="bm-chip-avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{getInitials(form.customerName)}</div>
                                    <div className="bm-chip-info">
                                        <p className="bm-chip-name">{form.customerName}</p>
                                        <p className="bm-chip-sub" style={{ color: '#f59e0b', fontSize: '0.72rem' }}>Not linked to a customer account</p>
                                    </div>
                                    <button type="button" className="bm-chip-change" onClick={() => setForm(f => ({ ...f, customerId: '', customerName: '' }))}>Change</button>
                                </div>
                            )}

                            {/* Service type */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Service Type</div>
                                <div className="cp-toggle-row">
                                    {[['tv', 'TV', 'tv'], ['internet', 'Internet', 'internet'], ['general', 'General', 'general']].map(([val, label, svc]) => {
                                        const m = SVC_META[svc];
                                        const sel = form.serviceType === val;
                                        return (
                                            <button key={val} type="button"
                                                className={`cp-toggle-btn ${sel ? 'sel' : ''}`}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...(sel ? { borderColor: m.border, color: m.color, background: m.bg } : {}) }}
                                                onClick={() => setForm(f => ({ ...f, serviceType: val }))}
                                            >
                                                {val === 'tv' && <Tv size={12} />}
                                                {val === 'internet' && <Wifi size={12} />}
                                                {val === 'general' && <AlertCircle size={12} />}
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>Description *</div>
                                <textarea
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', minHeight: 90, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                    rows={4} placeholder="Describe the issue…"
                                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <button
                                className="bm-submit"
                                style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                                onClick={handleSave}
                                disabled={(!form.customerId && !form.customerName.trim()) || !form.description.trim()}
                            >
                                <AlertCircle size={16} /> Submit Complaint
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complaint Detail Modal */}
            {selectedComplaintData && (
                <ComplaintDetailModal
                    complaint={selectedComplaintData}
                    customer={customers.find(cu => String(cu.id) === String(selectedComplaintData.customerId))}
                    onClose={() => setSelectedComplaintId(null)}
                    onUpdate={(updates) => updateComplaint(selectedComplaintData.id, updates)}
                    user={user}
                />
            )}

            <style>{`
                .cp-page { padding: 28px 32px; }

                /* Customer filter banner */
                .cp-customer-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.25); border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.84rem; color: var(--text-primary); }
                .cp-customer-banner strong { color: var(--accent); }
                .cp-customer-banner .cp-clear-btn { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; font-weight: 600; color: var(--accent); }

                /* Stats */
                .cp-stats { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
                .cp-stat { flex: 1; min-width: 90px; background: var(--bg-card); border: 2px solid var(--border); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; transition: all 0.18s; cursor: pointer; }
                .cp-stat:hover { border-color: var(--border-bright); transform: translateY(-1px); }
                .cp-stat-active { box-shadow: 0 0 0 2px currentColor; }
                .cp-stat-num { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); }
                .cp-stat-lbl { font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
                .cp-stat-pending { border-color: rgba(239,68,68,0.25); }
                .cp-stat-pending .cp-stat-num { color: #f87171; }
                .cp-stat-pending.cp-stat-active { background: rgba(239,68,68,0.06); }
                .cp-stat-inprog { border-color: rgba(251,191,36,0.25); }
                .cp-stat-inprog .cp-stat-num { color: #fbbf24; }
                .cp-stat-inprog.cp-stat-active { background: rgba(251,191,36,0.06); }
                .cp-stat-done { border-color: rgba(16,185,129,0.25); }
                .cp-stat-done .cp-stat-num { color: #10b981; }
                .cp-stat-done.cp-stat-active { background: rgba(16,185,129,0.06); }

                /* Toolbar */
                .cp-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
                .cp-pill-group { display: flex; gap: 5px; flex-wrap: wrap; }

                /* Search box */
                .search-box {
                    display: flex; align-items: center; gap: 10px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 12px; padding: 10px 16px;
                    transition: all 0.2s;
                }
                .search-box:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
                .search-box svg { color: var(--text-secondary); flex-shrink: 0; }
                .search-box input {
                    flex: 1; background: none; border: none; outline: none;
                    color: var(--text-primary); font-size: 0.9rem; min-width: 0;
                }
                .search-box input::placeholder { color: var(--text-secondary); }

                /* Service filter pills */
                .cp-svc-pill-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; border: 1px solid var(--border); background: none; color: var(--text-secondary); cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .cp-svc-pill-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .cp-svc-pill-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.08); }

                /* Date preset bar */
                .cp-date-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
                .cp-date-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-right: 2px; white-space: nowrap; }
                .cp-date-btn { padding: 5px 11px; border-radius: 8px; font-size: 0.76rem; font-weight: 600; border: 1px solid var(--border); background: none; color: var(--text-secondary); cursor: pointer; transition: all 0.18s; font-family: inherit; white-space: nowrap; }
                .cp-date-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }
                .cp-date-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(99,102,241,0.1); }
                .cp-date-picker { background: var(--bg-card); border: 1px solid var(--accent); color: var(--text-primary); border-radius: 8px; padding: 5px 8px; font-size: 0.78rem; outline: none; font-family: inherit; cursor: pointer; }
                .cp-clear-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; padding: 2px; border-radius: 4px; }
                .cp-clear-btn:hover { color: #f87171; }

                /* Complaint cards */
                .cp-list { display: flex; flex-direction: column; gap: 10px; }
                .cp-card { display: flex; align-items: flex-start; gap: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; transition: border-color 0.18s; }
                .cp-card:hover { border-color: var(--border-bright); }
                .cp-card-left { flex: 1; min-width: 0; }
                .cp-card-right { flex-shrink: 0; display: flex; align-items: center; }
                .cp-card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
                .cp-customer-name { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }
                .cp-svc-tag { display: inline-flex; align-items: center; font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; border: 1px solid; }
                .cp-status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid; }
                .cp-desc { font-size: 0.875rem; color: var(--text-primary); margin-bottom: 6px; line-height: 1.5; }
                .cp-meta { font-size: 0.74rem; color: var(--text-secondary); display: flex; gap: 6px; flex-wrap: wrap; }

                .cp-status-sel { background: var(--bg-dark); border: 1px solid; color: inherit; padding: 7px 12px; border-radius: 8px; outline: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; }

                /* Toggle in modal */
                .cp-toggle-row { display: flex; gap: 6px; flex-wrap: wrap; }
                .cp-toggle-btn { padding: 7px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border); background: none; color: var(--text-secondary); cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .cp-toggle-btn:hover { border-color: var(--border-bright); color: var(--text-primary); }

                /* Complaint modal (reuses bm- classes from Payments page) */
                .bm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; backdrop-filter: blur(4px); }
                @media (min-width: 640px) { .bm-overlay { align-items: center; padding: 24px; } }
                .bm-sheet { background: var(--bg-card); border-radius: 24px 24px 0 0; width: 100%; max-width: 540px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border); animation: bmSlideUp 0.25s cubic-bezier(0.4,0,0.2,1); }
                @media (min-width: 640px) { .bm-sheet { border-radius: 24px; max-height: 88vh; } }
                @keyframes bmSlideUp { from { transform: translateY(32px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .bm-header { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); flex-shrink: 0; }
                .bm-header-icon { width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0; background: rgba(99,102,241,0.15); color: var(--accent); display: flex; align-items: center; justify-content: center; }
                .bm-header-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
                .bm-header-sub { font-size: 0.76rem; color: var(--text-secondary); margin-top: 2px; }
                .bm-close { margin-left: auto; background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 9px; padding: 7px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; }
                .bm-close:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
                .bm-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
                .bm-section { display: flex; flex-direction: column; gap: 10px; }
                .bm-section-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 8px; }
                .bm-customer-chip { display: flex; align-items: center; gap: 12px; background: rgba(99,102,241,0.07); border: 1.5px solid rgba(99,102,241,0.25); border-radius: 14px; padding: 12px 14px; }
                .bm-chip-avatar { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; background: var(--accent-gradient); color: white; font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; }
                .bm-chip-info { flex: 1; min-width: 0; }
                .bm-chip-name { font-weight: 700; font-size: 0.9rem; }
                .bm-chip-sub { font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px; }
                .bm-chip-change { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-secondary); padding: 5px 11px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit; }
                .bm-chip-change:hover { color: var(--text-primary); border-color: var(--border-bright); }
                .bl-search { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; padding: 11px 14px; transition: all 0.2s; }
                .bl-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
                .bl-search-icon { color: var(--text-secondary); flex-shrink: 0; }
                .bl-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 0.95rem; }
                .bl-search input::placeholder { color: var(--text-secondary); }
                .bl-search-clear { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; border-radius: 4px; display: flex; }
                .bm-results { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
                .bm-empty { color: var(--text-secondary); font-size: 0.84rem; padding: 4px 0; }
                .bm-hint { color: var(--text-secondary); font-size: 0.82rem; text-align: center; padding: 12px 0; opacity: 0.7; }
                .bm-no-customer-warning { display: flex; align-items: center; gap: 8px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 10px 14px; font-size: 0.82rem; color: #f59e0b; margin-bottom: 8px; }
                .bm-use-name-btn { width: 100%; background: rgba(245,158,11,0.1); border: 1px dashed rgba(245,158,11,0.4); color: #f59e0b; border-radius: 10px; padding: 10px 14px; font-size: 0.84rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.2s; font-family: inherit; }
                .bm-use-name-btn:hover { background: rgba(245,158,11,0.18); border-color: rgba(245,158,11,0.6); }
                .bm-result-row { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 11px; padding: 11px 14px; cursor: pointer; transition: all 0.2s; }
                .bm-result-row:hover { border-color: var(--accent); background: rgba(99,102,241,0.06); }
                .bm-result-avatar { width: 34px; height: 34px; border-radius: 9px; background: var(--accent-gradient); color: white; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .bm-result-info { flex: 1; min-width: 0; }
                .bm-result-name { font-weight: 700; font-size: 0.88rem; }
                .bm-result-meta { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; }
                .bm-submit { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; background: var(--accent-gradient); border: none; color: white; border-radius: 14px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 14px rgba(99,102,241,0.35); }
                .bm-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.45); }
                .bm-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

                /* Notes badge on card */
                .cp-notes-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 20px; background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }

                /* Complaint detail modal notes timeline */
                .cdm-notes-list { display: flex; flex-direction: column; gap: 0; border-left: 2px solid var(--border); padding-left: 14px; margin-left: 6px; }
                .cdm-note { display: flex; gap: 10px; position: relative; padding-bottom: 12px; }
                .cdm-note:last-child { padding-bottom: 0; }
                .cdm-note-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 4px; position: absolute; left: -19px; }
                .cdm-note-content { flex: 1; min-width: 0; }
                .cdm-note-text { font-size: 0.88rem; color: var(--text-primary); line-height: 1.5; margin: 0 0 3px 0; }
                .cdm-note-meta { font-size: 0.72rem; color: var(--text-secondary); }

                /* Empty */
                .cp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: var(--text-secondary); font-size: 0.88rem; }

                /* Pagination */
                .cp-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; padding: 4px 0; }
                .cp-page-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 18px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.18s; font-family: inherit; }
                .cp-page-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
                .cp-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
                .cp-page-info { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }

                @media (max-width: 768px) {
                    .cp-page { padding: 14px 12px; }
                    .cp-stats { gap: 8px; }
                    .cp-stat { flex: 1 1 calc(50% - 4px); }
                    .cp-filters { flex-direction: column; align-items: stretch; }
                    .cp-date-wrap { justify-content: space-between; }
                    .cp-card { flex-direction: column; gap: 10px; }
                    .cp-card-right { width: 100%; }
                    .cp-status-sel { width: 100%; }
                }
                @media (max-width: 640px) {
                    .cp-page { padding: 10px 8px; }

                    /* Header row */
                    .section-header { flex-wrap: wrap; gap: 8px; }
                    .section-header h1 { font-size: 1.4rem; }

                    /* Stats — 2-col grid */
                    .cp-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                    .cp-stat { flex: unset; min-width: unset; padding: 12px 12px; }
                    .cp-stat-num { font-size: 1.3rem; }

                    /* Toolbar — stack vertically */
                    .cp-toolbar { flex-direction: column; align-items: stretch; gap: 8px; }
                    .cp-pill-group { flex-wrap: wrap; gap: 5px; }

                    /* Date bar — horizontal scroll on mobile */
                    .cp-date-bar { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; gap: 5px; }
                    .cp-date-label { display: none; }
                    .cp-date-btn { white-space: nowrap; flex-shrink: 0; }
                    .cp-date-picker { flex-shrink: 0; width: auto; font-size: 16px !important; }

                    /* Complaint cards */
                    .cp-card { padding: 12px 12px; }
                    .cp-card-top { gap: 6px; }
                    .cp-customer-name { font-size: 0.88rem; }
                    .cp-desc { font-size: 0.82rem; }
                    .cp-meta { font-size: 0.7rem; gap: 4px; flex-wrap: wrap; }

                    /* Modal — bottom sheet */
                    .bm-overlay { align-items: flex-end !important; padding: 0 !important; }
                    .bm-sheet { border-radius: 20px 20px 0 0 !important; max-width: 100% !important; max-height: 95vh !important; }
                    .bm-body { padding: 14px 14px; gap: 12px; }
                    .bm-header { padding: 14px 14px; }

                    /* Status buttons row in detail modal — wrap */
                    .bm-body > div > div[style*="display: flex"][style*="gap: 6px"] { flex-wrap: wrap !important; }

                    /* Service type toggles — wrap */
                    .cp-toggle-row { flex-wrap: wrap; gap: 6px; }
                    .cp-toggle-btn { flex: 1 1 auto; min-width: 80px; text-align: center; }

                    /* Service filter pills — wrap */
                    .cp-pill-group { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
                    .cp-svc-pill-btn { flex-shrink: 0; }

                    /* Inputs in modal — prevent iOS auto-zoom */
                    .bm-body input,
                    .bm-body select,
                    .bm-body textarea { font-size: 16px !important; width: 100%; box-sizing: border-box; }
                    .bl-search input { font-size: 16px !important; }

                    /* Notes list items */
                    .cdm-notes-list { padding-left: 12px; margin-left: 4px; }
                    .cdm-note { padding-bottom: 10px; gap: 8px; }
                    .cdm-note-text { font-size: 0.84rem; }
                    .cdm-note-meta { font-size: 0.68rem; }

                    /* Search box full width */
                    .search-box { width: 100%; box-sizing: border-box; }

                    /* Customer banner — wrap */
                    .cp-customer-banner { flex-direction: column; align-items: flex-start; gap: 6px; }

                    /* Pagination — center and compact */
                    .cp-pagination { gap: 10px; margin-top: 12px; }
                    .cp-page-btn { padding: 7px 14px; font-size: 0.8rem; }
                    .cp-page-info { font-size: 0.8rem; }
                }
            `}</style>
        </div>
    );
};

export default Complaints;
