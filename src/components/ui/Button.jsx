import React from 'react';

/**
 * Standard button.
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 */
const Button = ({ variant = 'primary', size = 'md', icon, children, fullWidth, className = '', ...rest }) => (
    <button className={`ui-btn ui-btn-${variant} ui-btn-${size} ${fullWidth ? 'ui-btn-block' : ''} ${className}`} {...rest}>
        {icon && <span className="ui-btn-icon">{icon}</span>}
        {children && <span>{children}</span>}
        <style>{`
            .ui-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                border: 1px solid transparent; border-radius: 10px; font-weight: 600;
                cursor: pointer; transition: all 0.2s; font-family: inherit;
            }
            .ui-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .ui-btn-sm { padding: 6px 12px; font-size: 0.78rem; }
            .ui-btn-md { padding: 9px 16px; font-size: 0.88rem; }
            .ui-btn-lg { padding: 12px 22px; font-size: 0.95rem; }
            .ui-btn-block { width: 100%; }
            .ui-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
            .ui-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
            .ui-btn-secondary { background: rgba(255,255,255,0.05); border-color: var(--border); color: var(--text-primary); }
            .ui-btn-secondary:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: var(--accent); }
            .ui-btn-ghost { background: transparent; color: var(--text-secondary); }
            .ui-btn-ghost:hover { color: var(--text-primary); background: rgba(255,255,255,0.05); }
            .ui-btn-danger { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #ef4444; }
            .ui-btn-danger:hover { background: rgba(239,68,68,0.2); transform: translateY(-1px); }
            .ui-btn-icon { display: flex; }
        `}</style>
    </button>
);

export default Button;
