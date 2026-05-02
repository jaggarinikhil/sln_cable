import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Graceful no-op if used outside provider (avoids crashes during dev)
        return { toast: (msg) => console.log('[toast]', msg), success: () => {}, error: () => {}, info: () => {} };
    }
    return ctx;
};

const ICONS = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
};

const COLORS = {
    success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#ef4444' },
    info: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', color: '#6366f1' },
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(t => t.filter(x => x.id !== id));
    }, []);

    const push = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => remove(id), duration);
        return id;
    }, [remove]);

    const value = {
        toast: push,
        success: (msg, dur) => push(msg, 'success', dur),
        error: (msg, dur) => push(msg, 'error', dur),
        info: (msg, dur) => push(msg, 'info', dur),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-stack">
                {toasts.map(t => {
                    const c = COLORS[t.type];
                    return (
                        <div
                            key={t.id}
                            className="toast-item"
                            style={{ background: c.bg, borderColor: c.border, color: c.color }}
                        >
                            {ICONS[t.type]}
                            <span className="toast-msg">{t.message}</span>
                            <button className="toast-close" onClick={() => remove(t.id)} title="Dismiss">
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
            <style>{`
                .toast-stack {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }
                .toast-item {
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 14px;
                    border-radius: 12px;
                    border: 1px solid;
                    backdrop-filter: blur(10px);
                    background-color: rgba(15,22,41,0.85);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                    min-width: 240px;
                    max-width: 360px;
                    animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    font-weight: 600;
                    font-size: 0.88rem;
                }
                .toast-msg { flex: 1; color: var(--text-primary); }
                .toast-close {
                    background: none; border: none; cursor: pointer;
                    color: var(--text-secondary);
                    display: flex; padding: 2px;
                    border-radius: 4px;
                    transition: all 0.15s;
                }
                .toast-close:hover { background: rgba(255,255,255,0.08); color: white; }
                @keyframes toastIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @media (max-width: 600px) {
                    .toast-stack { top: 12px; right: 12px; left: 12px; }
                    .toast-item { min-width: 0; max-width: 100%; }
                }
            `}</style>
        </ToastContext.Provider>
    );
};
