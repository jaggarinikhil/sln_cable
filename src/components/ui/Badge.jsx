import React from 'react';

/**
 * Small inline badge / pill.
 * Variants: default | success | warning | danger | info | accent
 * Or pass a custom `color` (hex) which will tint bg and border.
 */
const Badge = ({ variant = 'default', color, children, icon, size = 'md', className = '' }) => {
    const customStyle = color ? {
        background: `${color}1f`,
        borderColor: `${color}55`,
        color,
    } : undefined;
    return (
        <span className={`ui-badge ui-badge-${variant} ui-badge-size-${size} ${className}`} style={customStyle}>
            {icon && <span className="ui-badge-icon">{icon}</span>}
            {children}
            <style>{`
                .ui-badge {
                    display: inline-flex; align-items: center; gap: 4px;
                    border: 1px solid;
                    border-radius: 999px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    white-space: nowrap;
                }
                .ui-badge-size-sm { padding: 2px 8px; font-size: 0.62rem; }
                .ui-badge-size-md { padding: 3px 10px; font-size: 0.7rem; }
                .ui-badge-size-lg { padding: 5px 14px; font-size: 0.78rem; }
                .ui-badge-default  { background: rgba(255,255,255,0.06); border-color: var(--border); color: var(--text-secondary); }
                .ui-badge-success  { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #10b981; }
                .ui-badge-warning  { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #f59e0b; }
                .ui-badge-danger   { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #ef4444; }
                .ui-badge-info     { background: rgba(6,182,212,0.15); border-color: rgba(6,182,212,0.35); color: #06b6d4; }
                .ui-badge-accent   { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.35); color: #6366f1; }
                .ui-badge-icon { display: flex; }
            `}</style>
        </span>
    );
};

export default Badge;
