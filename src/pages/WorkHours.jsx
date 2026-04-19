import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { Clock, Plus, Save, Calendar } from 'lucide-react';

const WorkHours = () => {
    const { user } = useAuth();
    const [hours, setHours] = useState(storage.getWorkHours().filter(h => h.userId === user.userId));
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        hours: 8,
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const allHours = storage.getWorkHours();
        const existing = allHours.find(h => h.userId === user.userId && h.date === formData.date);

        if (existing) {
            alert('Hours already logged for this date. Contact owner for changes.');
            return;
        }

        const newEntry = {
            id: Date.now().toString(),
            userId: user.userId,
            userName: user.name,
            ...formData,
            createdAt: new Date().toISOString()
        };

        const updated = [...allHours, newEntry];
        storage.setWorkHours(updated);
        setHours(updated.filter(h => h.userId === user.userId));
        setFormData({ date: new Date().toISOString().split('T')[0], hours: 8, notes: '' });
        alert('Work hours logged!');
    };

    return (
        <div className="work-hours-page">
            <div className="section-header">
                <h1>Work Hours</h1>
            </div>

            <div className="work-grid">
                <form onSubmit={handleSubmit} className="card log-form">
                    <h3>Log Daily Hours</h3>
                    <div className="form-group">
                        <label><Calendar size={14} /> Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label><Clock size={14} /> Hours Worked</label>
                        <input
                            type="number"
                            value={formData.hours}
                            onChange={e => setFormData({ ...formData, hours: e.target.value })}
                            min="0" max="24"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Notes</label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="What did you work on?"
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <Save size={18} /> Submit Hours
                    </button>
                </form>

                <div className="card history-card">
                    <h3>Personal History</h3>
                    <div className="table-mini">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Hours</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hours.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center">No logs found.</td></tr>
                                ) : (
                                    [...hours].reverse().slice(0, 10).map(h => (
                                        <tr key={h.id}>
                                            <td>{h.date}</td>
                                            <td><strong>{h.hours}</strong></td>
                                            <td>{h.notes || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
        .work-grid { display: grid; grid-template-columns: 350px 1fr; gap: 24px; }
        .log-form { align-self: start; }
        .history-card { padding: 0; }
        .history-card h3 { padding: 24px 24px 0 24px; }
        @media (max-width: 1024px) { .work-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
};

export default WorkHours;
