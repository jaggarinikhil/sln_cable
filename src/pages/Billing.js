import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBills, addBill, updateBill } from '../utils/storage';
import './Dashboard.css';

const PAYMENT_MODES = ['Cash', 'PhonePe', 'Google Pay'];

const today = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  customerName: '', phone: '', address: '', plan: '',
  totalAmount: '', amountPaid: '', billGeneratedDate: today(),
  billPaidDate: '', paymentMode: 'Cash', notes: '',
};

const fmt = (n) => `₹${(parseFloat(n) || 0).toFixed(2)}`;

const Billing = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const loadBills = useCallback(() => setBills(getBills()), []);
  useEffect(() => { loadBills(); }, [loadBills]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const balance = (parseFloat(form.totalAmount) || 0) - (parseFloat(form.amountPaid) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editId) {
      const result = updateBill(editId, form, user.role);
      if (result.success) {
        showToast('Bill updated!');
        setEditId(null); setForm(emptyForm); loadBills();
      } else {
        showToast(result.message, 'error');
      }
    } else {
      addBill(form);
      showToast('Bill created!');
      setForm(emptyForm); loadBills();
    }
  };

  const handleEdit = (bill) => {
    if (user.role === 'worker' && bill.modifiedCount >= 1) {
      showToast('Edit limit reached', 'error'); return;
    }
    setEditId(bill.id);
    setForm({
      customerName: bill.customerName || '',
      phone: bill.phone || '',
      address: bill.address || '',
      plan: bill.plan || '',
      totalAmount: bill.totalAmount || '',
      amountPaid: bill.amountPaid || '',
      billGeneratedDate: bill.billGeneratedDate || today(),
      billPaidDate: bill.billPaidDate || '',
      paymentMode: bill.paymentMode || 'Cash',
      notes: bill.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => { setEditId(null); setForm(emptyForm); };

  const filtered = [...bills]
    .filter(b =>
      b.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      b.phone?.includes(search)
    )
    .reverse();

  const canEdit = (bill) => user.role === 'owner' || bill.modifiedCount < 1;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Billing</h1>
        <p>{user.role === 'worker' ? 'Create and manage bills' : 'Full billing management'}</p>
      </div>

      {/* ── Form ── */}
      <div className="form-card">
        <h2>{editId ? '✏️ Edit Bill' : '➕ New Bill'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="form-field">
              <label>Customer Name *</label>
              <input value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} placeholder="Full name" required />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone number" />
            </div>
            <div className="form-field">
              <label>Address</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Address" />
            </div>
            <div className="form-field">
              <label>Plan</label>
              <input value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} placeholder="e.g. Basic, Premium" />
            </div>

            <div className="form-field">
              <label>Bill Generated Date *</label>
              <input type="date" value={form.billGeneratedDate} onChange={e => setForm({...form, billGeneratedDate: e.target.value})} required />
            </div>
            <div className="form-field">
              <label>Bill Paid Date</label>
              <input type="date" value={form.billPaidDate} onChange={e => setForm({...form, billPaidDate: e.target.value})} />
            </div>

            <div className="form-field">
              <label>Total Amount (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.totalAmount}
                onChange={e => setForm({...form, totalAmount: e.target.value})}
                placeholder="0.00" required />
            </div>
            <div className="form-field">
              <label>Amount Paid (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.amountPaid}
                onChange={e => setForm({...form, amountPaid: e.target.value})}
                placeholder="0.00" required />
            </div>

            {/* Auto balance display */}
            <div className="form-field">
              <label>Balance Amount (Auto)</label>
              <div className={`balance-display ${balance > 0 ? 'balance-due' : balance < 0 ? 'balance-over' : 'balance-clear'}`}>
                ₹{balance.toFixed(2)}
                <span className="balance-label">
                  {balance > 0 ? '⚠️ Due' : balance < 0 ? '⬆️ Overpaid' : '✅ Cleared'}
                </span>
              </div>
            </div>

            <div className="form-field">
              <label>Payment Mode *</label>
              <select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            <div className="form-field" style={{ gridColumn: 'span 2' }}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit">{editId ? 'Update Bill' : 'Create Bill'}</button>
            {editId && <button className="btn-secondary" type="button" onClick={handleCancel}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* ── Bills List ── */}
      <div className="form-card">
        <div className="section-header">
          <h2>All Bills ({bills.length})</h2>
          <input
            className="search-input"
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="empty-msg">No bills found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Bill Date</th>
                  <th>Total Amt</th>
                  <th>Paid Amt</th>
                  <th>Balance</th>
                  <th>Paid Date</th>
                  <th>Payment</th>
                  {user.role === 'worker' && <th>Edits</th>}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill, i) => (
                  <tr key={bill.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{bill.customerName}</td>
                    <td>{bill.phone || '—'}</td>
                    <td>{bill.plan || '—'}</td>
                    <td>{bill.billGeneratedDate || '—'}</td>
                    <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(bill.totalAmount)}</td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>{fmt(bill.amountPaid)}</td>
                    <td>
                      <span className={`balance-pill ${bill.balanceAmount > 0 ? 'pill-due' : bill.balanceAmount < 0 ? 'pill-over' : 'pill-clear'}`}>
                        {fmt(bill.balanceAmount)}
                      </span>
                    </td>
                    <td>{bill.billPaidDate || '—'}</td>
                    <td><span className="payment-badge">{bill.paymentMode}</span></td>
                    {user.role === 'worker' && (
                      <td style={{ color: bill.modifiedCount >= 1 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                        {bill.modifiedCount >= 1 ? '0 left' : '1 left'}
                      </td>
                    )}
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(bill)}
                        disabled={!canEdit(bill)}
                        title={!canEdit(bill) ? 'Edit limit reached' : 'Edit bill'}
                      >
                        {canEdit(bill) ? '✏️ Edit' : '🔒 Locked'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-totals">
                  <td colSpan={5} style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Totals ({filtered.length} bills)</td>
                  <td style={{ color: '#e2e8f0', fontWeight: 700 }}>{fmt(filtered.reduce((s, b) => s + (b.totalAmount || 0), 0))}</td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>{fmt(filtered.reduce((s, b) => s + (b.amountPaid || 0), 0))}</td>
                  <td style={{ color: '#f87171', fontWeight: 700 }}>{fmt(filtered.reduce((s, b) => s + (b.balanceAmount || 0), 0))}</td>
                  <td colSpan={user.role === 'worker' ? 4 : 3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  );
};

export default Billing;
