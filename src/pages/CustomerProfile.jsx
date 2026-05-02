import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
    MapPin, Phone, Box, Calendar, ArrowLeft, Wifi, Tv, Receipt,
    Pencil, CreditCard, AlertCircle, CheckCircle2, Activity, IndianRupee,
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';

const VALIDITY_LABELS = { '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year' };
const ZONE_LABELS = {
    zone1_sln: 'Zone 1 — SLN',
    zone2_raju: 'Zone 2 — Raju',
    zone3_channareddy: 'Zone 3 — Channareddy',
    zone4_ravisetu: 'Zone 4 — Ravisetu',
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const CustomerProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { customers, bills, complaints, payments, updateCustomer, addBill } = useData();

    const customer = customers.find(c => c.id === id);
    const customerBills = bills.filter(b => b.customerId === id);
    const customerComplaints = complaints.filter(c => c.customerId === id);

    // Flat payments list — try context.payments first, else derive from bills
    const customerPayments = useMemo(() => {
        if (Array.isArray(payments)) {
            const direct = payments.filter(p => p.customerId === id);
            if (direct.length) return direct;
        }
        const out = [];
        customerBills.forEach(b => {
            (b.payments || []).forEach(p => {
                out.push({
                    id: p.id || `${b.id}-${p.date}`,
                    billId: b.id,
                    amount: p.amount,
                    date: p.date || p.paidAt || p.createdAt,
                    method: p.method || p.mode,
                    note: p.note,
                });
            });
        });
        return out;
    }, [payments, customerBills, id]);

    const totalOutstanding = customerBills.reduce((s, b) => s + (b.balance || 0), 0);
    const totalPaid = customerBills.reduce((s, b) => s + (b.amountPaid || 0), 0);
    const pendingCount = customerBills.filter(b => b.balance > 0).length;

    const [editOpen, setEditOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('bills');

    if (!customer) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Customer not found.</div>;

    const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const internet = customer.services?.internet;
    const tv = customer.services?.tv;
    const activeServices = (tv?.active ? 1 : 0) + (internet?.active ? 1 : 0);

    return (
        <div className="cp-page">

            {/* ── Hero ── */}
            <div className="cp-hero">
                <div className="cp-hero-glow" />
                <button className="cp-back" onClick={() => navigate('/customers')} aria-label="Back">
                    <ArrowLeft size={18} />
                </button>

                <div className="cp-hero-main">
                    <div className="cp-avatar">{initials}</div>
                    <div className="cp-hero-info">
                        <h1 className="cp-name">{customer.name}</h1>
                        <div className="cp-meta-rows">
                            <span className="cp-meta-row"><Phone size={13} /> {customer.phone}</span>
                            {customer.address && <span className="cp-meta-row"><MapPin size={13} /> {customer.address}</span>}
                            {customer.zone && <span className="cp-meta-row"><Activity size={13} /> {ZONE_LABELS[customer.zone] || customer.zone}</span>}
                            {customer.boxNumber && <span className="cp-meta-row"><Box size={13} /> Box #{customer.boxNumber}</span>}
                        </div>
                        <div className="cp-since"><Calendar size={11} /> Customer since {fmtDate(customer.createdAt)}</div>
                    </div>
                </div>

                <div className="cp-hero-actions">
                    <button className="cp-btn cp-btn-ghost" onClick={() => setEditOpen(true)}>
                        <Pencil size={14} /> Edit
                    </button>
                    {totalOutstanding > 0 && (
                        <button className="cp-btn cp-btn-pay" onClick={() => navigate('/payments', { state: { tab: 'payment', customerId: id } })}>
                            <CreditCard size={15} /> Pay
                        </button>
                    )}
                    <button className="cp-btn cp-btn-primary" onClick={() => navigate('/billing', { state: { tab: 'generate', customerId: id } })}>
                        <Receipt size={15} /> Generate Bill
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="cp-stats">
                <div className="cp-stat cp-stat-red">
                    <div className="cp-stat-icon"><AlertCircle size={18} /></div>
                    <div className="cp-stat-body">
                        <span className="cp-stat-label">Outstanding</span>
                        <span className="cp-stat-val">{fmt(totalOutstanding)}</span>
                        <span className="cp-stat-sub">{pendingCount > 0 ? `${pendingCount} pending` : 'All clear'}</span>
                    </div>
                </div>
                <div className="cp-stat cp-stat-green">
                    <div className="cp-stat-icon"><CheckCircle2 size={18} /></div>
                    <div className="cp-stat-body">
                        <span className="cp-stat-label">Total Paid</span>
                        <span className="cp-stat-val">{fmt(totalPaid)}</span>
                        <span className="cp-stat-sub">{customerPayments.length} payments</span>
                    </div>
                </div>
                <div className="cp-stat cp-stat-blue">
                    <div className="cp-stat-icon"><Activity size={18} /></div>
                    <div className="cp-stat-body">
                        <span className="cp-stat-label">Active Services</span>
                        <span className="cp-stat-val">{activeServices}</span>
                        <span className="cp-stat-sub">
                            {tv?.active && 'TV'}{tv?.active && internet?.active && ' + '}{internet?.active && 'Internet'}
                            {!activeServices && 'None'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Plan Cards ── */}
            {(tv?.active || internet?.active) && (
                <div className="cp-plans">
                    {tv?.active && (
                        <div className="cp-plan-card cp-plan-tv">
                            <div className="cp-plan-head">
                                <div className="cp-plan-icon cp-plan-icon-tv"><Tv size={18} /></div>
                                <div>
                                    <div className="cp-plan-title">TV Plan</div>
                                    <div className="cp-plan-sub">Active</div>
                                </div>
                                {tv.annualSubscription && <span className="cp-annual">★ Annual</span>}
                            </div>
                            <div className="cp-plan-grid">
                                {tv.monthlyRate > 0 && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">{tv.annualSubscription ? 'Annual Rate' : 'Monthly Rate'}</span>
                                        <span className="cp-plan-v">{fmt(tv.monthlyRate)}{tv.annualSubscription ? '/yr' : '/mo'}</span>
                                    </div>
                                )}
                                {tv.installationFee > 0 && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">Installation</span>
                                        <span className="cp-plan-v">{fmt(tv.installationFee)}</span>
                                    </div>
                                )}
                                {customer.boxNumber && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">Box Number</span>
                                        <span className="cp-plan-v">#{customer.boxNumber}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {internet?.active && (
                        <div className="cp-plan-card cp-plan-net">
                            <div className="cp-plan-head">
                                <div className="cp-plan-icon cp-plan-icon-net"><Wifi size={18} /></div>
                                <div>
                                    <div className="cp-plan-title">Internet Plan</div>
                                    <div className="cp-plan-sub">{internet.speed ? `${internet.speed} Mbps` : 'Active'}</div>
                                </div>
                            </div>
                            <div className="cp-plan-grid">
                                {internet.validity && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">Validity</span>
                                        <span className="cp-plan-v">{VALIDITY_LABELS[internet.validity] || internet.validity}</span>
                                    </div>
                                )}
                                {internet.monthlyRate > 0 && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">Monthly Rate</span>
                                        <span className="cp-plan-v">{fmt(internet.monthlyRate)}</span>
                                    </div>
                                )}
                                {internet.subscribedDate && (
                                    <div className="cp-plan-item">
                                        <span className="cp-plan-l">Subscribed</span>
                                        <span className="cp-plan-v">{fmtDate(internet.subscribedDate)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="cp-tabs-wrap">
                <div className="cp-tabs">
                    <button className={`cp-tab ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}>
                        Bills <span className="cp-tab-count">{customerBills.length}</span>
                    </button>
                    <button className={`cp-tab ${activeTab === 'complaints' ? 'active' : ''}`} onClick={() => setActiveTab('complaints')}>
                        Complaints <span className="cp-tab-count">{customerComplaints.length}</span>
                    </button>
                    <button className={`cp-tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
                        Payments <span className="cp-tab-count">{customerPayments.length}</span>
                    </button>
                </div>

                <div className="cp-tab-body">
                    {activeTab === 'bills' && (
                        customerBills.length === 0 ? (
                            <p className="cp-empty">No bills yet.</p>
                        ) : (
                            <div className="cp-list">
                                {[...customerBills].sort((a, b) => new Date(b.createdAt || b.billDate) - new Date(a.createdAt || a.billDate)).map(b => {
                                    const paid = (b.balance || 0) <= 0;
                                    return (
                                        <div key={b.id} className="cp-bill">
                                            <div className="cp-bill-left">
                                                <div className={`cp-bill-dot ${paid ? 'paid' : 'due'}`} />
                                                <div>
                                                    <div className="cp-bill-title">
                                                        {b.serviceType === 'both' ? 'TV + Internet' : b.serviceType === 'tv' ? 'TV' : 'Internet'}
                                                        <span className="cp-bill-amt">· {fmt(b.totalAmount)}</span>
                                                    </div>
                                                    <div className="cp-bill-date">{fmtDate(b.createdAt || b.billDate)}</div>
                                                </div>
                                            </div>
                                            <div className="cp-bill-right">
                                                {paid ? (
                                                    <span className="cp-tag cp-tag-green">Paid</span>
                                                ) : (
                                                    <span className="cp-tag cp-tag-red">Due {fmt(b.balance)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {activeTab === 'complaints' && (
                        customerComplaints.length === 0 ? (
                            <p className="cp-empty">No complaints filed.</p>
                        ) : (
                            <div className="cp-list">
                                {[...customerComplaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => {
                                    const svc = (c.serviceType || 'general').toLowerCase();
                                    const svcLabel = { tv: 'TV', internet: 'Internet', general: 'General' }[svc] || svc;
                                    return (
                                        <div key={c.id} className="cp-complaint">
                                            <div className="cp-complaint-body">
                                                <p className="cp-complaint-desc">{c.description}</p>
                                                <p className="cp-complaint-meta">{fmtDate(c.createdAt)} · {svcLabel}</p>
                                            </div>
                                            <span className={`cp-tag ${c.status === 'Completed' ? 'cp-tag-green' : c.status === 'In Progress' ? 'cp-tag-amber' : 'cp-tag-red'}`}>{c.status}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {activeTab === 'payments' && (
                        customerPayments.length === 0 ? (
                            <p className="cp-empty">No payments recorded.</p>
                        ) : (
                            <div className="cp-list">
                                {[...customerPayments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                                    <div key={p.id} className="cp-pay">
                                        <div className="cp-pay-icon"><IndianRupee size={14} /></div>
                                        <div className="cp-pay-body">
                                            <div className="cp-pay-amt">{fmt(p.amount)}</div>
                                            <div className="cp-pay-meta">{fmtDate(p.date)}{p.method ? ` · ${p.method}` : ''}</div>
                                        </div>
                                        <span className="cp-tag cp-tag-green">Received</span>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {editOpen && (
                <CustomerModal
                    customer={customer}
                    onClose={() => setEditOpen(false)}
                    onSave={(data, billSpec) => {
                        updateCustomer(id, data);
                        if (billSpec) addBill({ ...billSpec, customerId: id, customerName: customer.name, phone: customer.phone, boxNumber: customer.boxNumber });
                        setEditOpen(false);
                    }}
                />
            )}

            <style>{`
                .cp-page { padding: 24px 32px; width: 100%; }

                /* Hero */
                .cp-hero {
                    position: relative; overflow: hidden;
                    display: flex; align-items: center; gap: 18px;
                    background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 60%, var(--bg-card) 100%);
                    border: 1px solid var(--border);
                    border-radius: 20px; padding: 24px 26px; margin-bottom: 18px;
                }
                .cp-hero-glow {
                    position: absolute; top: -60px; right: -60px;
                    width: 220px; height: 220px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
                    pointer-events: none;
                }
                .cp-back {
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    border-radius: 12px; width: 38px; height: 38px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: var(--text-secondary); transition: all 0.2s;
                    z-index: 1;
                }
                .cp-back:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
                .cp-hero-main { display: flex; align-items: center; gap: 18px; flex: 1; min-width: 0; z-index: 1; }
                .cp-avatar {
                    width: 76px; height: 76px; border-radius: 50%; flex-shrink: 0;
                    background: linear-gradient(135deg, #6366f1 0%, #a855f7 60%, #ec4899 100%);
                    color: white; font-weight: 800; font-size: 1.7rem;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 24px rgba(99,102,241,0.4);
                    border: 3px solid rgba(255,255,255,0.1);
                }
                .cp-hero-info { flex: 1; min-width: 0; }
                .cp-name { font-size: 1.6rem; font-weight: 800; margin: 0 0 8px; color: var(--text-primary); line-height: 1.15; }
                .cp-meta-rows { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 6px; }
                .cp-meta-row { display: inline-flex; align-items: center; gap: 5px; font-size: 0.82rem; color: var(--text-secondary); }
                .cp-meta-row svg { color: var(--accent); }
                .cp-since { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--text-secondary); opacity: 0.75; margin-top: 4px; }

                .cp-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; z-index: 1; }
                .cp-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 10px 16px; border-radius: 12px; font-size: 0.85rem;
                    font-weight: 700; cursor: pointer; white-space: nowrap;
                    transition: all 0.2s; font-family: inherit; border: 1px solid transparent;
                }
                .cp-btn-ghost { background: rgba(255,255,255,0.06); color: var(--text-secondary); border-color: var(--border); }
                .cp-btn-ghost:hover { color: var(--text-primary); background: rgba(255,255,255,0.1); }
                .cp-btn-primary { background: linear-gradient(135deg, #6366f1, #a855f7); color: white; box-shadow: 0 4px 14px rgba(99,102,241,0.35); }
                .cp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.45); }
                .cp-btn-pay { background: rgba(16,185,129,0.14); color: #10b981; border-color: rgba(16,185,129,0.35); }
                .cp-btn-pay:hover { background: rgba(16,185,129,0.22); }

                /* Stats */
                .cp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
                .cp-stat {
                    display: flex; align-items: center; gap: 14px;
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 18px; padding: 18px 20px;
                    transition: transform 0.2s, border-color 0.2s;
                }
                .cp-stat:hover { transform: translateY(-2px); }
                .cp-stat-icon {
                    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .cp-stat-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
                .cp-stat-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
                .cp-stat-val { font-size: 1.35rem; font-weight: 800; color: var(--text-primary); }
                .cp-stat-sub { font-size: 0.7rem; color: var(--text-secondary); }
                .cp-stat-red { background: linear-gradient(135deg, rgba(239,68,68,0.08), var(--bg-card)); border-color: rgba(239,68,68,0.25); }
                .cp-stat-red .cp-stat-icon { background: rgba(239,68,68,0.14); color: #f87171; }
                .cp-stat-red .cp-stat-val { color: #f87171; }
                .cp-stat-green { background: linear-gradient(135deg, rgba(16,185,129,0.08), var(--bg-card)); border-color: rgba(16,185,129,0.25); }
                .cp-stat-green .cp-stat-icon { background: rgba(16,185,129,0.14); color: #10b981; }
                .cp-stat-green .cp-stat-val { color: #10b981; }
                .cp-stat-blue { background: linear-gradient(135deg, rgba(59,130,246,0.08), var(--bg-card)); border-color: rgba(59,130,246,0.25); }
                .cp-stat-blue .cp-stat-icon { background: rgba(59,130,246,0.14); color: #60a5fa; }
                .cp-stat-blue .cp-stat-val { color: #60a5fa; }

                /* Plans */
                .cp-plans { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
                .cp-plan-card {
                    background: var(--bg-card); border: 1px solid var(--border);
                    border-radius: 18px; padding: 20px;
                }
                .cp-plan-tv { background: linear-gradient(135deg, rgba(168,85,247,0.06), var(--bg-card)); border-color: rgba(168,85,247,0.25); }
                .cp-plan-net { background: linear-gradient(135deg, rgba(6,182,212,0.06), var(--bg-card)); border-color: rgba(6,182,212,0.25); }
                .cp-plan-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
                .cp-plan-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .cp-plan-icon-tv { background: rgba(168,85,247,0.15); color: #c084fc; }
                .cp-plan-icon-net { background: rgba(6,182,212,0.15); color: #22d3ee; }
                .cp-plan-title { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
                .cp-plan-sub { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
                .cp-plan-tv .cp-plan-sub { color: #c084fc; }
                .cp-plan-net .cp-plan-sub { color: #22d3ee; }
                .cp-annual { margin-left: auto; font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
                .cp-plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .cp-plan-item { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; }
                .cp-plan-l { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 4px; }
                .cp-plan-v { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }

                /* Tabs */
                .cp-tabs-wrap { background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
                .cp-tabs { display: flex; gap: 4px; padding: 6px 8px 0; border-bottom: 1px solid var(--border); }
                .cp-tab {
                    background: none; border: none; padding: 14px 18px;
                    font-size: 0.9rem; font-weight: 700; cursor: pointer;
                    color: var(--text-secondary); font-family: inherit;
                    border-bottom: 2px solid transparent; margin-bottom: -1px;
                    display: inline-flex; align-items: center; gap: 8px;
                    transition: color 0.15s, border-color 0.15s;
                }
                .cp-tab:hover { color: var(--text-primary); }
                .cp-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
                .cp-tab-count { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: rgba(255,255,255,0.06); color: var(--text-secondary); }
                .cp-tab.active .cp-tab-count { background: rgba(99,102,241,0.18); color: var(--accent); }
                .cp-tab-body { padding: 18px 20px; }

                /* Lists */
                .cp-list { display: flex; flex-direction: column; gap: 8px; }
                .cp-empty { font-size: 0.88rem; color: var(--text-secondary); padding: 20px 0; text-align: center; }

                .cp-bill, .cp-complaint, .cp-pay {
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 14px; background: rgba(255,255,255,0.02);
                    border: 1px solid var(--border); border-radius: 14px;
                    transition: background 0.15s;
                }
                .cp-bill:hover, .cp-complaint:hover, .cp-pay:hover { background: rgba(255,255,255,0.04); }
                .cp-bill-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
                .cp-bill-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
                .cp-bill-dot.paid { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
                .cp-bill-dot.due { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
                .cp-bill-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
                .cp-bill-amt { color: var(--text-secondary); font-weight: 600; margin-left: 4px; }
                .cp-bill-date { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; }

                .cp-complaint-body { flex: 1; min-width: 0; }
                .cp-complaint-desc { font-size: 0.88rem; font-weight: 600; margin: 0 0 3px; color: var(--text-primary); }
                .cp-complaint-meta { font-size: 0.74rem; color: var(--text-secondary); margin: 0; }

                .cp-pay-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(16,185,129,0.14); color: #10b981; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .cp-pay-body { flex: 1; min-width: 0; }
                .cp-pay-amt { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); }
                .cp-pay-meta { font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; }

                .cp-tag { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
                .cp-tag-green { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
                .cp-tag-red { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
                .cp-tag-amber { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); }

                /* Mobile */
                @media (max-width: 720px) {
                    .cp-page { padding: 12px; }
                    .cp-hero { flex-direction: column; align-items: stretch; padding: 18px; gap: 14px; }
                    .cp-hero-main { gap: 14px; }
                    .cp-avatar { width: 60px; height: 60px; font-size: 1.3rem; }
                    .cp-name { font-size: 1.3rem; }
                    .cp-hero-actions { width: 100%; }
                    .cp-hero-actions .cp-btn { flex: 1; justify-content: center; }
                    .cp-stats { grid-template-columns: 1fr; gap: 10px; }
                    .cp-plans { grid-template-columns: 1fr; }
                    .cp-plan-grid { grid-template-columns: 1fr; }
                    .cp-tabs { overflow-x: auto; }
                    .cp-tab { padding: 12px 14px; font-size: 0.82rem; }
                    .cp-tab-body { padding: 14px; }
                }
            `}</style>
        </div>
    );
};

export default CustomerProfile;
