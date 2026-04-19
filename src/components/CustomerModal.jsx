import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { X, Save, Plus } from 'lucide-react';

const CustomerModal = ({ customer: editingCustomer, onClose, onSave }) => {
    const [formData, setFormData] = useState(() => {
        if (editingCustomer) {
            return {
                ...editingCustomer,
                services: editingCustomer.services || {
                    tv: { active: false, monthlyRate: 300 },
                    internet: { active: false, monthlyRate: 800 }
                }
            };
        }
        return {
            name: '',
            phone: '',
            address: '',
            boxNumber: '',
            services: {
                tv: { active: false, monthlyRate: 300 },
                internet: { active: false, monthlyRate: 800 }
            }
        };
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.services.tv.active && !formData.services.internet.active) {
            alert('Please select at least one service');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
                <div className="modal-header">
                    <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Address *</label>
                        <textarea
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            required
                        />
                    </div>

                    <div className="services-toggle-group">
                        <label className="section-label">Services</label>
                        <div className="service-toggles">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.services.tv.active}
                                    onChange={e => setFormData({
                                        ...formData,
                                        services: {
                                            ...formData.services,
                                            tv: { ...formData.services.tv, active: e.target.checked }
                                        }
                                    })}
                                />
                                <span>Cable TV</span>
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.services.internet.active}
                                    onChange={e => setFormData({
                                        ...formData,
                                        services: {
                                            ...formData.services,
                                            internet: { ...formData.services.internet, active: e.target.checked }
                                        }
                                    })}
                                />
                                <span>Internet</span>
                            </label>
                        </div>
                    </div>

                    {(formData.services.tv.active) && (
                        <div className="form-group">
                            <label>Box Number *</label>
                            <input
                                type="text"
                                value={formData.boxNumber}
                                onChange={e => setFormData({ ...formData, boxNumber: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary"><Save size={18} /> Save Customer</button>
                    </div>
                </form>
            </div>
            <style>{`
        .services-toggle-group { margin-bottom: 20px; }
        .section-label { display: block; font-size: 0.8rem; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; font-weight: 700; }
        .service-toggles { display: flex; gap: 24px; }
        .modal-body textarea { min-height: 80px; resize: vertical; }
      `}</style>
        </div>
    );
};

export default CustomerModal;
