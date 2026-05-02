import { useState } from 'react';
import { Sun, Moon, KeyRound, Settings as SettingsIcon, UserCog, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';

const APP_VERSION = '1.0.0';

const Settings = () => {
    const { theme, setTheme, toggle } = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pwdOpen, setPwdOpen] = useState(false);
    const canManageUsers = user?.permissions?.manageUsers;

    const setMode = (mode) => {
        if (theme === mode) return;
        if (typeof setTheme === 'function') setTheme(mode);
        else toggle();
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div className="settings-header-icon"><SettingsIcon size={22} /></div>
                <div>
                    <h1 className="settings-title">Settings</h1>
                    <p className="settings-subtitle">Manage your preferences</p>
                </div>
            </div>

            {/* Appearance */}
            <section className="settings-section">
                <h2 className="settings-section-title">Appearance</h2>
                <p className="settings-section-desc">Choose how SLN Cable looks to you.</p>
                <div className="theme-grid">
                    <button
                        className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setMode('light')}
                    >
                        <Sun size={28} />
                        <span>Light</span>
                    </button>
                    <button
                        className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setMode('dark')}
                    >
                        <Moon size={28} />
                        <span>Dark</span>
                    </button>
                </div>
            </section>

            {/* Account */}
            <section className="settings-section">
                <h2 className="settings-section-title">Account</h2>
                <p className="settings-section-desc">Manage your security credentials.</p>
                <button className="settings-action-btn" onClick={() => setPwdOpen(true)}>
                    <KeyRound size={16} /> Change Password
                </button>
            </section>

            {canManageUsers && (
                <section className="settings-section">
                    <h2 className="settings-section-title">Team</h2>
                    <p className="settings-section-desc">Manage workers, roles, and permissions.</p>
                    <button className="settings-link-row" onClick={() => navigate('/users')}>
                        <div className="settings-link-icon"><UserCog size={18} /></div>
                        <div className="settings-link-text">
                            <span className="settings-link-title">User Management</span>
                            <span className="settings-link-desc">Add, edit, or disable team members</span>
                        </div>
                        <ChevronRight size={16} />
                    </button>
                </section>
            )}

            {/* About */}
            <section className="settings-section">
                <h2 className="settings-section-title">About</h2>
                <div className="about-grid">
                    <div className="about-row">
                        <span className="about-label">App Version</span>
                        <span className="about-value">{APP_VERSION}</span>
                    </div>
                    <div className="about-row">
                        <span className="about-label">Owner</span>
                        <span className="about-value">{user?.name || '—'}</span>
                    </div>
                    <div className="about-row">
                        <span className="about-label">Brand</span>
                        <span className="about-value">SLN Cable & Networks</span>
                    </div>
                </div>
            </section>

            {pwdOpen && user && (
                <ChangePasswordModal user={user} onClose={() => setPwdOpen(false)} />
            )}

            <style>{`
                .settings-page {
                    max-width: 760px;
                    margin: 0 auto;
                    padding: 24px 18px 60px;
                    color: var(--text-primary);
                }
                .settings-header {
                    display: flex; align-items: center; gap: 14px;
                    margin-bottom: 28px;
                }
                .settings-header-icon {
                    width: 46px; height: 46px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, var(--accent), var(--accent-2, #8b5cf6));
                    color: #fff;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
                }
                .settings-title {
                    font-size: 1.6rem; font-weight: 800; margin: 0;
                    color: var(--text-primary);
                }
                .settings-subtitle {
                    margin: 2px 0 0; font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .settings-section {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 20px;
                    margin-bottom: 18px;
                }
                .settings-section-title {
                    font-size: 1rem; font-weight: 700; margin: 0 0 4px;
                    color: var(--text-primary);
                }
                .settings-section-desc {
                    margin: 0 0 14px; font-size: 0.82rem;
                    color: var(--text-secondary);
                }
                .theme-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .theme-card {
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    gap: 10px;
                    padding: 22px 14px;
                    background: var(--bg-secondary, rgba(127,127,127,0.06));
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-weight: 600; font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .theme-card:hover {
                    border-color: var(--accent);
                    transform: translateY(-1px);
                }
                .theme-card.active {
                    border-color: var(--accent);
                    background: rgba(99,102,241,0.10);
                    box-shadow: 0 0 0 4px rgba(99,102,241,0.18);
                    color: var(--accent);
                }
                .settings-action-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 10px 16px;
                    background: var(--accent);
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-weight: 600; font-size: 0.88rem;
                    cursor: pointer;
                    transition: filter 0.2s;
                }
                .settings-action-btn:hover { filter: brightness(1.08); }

                .settings-link-row {
                    display: flex; align-items: center; gap: 14px;
                    width: 100%;
                    background: var(--bg-card-light, var(--bg-card));
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 14px 16px;
                    cursor: pointer;
                    color: var(--text-primary);
                    text-align: left;
                    transition: border-color 0.2s, transform 0.2s, background 0.2s;
                    font-family: inherit;
                }
                .settings-link-row:hover {
                    border-color: var(--accent);
                    transform: translateX(2px);
                    background: rgba(99,102,241,0.08);
                }
                .settings-link-icon {
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    background: rgba(99,102,241,0.15);
                    color: var(--accent);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .settings-link-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
                .settings-link-title { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
                .settings-link-desc { font-size: 0.78rem; color: var(--text-secondary); }

                .about-grid { display: flex; flex-direction: column; gap: 10px; }
                .about-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 12px;
                    background: rgba(127,127,127,0.06);
                    border-radius: 10px;
                    font-size: 0.88rem;
                }
                .about-label { color: var(--text-secondary); }
                .about-value { font-weight: 600; color: var(--text-primary); }
                @media (max-width: 480px) {
                    .settings-page { padding: 16px 12px 60px; }
                    .settings-section { padding: 16px; }
                    .settings-title { font-size: 1.35rem; }
                }
            `}</style>
        </div>
    );
};

export default Settings;
