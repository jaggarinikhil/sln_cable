import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon, title, description, action, actionLabel, accent = '#6366f1' }) => {
    const Icon = icon || Inbox;
    const renderIcon = React.isValidElement(Icon)
        ? Icon
        : React.createElement(Icon, { size: 32 });
    return (
        <div className="empty-state">
            <div className="empty-state-icon" style={{ color: accent, background: `${accent}15`, borderColor: `${accent}33` }}>
                {renderIcon}
            </div>
            <h3 className="empty-state-title">{title || 'Nothing here yet'}</h3>
            {description && <p className="empty-state-desc">{description}</p>}
            {action && (
                <button
                    className="empty-state-btn"
                    onClick={action}
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                >
                    {actionLabel || 'Get Started'}
                </button>
            )}
            <style>{`
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 40px 24px;
                    background: var(--bg-card);
                    border-radius: 18px;
                    border: 1px dashed var(--border);
                    gap: 12px;
                    animation: emptyStateIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes emptyStateIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .empty-state-icon {
                    width: 64px;
                    height: 64px;
                    border-radius: 18px;
                    border: 1px solid;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 4px;
                }
                .empty-state-title {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }
                .empty-state-desc {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin: 0;
                    max-width: 320px;
                    line-height: 1.5;
                }
                .empty-state-btn {
                    margin-top: 8px;
                    padding: 10px 22px;
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .empty-state-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 18px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
};

export default EmptyState;
