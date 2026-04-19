import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Search, History as HistoryIcon, User } from 'lucide-react';
import CustomerHistory from '../components/CustomerHistory';

const CustomerHistoryPage = () => {
    const { customers } = useData();
    const [searchHistory, setSearchHistory] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(searchHistory.toLowerCase()) ||
        (c.phone || '').includes(searchHistory) ||
        (c.boxNumber || '').includes(searchHistory)
    ).slice(0, 8);

    return (
        <div className="content">
            <div className="section-header">
                <div className="flex items-center gap-3">
                    <div className="logo-icon">
                        <HistoryIcon color="white" size={24} />
                    </div>
                    <h1>Customer Financial History</h1>
                </div>
            </div>

            <div className="history-container">
                {!selectedCustomer ? (
                    <div className="customer-selection-view card colored-box-blue">
                        <div className="box-header flex items-center gap-3 mb-6">
                            <Search size={24} />
                            <h2>Search Customer to View History</h2>
                        </div>

                        <div className="search-box-large">
                            <Search size={32} />
                            <input
                                type="text"
                                placeholder="Search by Name, Phone, ID or Box Number..."
                                value={searchHistory}
                                onChange={e => setSearchHistory(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {searchHistory && (
                            <div className="history-matches mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredCustomers.length === 0 ? (
                                    <p className="no-matches">No customers found.</p>
                                ) : (
                                    filteredCustomers.map(c => (
                                        <div key={c.id} className="history-match-card" onClick={() => setSelectedCustomer(c)}>
                                            <div className="match-avatar">
                                                <User size={20} />
                                            </div>
                                            <div className="match-info">
                                                <p className="match-name">{c.name}</p>
                                                <p className="match-meta">{c.phone}</p>
                                                <p className="match-meta text-xs opacity-60">Box: {c.boxNumber || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="history-detail-view">
                        <div className="history-detail-header card flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="detail-avatar">
                                    <User size={28} />
                                </div>
                                <div className="detail-info">
                                    <h3>{selectedCustomer.name}</h3>
                                    <p>{selectedCustomer.phone} | {selectedCustomer.boxNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="btn-secondary">
                                <Search size={18} /> Search Another
                            </button>
                        </div>

                        <div className="history-content card">
                            <CustomerHistory customerId={selectedCustomer.id} />
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .history-container { max-width: 1200px; margin: 0 auto; }
                .search-box-large {
                    display: flex; align-items: center; gap: 20px;
                    background: rgba(0,0,0,0.2); border: 1px solid var(--border);
                    border-radius: 20px; padding: 15px 25px; transition: all 0.3s;
                }
                .search-box-large:focus-within { border-color: var(--accent); background: rgba(0,0,0,0.3); box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
                .search-box-large input { background: none; border: none; font-size: 1.25rem; color: white; width: 100%; outline: none; }
                
                .history-match-card {
                    display: flex; align-items: center; gap: 16px; padding: 16px;
                    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
                    border-radius: 16px; cursor: pointer; transition: all 0.2s;
                }
                .history-match-card:hover { transform: translateY(-3px); background: rgba(255,255,255,0.07); border-color: var(--accent); }
                
                .match-avatar, .detail-avatar {
                    width: 44px; height: 44px; background: var(--accent-gradient);
                    border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;
                }
                .detail-avatar { width: 56px; height: 56px; }
                
                .match-name { font-weight: 700; font-size: 1.1rem; }
                .match-meta { font-size: 0.9rem; color: var(--text-secondary); }
                
                .history-detail-header { padding: 20px 32px; border-radius: 20px; }
                .detail-info h3 { font-size: 1.5rem; margin-bottom: 2px; }
                
                .mt-12 { margin-top: 32px; }
                .grid { display: grid; }
                .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
                .mb-6 { margin-bottom: 24px; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-3 { gap: 0.75rem; }
                .gap-4 { gap: 1rem; }
                
                @media (min-flex: 768px) {
                    .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
            `}</style>
        </div>
    );
};

export default CustomerHistoryPage;
