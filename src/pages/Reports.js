import React, { useState, useEffect } from 'react';
import { getBills } from '../utils/storage';
import './Dashboard.css';
import './Reports.css';

const fmt = (n) => `₹${(parseFloat(n) || 0).toFixed(2)}`;

const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => new Date().toISOString().slice(0, 7);

const Reports = () => {
  const [tab, setTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [bills, setBills] = useState([]);

  useEffect(() => { setBills(getBills()); }, []);

  // ── Daily filter ──
  const dailyBills = bills.filter(b => b.billGeneratedDate === selectedDate);

  // ── Monthly filter ──
  const monthlyBills = bills.filter(b =>
    b.billGeneratedDate && b.billGeneratedDate.startsWith(selectedMonth)
  );

  const summary = (list) => ({
    count: list.length,
    totalAmount: list.reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0),
    amountPaid: list.reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
    balance: list.reduce((s, b) => s + (parseFloat(b.balanceAmount) || 0), 0),
    cash: list.filter(b => b.paymentMode === 'Cash').reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
    phonePe: list.filter(b => b.paymentMode === 'PhonePe').reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
    googlePay: list.filter(b => b.paymentMode === 'Google Pay').reduce((s, b) => s + (parseFloat(b.amountPaid) || 0), 0),
    cleared: list.filter(b => (parseFloat(b.balanceAmount) || 0) <= 0).length,
    pending: list.filter(b => (parseFloat(b.balanceAmount) || 0) > 0).length,
  });

  // Monthly group by day
  const byDay = monthlyBills.reduce((acc, b) => {
    const d = b.billGeneratedDate || 'Unknown';
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {});

  const activeBills = tab === 'daily' ? dailyBills : monthlyBills;
  const stats = summary(activeBills);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports</h1>
        <p>Daily and monthly billing summaries</p>
      </div>

      {/* Tab switcher */}
      <div className="report-tabs">
        <button className={`report-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          📅 Daily Report
        </button>
        <button className={`report-tab ${tab === 'monthly' ? 'active' : ''}`} onClick={() => setTab('monthly')}>
          📆 Monthly Report
        </button>
      </div>

      {/* Date selector */}
      <div className="form-card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {tab === 'daily' ? (
          <>
            <label style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>SELECT DATE</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: '0.95rem', outline: 'none' }}
            />
            <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </>
        ) : (
          <>
            <label style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>SELECT MONTH</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: '0.95rem', outline: 'none' }}
            />
            <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
              {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
            </span>
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="report-summary-grid">
        <div className="report-stat-card" style={{ '--c': '#3b82f6' }}>
          <div className="rsc-icon">🧾</div>
          <div className="rsc-val">{stats.count}</div>
          <div className="rsc-label">Total Bills</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#8b5cf6' }}>
          <div className="rsc-icon">💵</div>
          <div className="rsc-val">{fmt(stats.totalAmount)}</div>
          <div className="rsc-label">Total Amount</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#10b981' }}>
          <div className="rsc-icon">✅</div>
          <div className="rsc-val">{fmt(stats.amountPaid)}</div>
          <div className="rsc-label">Amount Collected</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#f59e0b' }}>
          <div className="rsc-icon">⚠️</div>
          <div className="rsc-val">{fmt(stats.balance)}</div>
          <div className="rsc-label">Balance Due</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#06b6d4' }}>
          <div className="rsc-icon">💵</div>
          <div className="rsc-val">{fmt(stats.cash)}</div>
          <div className="rsc-label">Cash</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#6366f1' }}>
          <div className="rsc-icon">📱</div>
          <div className="rsc-val">{fmt(stats.phonePe)}</div>
          <div className="rsc-label">PhonePe</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#ec4899' }}>
          <div className="rsc-icon">🔵</div>
          <div className="rsc-val">{fmt(stats.googlePay)}</div>
          <div className="rsc-label">Google Pay</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#10b981' }}>
          <div className="rsc-icon">🟢</div>
          <div className="rsc-val">{stats.cleared}</div>
          <div className="rsc-label">Cleared</div>
        </div>
        <div className="report-stat-card" style={{ '--c': '#ef4444' }}>
          <div className="rsc-icon">🔴</div>
          <div className="rsc-val">{stats.pending}</div>
          <div className="rsc-label">Pending Balance</div>
        </div>
      </div>

      {/* Bill table */}
      {tab === 'daily' ? (
        <div className="form-card">
          <h2>Bills on {selectedDate} ({dailyBills.length})</h2>
          {dailyBills.length === 0 ? (
            <p className="empty-msg">No bills generated on this date.</p>
          ) : (
            <BillTable bills={dailyBills} />
          )}
        </div>
      ) : (
        <>
          {Object.keys(byDay).sort().reverse().map(day => {
            const dayStats = summary(byDay[day]);
            return (
              <div className="form-card" key={day}>
                <div className="section-header">
                  <h2>📅 {day} — {byDay[day].length} bill(s)</h2>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    <span style={{ color: '#e2e8f0' }}>Total: <strong>{fmt(dayStats.totalAmount)}</strong></span>
                    <span style={{ color: '#34d399' }}>Paid: <strong>{fmt(dayStats.amountPaid)}</strong></span>
                    <span style={{ color: '#f87171' }}>Balance: <strong>{fmt(dayStats.balance)}</strong></span>
                  </div>
                </div>
                <BillTable bills={byDay[day]} />
              </div>
            );
          })}
          {monthlyBills.length === 0 && <div className="form-card"><p className="empty-msg">No bills for this month.</p></div>}
        </>
      )}
    </div>
  );
};

const BillTable = ({ bills }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Customer</th>
          <th>Phone</th>
          <th>Plan</th>
          <th>Total Amt</th>
          <th>Paid Amt</th>
          <th>Balance</th>
          <th>Bill Date</th>
          <th>Paid Date</th>
          <th>Payment</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {bills.map((bill, i) => (
          <tr key={bill.id}>
            <td>{i + 1}</td>
            <td style={{ fontWeight: 600 }}>{bill.customerName}</td>
            <td>{bill.phone || '—'}</td>
            <td>{bill.plan || '—'}</td>
            <td style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt(bill.totalAmount)}</td>
            <td style={{ color: '#34d399', fontWeight: 600 }}>{fmt(bill.amountPaid)}</td>
            <td>
              <span className={`balance-pill ${bill.balanceAmount > 0 ? 'pill-due' : bill.balanceAmount < 0 ? 'pill-over' : 'pill-clear'}`}>
                {fmt(bill.balanceAmount)}
              </span>
            </td>
            <td>{bill.billGeneratedDate || '—'}</td>
            <td>{bill.billPaidDate || '—'}</td>
            <td><span className="payment-badge">{bill.paymentMode}</span></td>
            <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{bill.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="table-totals">
          <td colSpan={4} style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Totals</td>
          <td style={{ color: '#e2e8f0', fontWeight: 700 }}>{fmt(bills.reduce((s, b) => s + (b.totalAmount || 0), 0))}</td>
          <td style={{ color: '#34d399', fontWeight: 700 }}>{fmt(bills.reduce((s, b) => s + (b.amountPaid || 0), 0))}</td>
          <td style={{ color: '#f87171', fontWeight: 700 }}>{fmt(bills.reduce((s, b) => s + (b.balanceAmount || 0), 0))}</td>
          <td colSpan={4}></td>
        </tr>
      </tfoot>
    </table>
  </div>
);

export default Reports;
