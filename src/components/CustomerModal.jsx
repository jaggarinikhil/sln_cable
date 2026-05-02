import React, { useState } from 'react';
import { X, Save, User, Phone, MapPin, Tv, Wifi, Box, FileText, CheckCircle } from 'lucide-react';
import { useToast } from './Toast';

const CustomerModal = ({ customer: editingCustomer, initialName, onClose, onSave }) => {
    const { success, error, info } = useToast();
    const SPEEDS = [10, 20, 30, 40, 50, 60, 70, 75, 100, 150, 200];
    const VALIDITIES = [
        { value: '1month', label: '1 Month' },
        { value: '3months', label: '3 Months' },
        { value: '6months', label: '6 Months' },
        { value: '1year', label: '1 Year' },
    ];

    const today = new Date().toISOString().split('T')[0];

    const [step, setStep] = useState('form'); // 'form' | 'bill'
    const [billChoice, setBillChoice] = useState(null); // null | 'tv' | 'internet' | 'both'
    const [formData, setFormData] = useState(() => {
        if (editingCustomer) {
            const s = editingCustomer.services || {};
            const fallbackDate = editingCustomer.createdAt
                ? new Date(editingCustomer.createdAt).toISOString().split('T')[0]
                : today;
            return {
                ...editingCustomer,
                services: {
                    tv: { active: false, monthlyRate: 300, installationFee: 0, annualSubscription: false, ...s.tv },
                    internet: { active: false, speed: 50, validity: '1month', monthlyRate: '', installationFee: 0, subscribedDate: fallbackDate, ...s.internet }
                }
            };
        }
        return {
            name: initialName || '',
            phone: '',
            address: '',
            zone: '',
            boxNumber: '',
            services: {
                tv: { active: false, monthlyRate: 300, installationFee: 0, annualSubscription: false },
                internet: { active: false, speed: 50, validity: '1month', monthlyRate: '', installationFee: 0, subscribedDate: today }
            }
        };
    });

    const hasTv = formData.services.tv.active;
    const hasNet = formData.services.internet.active;

    // Bill amount calculations (monthly rate + installation fee)
    const tvBillAmt = hasTv
        ? (Number(formData.services.tv.monthlyRate) || 0) + (Number(formData.services.tv.installationFee) || 0)
        : 0;
    const netBillAmt = hasNet
        ? (Number(formData.services.internet.monthlyRate) || 0) + (Number(formData.services.internet.installationFee) || 0)
        : 0;
    const bothBillAmt = tvBillAmt + netBillAmt;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!hasTv && !hasNet) {
            error('Please select at least one service');
            return;
        }
        // Default bill choice based on active services
        const defaultChoice = hasTv && hasNet ? 'both' : hasTv ? 'tv' : 'internet';
        setBillChoice(defaultChoice);
        setStep('bill');
    };

    const handleConfirmBill = (withBill) => {
        let billSpec = null;
        if (withBill && billChoice) {
            // Use YYYY-MM-DD format (full ISO causes 'Invalid Date' in date parsing)
            const todayDate = new Date().toISOString().split('T')[0];
            const billBase = {
                generatedDate: todayDate,
                amountPaid: 0,
                payments: [],
                status: 'Due',
                billNumber: 'AUTO-' + Date.now().toString().slice(-6),
            };
            if (billChoice === 'both') {
                billSpec = {
                    ...billBase,
                    serviceType: 'both',
                    totalAmount: bothBillAmt,
                    tvAmount: tvBillAmt,
                    internetAmount: netBillAmt,
                    balance: bothBillAmt,
                };
            } else if (billChoice === 'tv') {
                billSpec = {
                    ...billBase,
                    serviceType: 'tv',
                    totalAmount: tvBillAmt,
                    tvAmount: tvBillAmt,
                    internetAmount: 0,
                    balance: tvBillAmt,
                };
            } else {
                billSpec = {
                    ...billBase,
                    serviceType: 'internet',
                    totalAmount: netBillAmt,
                    tvAmount: 0,
                    internetAmount: netBillAmt,
                    balance: netBillAmt,
                };
            }
        }
        onSave(formData, billSpec);
    };

    const setTV = (val) => setFormData(f => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, active: val } } }));
    const setNet = (val) => setFormData(f => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, active: val } } }));
    const updateTV = (field, val) => setFormData(f => ({ ...f, services: { ...f.services, tv: { ...f.services.tv, [field]: val } } }));
    const updateNet = (field, val) => setFormData(f => ({ ...f, services: { ...f.services, internet: { ...f.services.internet, [field]: val } } }));
    const toNum = (val) => val === '' ? '' : Number(val);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="cm-sheet">
                {/* Header */}
                <div className="cm-header">
                    <div>
                        <h2 className="cm-title">
                            {step === 'bill' ? 'Generate Bill' : editingCustomer ? 'Edit Customer' : 'New Customer'}
                        </h2>
                        <p className="cm-subtitle">
                            {step === 'bill' ? 'Create a bill for the saved customer' : editingCustomer ? 'Update customer details' : 'Fill in the details below'}
                        </p>
                    </div>
                    <button className="cm-close" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="cm-body" style={{ display: step === 'form' ? 'flex' : 'none' }}>
                    {/* Name */}
                    <div className="cm-field">
                        <label className="cm-label">Full Name <span>*</span></label>
                        <div className="cm-input-wrap">
                            <User size={16} className="cm-input-icon" />
                            <input
                                className="cm-input"
                                type="text"
                                placeholder="Enter full name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="cm-field">
                        <label className="cm-label">Phone Number <span>*</span></label>
                        <div className="cm-input-wrap">
                            <Phone size={16} className="cm-input-icon" />
                            <input
                                className="cm-input"
                                type="tel"
                                placeholder="Enter phone number"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="cm-field">
                        <label className="cm-label">Address <span>*</span></label>
                        <div className="cm-input-wrap cm-textarea-wrap">
                            <MapPin size={16} className="cm-input-icon cm-textarea-icon" />
                            <textarea
                                className="cm-input cm-textarea"
                                placeholder="Enter full address"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                required
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Zone */}
                    <div className="cm-field">
                        <label className="cm-label">Zone (optional)</label>
                        <div className="cm-input-wrap">
                            <MapPin size={16} className="cm-input-icon" />
                            <select
                                className="cm-input"
                                value={formData.zone || ''}
                                onChange={e => setFormData({ ...formData, zone: e.target.value })}
                            >
                                <option value="">— Select zone —</option>
                                <option value="zone1_sln">Zone 1 — SLN</option>
                                <option value="zone2_raju">Zone 2 — Raju</option>
                                <option value="zone3_channareddy">Zone 3 — Channareddy</option>
                                <option value="zone4_ravisetu">Zone 4 — Ravisetu</option>
                            </select>
                        </div>
                    </div>

                    {/* Services */}
                    <div className="cm-field">
                        <label className="cm-label">Services <span>*</span></label>
                        <div className="cm-service-row">
                            <button
                                type="button"
                                className={`cm-service-btn ${formData.services.tv.active ? 'cm-service-active-tv' : ''}`}
                                onClick={() => setTV(!formData.services.tv.active)}
                            >
                                <Tv size={20} />
                                <div>
                                    <p>Cable TV</p>
                                    <p className="cm-service-rate">₹{formData.services.tv.monthlyRate || 300}/month</p>
                                </div>
                                <div className={`cm-service-check ${formData.services.tv.active ? 'checked' : ''}`}>
                                    {formData.services.tv.active && '✓'}
                                </div>
                            </button>
                            <button
                                type="button"
                                className={`cm-service-btn ${formData.services.internet.active ? 'cm-service-active-net' : ''}`}
                                onClick={() => setNet(!formData.services.internet.active)}
                            >
                                <Wifi size={20} />
                                <div>
                                    <p>Internet</p>
                                    <p className="cm-service-rate">
                                        {formData.services.internet.active && formData.services.internet.speed
                                            ? `${formData.services.internet.speed} Mbps`
                                            : 'Select plan'}
                                    </p>
                                </div>
                                <div className={`cm-service-check ${formData.services.internet.active ? 'checked' : ''}`}>
                                    {formData.services.internet.active && '✓'}
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* TV fields */}
                    {formData.services.tv.active && (
                        <>
                            <div className="cm-field">
                                <label className="cm-label">Box Number <span className="cm-optional">(optional)</span></label>
                                <div className="cm-input-wrap">
                                    <Box size={16} className="cm-input-icon" />
                                    <input
                                        className="cm-input"
                                        type="text"
                                        placeholder="Enter set-top box number (optional)"
                                        value={formData.boxNumber}
                                        onChange={e => setFormData({ ...formData, boxNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="cm-fee-row">
                                <div className="cm-field">
                                    <label className="cm-label">TV Monthly Rate (₹)</label>
                                    <input
                                        className="cm-input cm-input-no-icon"
                                        type="number"
                                        min="0"
                                        placeholder="300"
                                        value={formData.services.tv.monthlyRate === 0 ? '' : formData.services.tv.monthlyRate}
                                        onChange={e => updateTV('monthlyRate', toNum(e.target.value))}
                                    />
                                </div>
                                <div className="cm-field">
                                    <label className="cm-label">TV Installation Fee (₹)</label>
                                    <input
                                        className="cm-input cm-input-no-icon"
                                        type="number"
                                        min="0"
                                        placeholder="0 (optional)"
                                        value={formData.services.tv.installationFee === 0 ? '' : formData.services.tv.installationFee}
                                        onChange={e => updateTV('installationFee', toNum(e.target.value))}
                                    />
                                </div>
                            </div>
                            <label className="cm-annual-label">
                                <input
                                    type="checkbox"
                                    checked={!!formData.services.tv.annualSubscription}
                                    onChange={e => updateTV('annualSubscription', e.target.checked)}
                                    className="cm-annual-check"
                                />
                                <span className="cm-annual-text">Annual Subscriber <span className="cm-annual-note">(pays once a year)</span></span>
                            </label>
                        </>
                    )}

                    {/* Internet fields */}
                    {formData.services.internet.active && (
                        <>
                            <div className="cm-fee-row">
                                <div className="cm-field">
                                    <label className="cm-label">Speed <span>*</span></label>
                                    <select
                                        className="cm-input cm-input-no-icon"
                                        value={formData.services.internet.speed}
                                        onChange={e => updateNet('speed', Number(e.target.value))}
                                        required
                                    >
                                        {SPEEDS.map(s => (
                                            <option key={s} value={s}>{s} Mbps</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="cm-field">
                                    <label className="cm-label">Validity <span>*</span></label>
                                    <select
                                        className="cm-input cm-input-no-icon"
                                        value={formData.services.internet.validity}
                                        onChange={e => updateNet('validity', e.target.value)}
                                        required
                                    >
                                        {VALIDITIES.map(v => (
                                            <option key={v.value} value={v.value}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="cm-fee-row">
                                <div className="cm-field">
                                    <label className="cm-label">Plan Rate (₹) <span>*</span></label>
                                    <input
                                        className="cm-input cm-input-no-icon"
                                        type="number"
                                        min="0"
                                        placeholder="Total plan price"
                                        value={formData.services.internet.monthlyRate === 0 ? '' : formData.services.internet.monthlyRate}
                                        onChange={e => updateNet('monthlyRate', toNum(e.target.value))}
                                        required
                                    />
                                </div>
                                <div className="cm-field">
                                    <label className="cm-label">Installation Fee (₹)</label>
                                    <input
                                        className="cm-input cm-input-no-icon"
                                        type="number"
                                        min="0"
                                        placeholder="0 (optional)"
                                        value={formData.services.internet.installationFee === 0 ? '' : formData.services.internet.installationFee}
                                        onChange={e => updateNet('installationFee', toNum(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div className="cm-field">
                                <label className="cm-label">Subscribed Date <span className="cm-optional">(auto-filled, editable)</span></label>
                                <input
                                    className="cm-input cm-input-no-icon"
                                    type="date"
                                    value={formData.services.internet.subscribedDate || ''}
                                    onChange={e => updateNet('subscribedDate', e.target.value)}
                                />
                            </div>
                            <div className="cm-plan-preview">
                                <span className="cm-plan-badge">{formData.services.internet.speed} Mbps</span>
                                <span className="cm-plan-badge cm-plan-validity">{VALIDITIES.find(v => v.value === formData.services.internet.validity)?.label}</span>
                                {formData.services.internet.subscribedDate && (
                                    <span className="cm-plan-badge cm-plan-date">
                                        from {new Date(formData.services.internet.subscribedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                                {formData.services.internet.monthlyRate ? (
                                    <span className="cm-plan-rate">₹{formData.services.internet.monthlyRate} / plan</span>
                                ) : null}
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="cm-actions">
                        <button type="button" onClick={onClose} className="cm-btn-cancel">Cancel</button>
                        <button type="submit" className="cm-btn-save">
                            <Save size={16} />
                            {editingCustomer ? 'Save Changes' : 'Add Customer'}
                        </button>
                    </div>
                </form>

                {/* Bill Step */}
                {step === 'bill' && (
                    <div className="cm-body">
                        <div className="cm-bill-header">
                            <FileText size={28} style={{ color: 'var(--accent)' }} />
                            <div>
                                <p className="cm-bill-title">Generate a Bill?</p>
                                <p className="cm-bill-sub">Customer saved. Do you want to create a bill now?</p>
                            </div>
                        </div>

                        {/* Service picker */}
                        <p className="cm-label" style={{ marginBottom: 4 }}>Select service to bill</p>
                        <div className="cm-bill-svc-row">
                            {hasTv && (
                                <button type="button"
                                    className={`cm-bill-svc-btn ${billChoice === 'tv' ? 'cm-bill-svc-active-tv' : ''}`}
                                    onClick={() => setBillChoice('tv')}
                                >
                                    <Tv size={18} />
                                    <div>
                                        <p>Cable TV</p>
                                        <p className="cm-bill-svc-amt">₹{tvBillAmt.toLocaleString('en-IN')}</p>
                                        {formData.services.tv.installationFee > 0 && (
                                            <p className="cm-bill-svc-breakdown">
                                                ₹{formData.services.tv.monthlyRate} + ₹{formData.services.tv.installationFee} install
                                            </p>
                                        )}
                                    </div>
                                    <div className={`cm-service-check ${billChoice === 'tv' ? 'checked' : ''}`}>
                                        {billChoice === 'tv' && '✓'}
                                    </div>
                                </button>
                            )}
                            {hasNet && (
                                <button type="button"
                                    className={`cm-bill-svc-btn ${billChoice === 'internet' ? 'cm-bill-svc-active-net' : ''}`}
                                    onClick={() => setBillChoice('internet')}
                                >
                                    <Wifi size={18} />
                                    <div>
                                        <p>Internet</p>
                                        <p className="cm-bill-svc-amt">₹{netBillAmt.toLocaleString('en-IN')}</p>
                                        {formData.services.internet.installationFee > 0 && (
                                            <p className="cm-bill-svc-breakdown">
                                                ₹{formData.services.internet.monthlyRate} + ₹{formData.services.internet.installationFee} install
                                            </p>
                                        )}
                                    </div>
                                    <div className={`cm-service-check ${billChoice === 'internet' ? 'checked' : ''}`}>
                                        {billChoice === 'internet' && '✓'}
                                    </div>
                                </button>
                            )}
                            {hasTv && hasNet && (
                                <button type="button"
                                    className={`cm-bill-svc-btn cm-bill-svc-full ${billChoice === 'both' ? 'cm-bill-svc-active-both' : ''}`}
                                    onClick={() => setBillChoice('both')}
                                >
                                    <CheckCircle size={18} />
                                    <div>
                                        <p>Both Services</p>
                                        <p className="cm-bill-svc-amt">₹{bothBillAmt.toLocaleString('en-IN')}</p>
                                        <p className="cm-bill-svc-breakdown">TV ₹{tvBillAmt} + Internet ₹{netBillAmt}</p>
                                    </div>
                                    <div className={`cm-service-check ${billChoice === 'both' ? 'checked' : ''}`}>
                                        {billChoice === 'both' && '✓'}
                                    </div>
                                </button>
                            )}
                        </div>

                        <div className="cm-actions">
                            <button type="button" className="cm-btn-cancel" onClick={() => handleConfirmBill(false)}>
                                Skip for Now
                            </button>
                            <button type="button" className="cm-btn-save" onClick={() => handleConfirmBill(true)} disabled={!billChoice}>
                                <FileText size={16} />
                                Generate Bill
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .cm-sheet {
                    background: #0f172a;
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 480px;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: cmSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 25px 60px rgba(0,0,0,0.8);
                }
                @keyframes cmSlideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .cm-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    padding: 24px 24px 0;
                }
                .cm-title {
                    font-size: 1.3rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .cm-subtitle {
                    font-size: 0.82rem;
                    color: var(--text-secondary);
                    margin-top: 3px;
                }
                .cm-close {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: 10px;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .cm-close:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }

                .cm-body {
                    padding: 20px 24px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                }

                .cm-field { display: flex; flex-direction: column; gap: 8px; }
                .cm-label {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }
                .cm-label span { color: var(--accent); }

                .cm-input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .cm-input-icon {
                    position: absolute;
                    left: 14px;
                    color: var(--text-secondary);
                    pointer-events: none;
                }
                .cm-textarea-icon { top: 14px; align-self: flex-start; }
                .cm-input {
                    width: 100%;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 13px 14px 13px 42px;
                    color: var(--text-primary);
                    font-size: 0.95rem;
                    outline: none;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .cm-input:focus {
                    border-color: var(--accent);
                    background: rgba(99,102,241,0.08);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
                }
                .cm-input::placeholder { color: rgba(148,163,184,0.5); }
                .cm-textarea { resize: vertical; min-height: 80px; align-items: flex-start; padding-top: 13px; }
                .cm-textarea-wrap { align-items: flex-start; }

                /* Service toggles */
                .cm-service-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .cm-service-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px;
                    background: rgba(255,255,255,0.04);
                    border: 2px solid var(--border);
                    border-radius: 14px;
                    cursor: pointer;
                    color: var(--text-secondary);
                    text-align: left;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .cm-service-btn p { font-size: 0.88rem; font-weight: 700; color: var(--text-primary); }
                .cm-service-rate { font-size: 0.75rem; color: var(--text-secondary); font-weight: 500; margin-top: 2px; }
                .cm-service-btn:hover { border-color: var(--border-bright); }

                .cm-service-active-tv {
                    border-color: #a855f7 !important;
                    background: rgba(168,85,247,0.1) !important;
                    color: #a855f7 !important;
                }
                .cm-service-active-net {
                    border-color: #06b6d4 !important;
                    background: rgba(6,182,212,0.1) !important;
                    color: #06b6d4 !important;
                }

                .cm-service-check {
                    margin-left: auto;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 700;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .cm-service-active-tv .cm-service-check.checked {
                    background: #a855f7;
                    border-color: #a855f7;
                    color: white;
                }
                .cm-service-active-net .cm-service-check.checked {
                    background: #06b6d4;
                    border-color: #06b6d4;
                    color: white;
                }

                /* Fee row */
                .cm-fee-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .cm-input-no-icon {
                    padding-left: 14px !important;
                }

                /* Internet plan preview */
                .cm-plan-preview {
                    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                    padding: 10px 14px; background: rgba(6,182,212,0.06);
                    border: 1px solid rgba(6,182,212,0.2); border-radius: 10px;
                }
                .cm-plan-badge {
                    background: rgba(6,182,212,0.15); color: #22d3ee;
                    border: 1px solid rgba(6,182,212,0.3); border-radius: 6px;
                    padding: 3px 10px; font-size: 0.78rem; font-weight: 700;
                }
                .cm-plan-validity { background: rgba(99,102,241,0.12); color: var(--accent); border-color: rgba(99,102,241,0.25); }
                .cm-plan-date { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.25); }
                .cm-plan-rate { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-left: auto; }
                .cm-optional { font-size: 0.72rem; font-weight: 500; color: var(--text-secondary); text-transform: none; letter-spacing: 0; }
                .cm-annual-label { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px 14px; background: rgba(168,85,247,0.06); border: 1px solid rgba(168,85,247,0.2); border-radius: 10px; }
                .cm-annual-check { width: 17px; height: 17px; accent-color: #a855f7; cursor: pointer; flex-shrink: 0; }
                .cm-annual-text { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
                .cm-annual-note { font-size: 0.75rem; font-weight: 400; color: var(--text-secondary); }

                /* Actions */
                .cm-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 4px;
                }
                .cm-btn-cancel {
                    flex: 1;
                    padding: 13px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .cm-btn-cancel:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
                .cm-btn-save {
                    flex: 2;
                    padding: 13px;
                    background: var(--accent-gradient);
                    border: none;
                    color: white;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                    box-shadow: 0 4px 14px rgba(99,102,241,0.35);
                    font-family: inherit;
                }
                .cm-btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.45); }
                .cm-btn-save:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

                /* Bill step */
                .cm-bill-header {
                    display: flex; align-items: flex-start; gap: 14px;
                    padding: 16px 18px; background: rgba(99,102,241,0.08);
                    border: 1px solid rgba(99,102,241,0.2); border-radius: 14px;
                }
                .cm-bill-title { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
                .cm-bill-sub { font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px; }

                .cm-bill-svc-row { display: flex; flex-direction: column; gap: 10px; }
                .cm-bill-svc-btn {
                    display: flex; align-items: center; gap: 14px; padding: 14px 16px;
                    background: rgba(255,255,255,0.04); border: 2px solid var(--border);
                    border-radius: 14px; cursor: pointer; color: var(--text-secondary);
                    text-align: left; transition: all 0.2s; font-family: inherit; width: 100%;
                }
                .cm-bill-svc-btn p:first-child { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
                .cm-bill-svc-amt { font-size: 1rem; font-weight: 800; color: var(--text-primary); margin-top: 2px; }
                .cm-bill-svc-breakdown { font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px; }
                .cm-bill-svc-full { grid-column: 1 / -1; }

                .cm-bill-svc-active-tv { border-color: #a855f7 !important; background: rgba(168,85,247,0.1) !important; color: #a855f7 !important; }
                .cm-bill-svc-active-tv .cm-service-check.checked { background: #a855f7; border-color: #a855f7; color: white; }

                .cm-bill-svc-active-net { border-color: #06b6d4 !important; background: rgba(6,182,212,0.1) !important; color: #06b6d4 !important; }
                .cm-bill-svc-active-net .cm-service-check.checked { background: #06b6d4; border-color: #06b6d4; color: white; }

                .cm-bill-svc-active-both { border-color: #10b981 !important; background: rgba(16,185,129,0.1) !important; color: #10b981 !important; }
                .cm-bill-svc-active-both .cm-service-check.checked { background: #10b981; border-color: #10b981; color: white; }

                @media (max-width: 768px) {
                    .modal-overlay { padding: 0; align-items: stretch; justify-content: stretch; }
                    .cm-sheet {
                        border-radius: 0;
                        max-width: 100%;
                        width: 100%;
                        height: 100dvh;
                        max-height: 100dvh;
                        display: flex;
                        flex-direction: column;
                    }
                    .cm-header {
                        padding: 14px 16px;
                        flex-shrink: 0;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }
                    .cm-header h2 { font-size: 1.05rem !important; }
                    .cm-body {
                        padding: 14px 16px;
                        flex: 1;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                        gap: 12px;
                    }
                    .cm-field { gap: 5px; }
                    .cm-label { font-size: 0.72rem; }
                    .cm-input { padding: 11px 12px 11px 38px; font-size: 16px; border-radius: 10px; }
                    .cm-textarea { padding: 13px 12px 13px 38px; }
                    .cm-service-row { grid-template-columns: 1fr 1fr; gap: 8px; }
                    .cm-service-btn { padding: 12px 8px; font-size: 0.85rem; }
                    .cm-btn-primary { padding: 12px; font-size: 0.95rem; }

                    @keyframes cmSlideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                }
                @media (max-width: 380px) {
                    .cm-service-row { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
};

export default CustomerModal;
