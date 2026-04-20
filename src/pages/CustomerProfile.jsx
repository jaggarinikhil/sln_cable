import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { MapPin, Phone, Box, Calendar, ArrowLeft, Wifi, Tv, Receipt, Pencil, CreditCard, ChevronDown } from 'lucide-react';
import CustomerHistory from '../components/CustomerHistory';
import CustomerModal from '../components/CustomerModal';

const VALIDITY_LABELS = { '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year' };

const CustomerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { customers, bills, complaints, updateCustomer, addBill } = useData();

    const customer = customers.find(c => c.id === id);
    const customerBills = bills.filter(b => b.customerId === id);
    const customerComplaints = complaints.filter(c => c.customerId === id);

    const totalOutstanding = customerBills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const totalBilled = customerBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = customerBills.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const pendingCount = customerBills.filter(b => b.balance > 0).length;

    const tvOutstanding = customerBills
        .filter(b => b.balance > 0 && (b.serviceType === 'tv' || b.serviceType === 'both'))
        .reduce((sum, b) => {
            if (b.serviceType === 'tv') return sum + b.balance;
            const ratio = b.totalAmount > 0 ? (b.tvAmount || 0) / b.totalAmount : 0.5;
            return sum + b.balance * ratio;
        }, 0);
    const internetOutstanding = customerBills
        .filter(b => b.balance > 0 && (b.serviceType === 'internet' || b.serviceType === 'both'))
        .reduce((sum, b) => {
            if (b.serviceType === 'internet') return sum + b.balance;
            const ratio = b.totalAmount > 0 ? (b.internetAmount || 0) / b.totalAmount : 0.5;
            return sum + b.balance * ratio;
        }, 0);

    const [editOpen, setEditOpen] = useState(false);
    const [complaintsOpen, setComplaintsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    if (!customer) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Customer not found.</div>;

    const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const internet = customer.services?.internet;
    const tv = customer.services?.tv;

    return (
        <div className="pp-page">

            {/* ── Hero ── */}
            <div className="pp-hero">
                <button className="pp-back" onClick={() => navigate('/customers')}><ArrowLeft size={18} /></button>
                <div className="pp-avatar">{initials}</div>
                <div className="pp-hero-info">
                    <h1 className="pp-name">{customer.name}</h1>
                    <div className="pp-hero-meta">
                        <span className="pp-phone"><Phone size={13} />{customer.phone}</span>
                        {customer.address && <span className="pp-addr"><MapPin size={13} />{customer.address}</span>}
                    </div>
                    <div className="pp-badges">
                        <span className="pp-badge pp-badge-active">Active</span>
                        {tv?.active && <span className="pp-badge pp-badge-tv"><Tv size={11} /> TV</span>}
                        {internet?.active && <span className="pp-badge pp-badge-net"><Wifi size={11} /> Internet</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    <button className="pp-edit-btn" onClick={() => setEditOpen(true)}>
                        <Pencil size={14} /> Edit
                    </button>
                    {totalOutstanding > 0 && (
                        <button className="pp-pay-btn" onClick={() => navigate('/payments', { state: { tab: 'payment', customerId: id } })}>
                            <CreditCard size={15} /> Pay Bill
                        </button>
                    )}
                    <button className="pp-gen-btn" onClick={() => navigate('/billing', { state: { tab: 'generate', customerId: id } })}>
                        <Receipt size={15} /> Generate Bill
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="pp-stats">
                <div className="pp-stat pp-stat-billed">
                    <span className="pp-stat-label">Total Billed</span>
                    <span className="pp-stat-val">₹{totalBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="pp-stat pp-stat-paid">
                    <span className="pp-stat-label">Total Paid</span>
                    <span className="pp-stat-val">₹{totalPaid.toLocaleString('en-IN')}</span>
                </div>
                {tv?.active && (
                    <div className="pp-stat pp-stat-tv">
                        <span className="pp-stat-label">TV Due</span>
                        <span className="pp-stat-val">₹{tvOutstanding.toLocaleString('en-IN')}</span>
                    </div>
                )}
                {internet?.active && (
                    <div className="pp-stat pp-stat-net">
                        <span className="pp-stat-label">Internet Due</span>
                        <span className="pp-stat-val">₹{internetOutstanding.toLocaleString('en-IN')}</span>
                    </div>
                )}
                <div className={`pp-stat pp-stat-total ${totalOutstanding > 0 ? 'has-due' : 'all-clear'}`}>
                    <span className="pp-stat-label">Total Outstanding</span>
                    <span className="pp-stat-val">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                    <span className="pp-stat-sub">{pendingCount > 0 ? `${pendingCount} bill${pendingCount > 1 ? 's' : ''} pending` : 'All clear'}</span>
                </div>
            </div>

            {/* ── Info cards row: Contact | TV | Internet ── */}
            <div className="pp-info-row-wrap">

                {/* Contact card */}
                <div className="pp-card pp-info-card">
                    <div className="pp-card-title">Contact Details</div>
                    <div className="pp-info-row">
                        <Phone size={14} className="pp-icon" />
                        <span>{customer.phone}</span>
                    </div>
                    {customer.address && (
                        <div className="pp-info-row">
                            <MapPin size={14} className="pp-icon" />
                            <span>{customer.address}</span>
                        </div>
                    )}
                    {customer.boxNumber && (
                        <div className="pp-info-row">
                            <Box size={14} className="pp-icon" />
                            <span>Box #{customer.boxNumber}</span>
                        </div>
                    )}
                    <div className="pp-info-row">
                        <Calendar size={14} className="pp-icon" />
                        <span>Since {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* TV plan card */}
                {tv?.active && (
                    <div className="pp-card pp-tv-card pp-info-card">
                        <div className="pp-plan-header">
                            <div className="pp-plan-icon pp-plan-icon-tv"><Tv size={16} /></div>
                            <div>
                                <div className="pp-card-title" style={{ marginBottom: 2 }}>TV Service</div>
                                <div className="pp-plan-speed pp-plan-speed-tv">Active</div>
                            </div>
                        </div>
                        {tv.annualSubscription && (
                            <div className="pp-annual-badge">
                                <span>★ Annual Subscriber</span>
                            </div>
                        )}
                        <div className="pp-plan-grid">
                            {customer.boxNumber && (
                                <div className="pp-plan-item">
                                    <span className="pp-plan-item-label">Box Number</span>
                                    <span className="pp-plan-item-val">#{customer.boxNumber}</span>
                                </div>
                            )}
                            {tv.monthlyRate > 0 && (
                                <div className="pp-plan-item">
                                    <span className="pp-plan-item-label">{tv.annualSubscription ? 'Annual Rate' : 'Monthly Rate'}</span>
                                    <span className="pp-plan-item-val pp-plan-rate">₹{tv.monthlyRate}{tv.annualSubscription ? '/yr' : '/mo'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Internet plan card */}
                {internet?.active && (
                    <div className="pp-card pp-plan-card pp-info-card">
                        <div className="pp-plan-header">
                            <div className="pp-plan-icon"><Wifi size={16} /></div>
                            <div>
                                <div className="pp-card-title" style={{ marginBottom: 2 }}>Internet Plan</div>
                                {internet.speed
                                    ? <div className="pp-plan-speed">{internet.speed} Mbps</div>
                                    : <div className="pp-plan-speed" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>No speed set</div>}
                            </div>
                        </div>
                        <div className="pp-plan-grid">
                            {internet.validity && (
                                <div className="pp-plan-item">
                                    <span className="pp-plan-item-label">Validity</span>
                                    <span className="pp-plan-item-val">{VALIDITY_LABELS[internet.validity] || internet.validity}</span>
                                </div>
                            )}
                            {internet.monthlyRate > 0 && (
                                <div className="pp-plan-item">
                                    <span className="pp-plan-item-label">Monthly Rate</span>
                                    <span className="pp-plan-item-val pp-plan-rate">₹{internet.monthlyRate}</span>
                                </div>
                            )}
                            {internet.subscribedDate && (
                                <div className="pp-plan-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="pp-plan-item-label">Subscribed On</span>
                                    <span className="pp-plan-item-val">{new Date(internet.subscribedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                            )}
                            {!internet.validity && !internet.monthlyRate && !internet.subscribedDate && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        No plan details — <button onClick={() => setEditOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', font: 'inherit', fontSize: '0.78rem', padding: 0 }}>edit to add</button>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* ── Complaints — collapsible ── */}
            <div className="pp-card pp-collapsible-card">
                <button className="pp-collapse-header" onClick={() => setComplaintsOpen(o => !o)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="pp-card-title" style={{ margin: 0 }}>Complaints</div>
                        {customerComplaints.length > 0 && (
                            <span className="pp-collapse-count">{customerComplaints.length}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="pp-link-btn" onClick={e => { e.stopPropagation(); navigate('/complaints', { state: { openModal: true, customerId: id } }); }}>+ New</button>
                        <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transform: complaintsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                </button>
                {complaintsOpen && (
                    <div className="pp-collapse-body">
                        {customerComplaints.length === 0 ? (
                            <p className="pp-empty">No complaints filed.</p>
                        ) : (
                            [...customerComplaints]
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .slice(0, 5)
                                .map(c => {
                                    const svc = (c.serviceType || 'general').toLowerCase();
                                    const svcLabel = { tv: 'TV', internet: 'Internet', general: 'General' }[svc] || svc;
                                    const svcColor = { tv: '#a855f7', internet: '#06b6d4', general: 'var(--text-secondary)' }[svc];
                                    return (
                                        <div key={c.id} className="pp-complaint">
                                            <div className="pp-complaint-dot" data-status={c.status} />
                                            <div className="pp-complaint-body">
                                                <p className="pp-complaint-desc">{c.description}</p>
                                                <p className="pp-complaint-date">
                                                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    <span style={{ marginLeft: 6, color: svcColor, fontWeight: 700 }}>· {svcLabel}</span>
                                                </p>
                                            </div>
                                            <span className={`pp-complaint-tag ${c.status === 'Completed' ? 'tag-done' : c.status === 'In Progress' ? 'tag-inprog' : 'tag-pending'}`}>{c.status}</span>
                                        </div>
                                    );
                                })
                        )}
                        {customerComplaints.length > 0 && (
                            <button className="pp-link-btn" style={{ display: 'block', marginTop: 8 }} onClick={() => navigate('/complaints', { state: { filterCustomerId: id } })}>View All →</button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Billing & Payment History — collapsible ── */}
            <div className="pp-card pp-collapsible-card">
                <button className="pp-collapse-header" onClick={() => setHistoryOpen(o => !o)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="pp-card-title" style={{ margin: 0 }}>Billing &amp; Payment History</div>
                        {customerBills.length > 0 && (
                            <span className="pp-collapse-count">{customerBills.length} bill{customerBills.length > 1 ? 's' : ''}</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="pp-link-btn" onClick={e => { e.stopPropagation(); navigate('/billing', { state: { tab: 'generate', customerId: id } }); }}>+ New Bill</button>
                        <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transform: historyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                </button>
                {historyOpen && (
                    <div className="pp-collapse-body">
                        <CustomerHistory customerId={id} />
                    </div>
                )}
            </div>

            {editOpen && (
                <CustomerModal
                    customer={customer}
                    onClose={() => setEditOpen(false)}
                    onSave={(data, billSpec) => {
                        updateCustomer(id, data);
                        if (billSpec) addBill({ ...billSpec, customerId: id });
                        setEditOpen(false);
                    }}
                />
            )}

            <style>{`
                .pp-page { padding: 24px 32px; width: 100%; }

                /* Hero */
                .pp-hero {
                    display: flex; align-items: center; gap: 18px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 20px; padding: 22px 24px; margin-bottom: 16px;
                }
                .pp-back {
                    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
                    border-radius: 10px; width: 36px; height: 36px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: var(--text-secondary); transition: all 0.2s;
                }
                .pp-back:hover { color: var(--text-primary); border-color: var(--border-bright); background: rgba(255,255,255,0.09); }
                .pp-avatar {
                    width: 60px; height: 60px; border-radius: 18px; flex-shrink: 0;
                    background: var(--accent-gradient); color: white;
                    font-weight: 800; font-size: 1.3rem;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.3);
                }
                .pp-hero-info { flex: 1; min-width: 0; }
                .pp-name { font-size: 1.5rem; font-weight: 800; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .pp-hero-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 8px; }
                .pp-phone, .pp-addr { display: flex; align-items: center; gap: 5px; font-size: 0.82rem; color: var(--text-secondary); }
                .pp-badges { display: flex; gap: 6px; flex-wrap: wrap; }
                .pp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
                .pp-badge-active { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
                .pp-badge-tv { background: rgba(168,85,247,0.12); color: #a855f7; border: 1px solid rgba(168,85,247,0.25); }
                .pp-annual-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 8px; font-size: 0.72rem; font-weight: 700; background: rgba(168,85,247,0.12); color: #a855f7; border: 1px solid rgba(168,85,247,0.3); margin-bottom: 10px; }
                .pp-badge-net { background: rgba(6,182,212,0.12); color: #06b6d4; border: 1px solid rgba(6,182,212,0.25); }
                .pp-gen-btn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 10px 18px; background: var(--accent-gradient);
                    color: white; border: none; border-radius: 12px;
                    font-size: 0.85rem; font-weight: 700; cursor: pointer;
                    white-space: nowrap; flex-shrink: 0;
                    box-shadow: 0 3px 10px rgba(99,102,241,0.3);
                    transition: all 0.2s; font-family: inherit;
                }
                .pp-gen-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(99,102,241,0.4); }
                .pp-edit-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 10px 16px; background: rgba(255,255,255,0.06);
                    color: var(--text-secondary); border: 1px solid var(--border);
                    border-radius: 12px; font-size: 0.85rem; font-weight: 600;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    transition: all 0.2s; font-family: inherit;
                }
                .pp-edit-btn:hover { color: var(--text-primary); border-color: var(--border-bright); background: rgba(255,255,255,0.1); }
                .pp-pay-btn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 10px 16px; background: rgba(16,185,129,0.12);
                    color: #10b981; border: 1px solid rgba(16,185,129,0.35);
                    border-radius: 12px; font-size: 0.85rem; font-weight: 700;
                    cursor: pointer; white-space: nowrap; flex-shrink: 0;
                    transition: all 0.2s; font-family: inherit;
                }
                .pp-pay-btn:hover { background: rgba(16,185,129,0.2); border-color: #10b981; transform: translateY(-1px); }

                /* Stats */
                .pp-stats {
                    display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;
                }
                .pp-stat {
                    flex: 1; min-width: 120px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 14px; padding: 14px 16px;
                    display: flex; flex-direction: column; gap: 3px;
                }
                .pp-stat-label { font-size: 0.67rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
                .pp-stat-val { font-size: 1.2rem; font-weight: 800; }
                .pp-stat-sub { font-size: 0.68rem; color: var(--text-secondary); }
                .pp-stat-billed .pp-stat-val { color: var(--text-primary); }
                .pp-stat-paid .pp-stat-val { color: #10b981; }
                .pp-stat-tv .pp-stat-val { color: #a855f7; }
                .pp-stat-net .pp-stat-val { color: #06b6d4; }
                .pp-stat-total.has-due { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.04); }
                .pp-stat-total.has-due .pp-stat-val { color: #f87171; }
                .pp-stat-total.all-clear { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.04); }
                .pp-stat-total.all-clear .pp-stat-val { color: #10b981; }

                /* Info cards — horizontal row */
                .pp-info-row-wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; align-items: flex-start; margin-bottom: 14px; }
                .pp-info-card { margin-bottom: 0 !important; }

                /* Collapsible sections */
                .pp-collapsible-card { padding: 0; margin-bottom: 12px; overflow: hidden; }
                .pp-collapse-header {
                    display: flex; align-items: center; justify-content: space-between;
                    width: 100%; padding: 16px 20px; background: none; border: none;
                    cursor: pointer; font-family: inherit; color: var(--text-primary);
                    transition: background 0.15s;
                }
                .pp-collapse-header:hover { background: rgba(255,255,255,0.03); }
                .pp-collapse-count {
                    font-size: 0.68rem; font-weight: 700; padding: 2px 8px;
                    background: rgba(99,102,241,0.15); color: var(--accent);
                    border: 1px solid rgba(99,102,241,0.25); border-radius: 20px;
                }
                .pp-collapse-body { padding: 0 20px 18px; border-top: 1px solid var(--border); padding-top: 14px; }

                /* Cards */
                .pp-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 16px; padding: 20px; margin-bottom: 14px;
                }
                .pp-card:last-child { margin-bottom: 0; }
                .pp-card-title { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 14px; }
                .pp-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
                .pp-card-header .pp-card-title { margin-bottom: 0; }
                .pp-link-btn { background: none; border: none; color: var(--accent); font-size: 0.78rem; font-weight: 700; cursor: pointer; padding: 0; font-family: inherit; }
                .pp-link-btn:hover { opacity: 0.75; }

                /* Contact info rows */
                .pp-info-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 0.875rem; color: var(--text-primary); }
                .pp-info-row:last-child { border-bottom: none; padding-bottom: 0; }
                .pp-icon { color: var(--accent); flex-shrink: 0; margin-top: 2px; }

                /* TV plan card */
                .pp-tv-card { border-color: rgba(168,85,247,0.25); background: rgba(168,85,247,0.03); }
                .pp-plan-icon-tv { background: rgba(168,85,247,0.12) !important; color: #a855f7 !important; }
                .pp-plan-speed-tv { font-size: 0.82rem !important; font-weight: 700 !important; color: #a855f7 !important; }

                /* Internet plan card */
                .pp-plan-card { border-color: rgba(6,182,212,0.25); background: rgba(6,182,212,0.03); }
                .pp-plan-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
                .pp-plan-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(6,182,212,0.12); color: #06b6d4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .pp-plan-speed { font-size: 1rem; font-weight: 800; color: #06b6d4; }
                .pp-plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .pp-plan-item { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px 12px; }
                .pp-plan-item-label { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 4px; }
                .pp-plan-item-val { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
                .pp-plan-rate { color: #10b981; }

                /* Complaints */
                .pp-empty { font-size: 0.82rem; color: var(--text-secondary); padding: 4px 0; }
                .pp-complaint { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
                .pp-complaint:last-child { border-bottom: none; }
                .pp-complaint-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
                .pp-complaint-dot[data-status="Completed"] { background: #10b981; }
                .pp-complaint-dot[data-status="Pending"] { background: #ef4444; }
                .pp-complaint-body { flex: 1; min-width: 0; }
                .pp-complaint-desc { font-size: 0.84rem; font-weight: 600; margin-bottom: 3px; }
                .pp-complaint-date { font-size: 0.72rem; color: var(--text-secondary); }
                .pp-complaint-tag { font-size: 0.67rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
                .tag-done { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
                .tag-inprog { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }
                .tag-pending { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }


                /* Responsive */
                @media (max-width: 840px) {
                    .pp-info-row-wrap { grid-template-columns: 1fr 1fr; }
                }
                @media (max-width: 640px) {
                    .pp-info-row-wrap { grid-template-columns: 1fr; }
                    .pp-page { padding: 12px; }
                    .pp-hero { flex-wrap: wrap; gap: 10px; }
                    .pp-hero-info { min-width: 0; flex: 1 1 180px; }
                    .pp-name { font-size: 1.15rem; white-space: normal; }
                    .pp-hero > div:last-child { width: 100%; display: flex; gap: 8px; }
                    .pp-edit-btn, .pp-pay-btn, .pp-gen-btn { flex: 1; justify-content: center; }
                    .pp-avatar { width: 44px; height: 44px; font-size: 0.95rem; border-radius: 12px; flex-shrink: 0; }
                    .pp-stats { gap: 8px; }
                    .pp-stat { flex: 1 1 calc(50% - 4px); min-width: 0; }
                    .pp-stat-val { font-size: 1rem; }
                    .pp-addr { display: none; }
                }
            `}</style>
        </div>
    );
};

export default CustomerProfile;
