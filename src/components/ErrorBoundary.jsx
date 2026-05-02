import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        const message = this.state.error?.message || 'An unexpected error occurred.';

        return (
            <div className="eb-wrap">
                <div className="eb-card">
                    <div className="eb-icon">
                        <AlertTriangle size={32} />
                    </div>
                    <h1 className="eb-title">Something went wrong</h1>
                    <p className="eb-desc">
                        The app hit an unexpected error. Try refreshing — your data is safe.
                    </p>
                    <details className="eb-details">
                        <summary>Technical details</summary>
                        <code>{message}</code>
                    </details>
                    <div className="eb-actions">
                        <button className="eb-btn eb-btn-primary" onClick={this.handleReload}>
                            <RefreshCw size={16} /> Refresh page
                        </button>
                        <button className="eb-btn eb-btn-secondary" onClick={this.handleHome}>
                            Go to home
                        </button>
                    </div>
                </div>
                <style>{`
                    .eb-wrap {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 24px;
                        background: var(--bg-body, #0c111d);
                    }
                    .eb-card {
                        max-width: 480px;
                        width: 100%;
                        background: var(--bg-card, rgba(23,29,45,0.7));
                        border: 1px solid var(--border, rgba(255,255,255,0.08));
                        border-radius: 18px;
                        padding: 32px 28px;
                        text-align: center;
                        color: var(--text-primary, #fff);
                    }
                    .eb-icon {
                        width: 64px; height: 64px;
                        margin: 0 auto 18px;
                        border-radius: 18px;
                        background: rgba(245,158,11,0.15);
                        color: #f59e0b;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .eb-title {
                        font-size: 1.4rem;
                        font-weight: 800;
                        margin: 0 0 8px;
                        color: var(--text-primary, #fff);
                    }
                    .eb-desc {
                        font-size: 0.92rem;
                        color: var(--text-secondary, #94a3b8);
                        margin: 0 0 18px;
                        line-height: 1.5;
                    }
                    .eb-details {
                        text-align: left;
                        background: rgba(0,0,0,0.2);
                        border: 1px solid var(--border, rgba(255,255,255,0.08));
                        border-radius: 10px;
                        padding: 10px 14px;
                        margin-bottom: 18px;
                    }
                    .eb-details summary {
                        font-size: 0.78rem;
                        font-weight: 700;
                        color: var(--text-secondary, #94a3b8);
                        cursor: pointer;
                    }
                    .eb-details code {
                        display: block;
                        margin-top: 8px;
                        font-size: 0.78rem;
                        color: #f87171;
                        word-break: break-word;
                        white-space: pre-wrap;
                    }
                    .eb-actions {
                        display: flex; gap: 10px; justify-content: center;
                        flex-wrap: wrap;
                    }
                    .eb-btn {
                        display: inline-flex; align-items: center; gap: 8px;
                        padding: 10px 18px;
                        border-radius: 10px;
                        border: 1px solid;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: inherit;
                        font-size: 0.9rem;
                    }
                    .eb-btn-primary {
                        background: linear-gradient(135deg, #6366f1, #a855f7);
                        color: white;
                        border-color: transparent;
                        box-shadow: 0 4px 14px rgba(99,102,241,0.3);
                    }
                    .eb-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.4); }
                    .eb-btn-secondary {
                        background: rgba(255,255,255,0.05);
                        color: var(--text-primary, #fff);
                        border-color: var(--border, rgba(255,255,255,0.15));
                    }
                    .eb-btn-secondary:hover { background: rgba(255,255,255,0.1); }
                `}</style>
            </div>
        );
    }
}

export default ErrorBoundary;
