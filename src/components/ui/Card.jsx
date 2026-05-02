import React from 'react';

/**
 * Standard content card.
 * Props: title, subtitle, accent, children, padding, action (right-side JSX)
 */
const Card = ({ title, subtitle, accent, children, padding = 18, action, className = '', style }) => (
    <div className={`ui-card ${className}`} style={{ padding, borderLeft: accent ? `3px solid ${accent}` : undefined, ...style }}>
        {(title || action) && (
            <div className="ui-card-header">
                <div>
                    {title && <h3 className="ui-card-title">{title}</h3>}
                    {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
                </div>
                {action}
            </div>
        )}
        {children}
        <style>{`
            .ui-card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: 16px;
                transition: border-color 0.2s;
            }
            .ui-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
            .ui-card-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
            .ui-card-subtitle { font-size: 0.78rem; color: var(--text-secondary); margin: 4px 0 0; }
        `}</style>
    </div>
);

export default Card;
