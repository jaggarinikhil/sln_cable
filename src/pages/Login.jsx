import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Tv } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      const result = await login(username.trim(), password);
      console.log('Login attempt result:', result);
      if (result.success) {
        navigate(result.role === 'owner' ? '/dashboard' : '/billing');
      } else {
        setError(result.message);
        setIsLoggingIn(false);
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand"><Tv size={28} /></div>
        <h1>SLN CABLE</h1>
        <p>Billing Management System</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={16} /> Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label><Lock size={16} /> Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-btn" disabled={isLoggingIn}>
            {isLoggingIn ? 'Logging in...' : (<><LogIn size={16} /> Login</>)}
          </button>
        </form>
      </div>

      <style>{`
        .login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-dark);
        }
        .login-card {
          background-color: var(--bg-card);
          padding: 40px;
          border-radius: 16px;
          border: 1px solid var(--border);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .login-card h1 { color: var(--accent); margin-bottom: 8px; font-weight: 800; }
        .login-card p { color: var(--text-secondary); margin-bottom: 32px; font-size: 0.9rem; }
        .form-group { text-align: left; margin-bottom: 20px; }
        .form-group label { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          color: var(--text-secondary); 
          font-size: 0.85rem; 
          margin-bottom: 8px; 
        }
        .form-group input {
          width: 100%;
          background-color: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-primary);
          outline: none;
        }
        .form-group input:focus { border-color: var(--accent); }
        .login-btn {
          width: 100%;
          background-color: var(--accent);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: background 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .login-brand {
          width: 56px; height: 56px; border-radius: 16px;
          margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;
          background: rgba(99,102,241,0.12); color: var(--accent);
          border: 1px solid rgba(99,102,241,0.25);
        }
        .login-btn:hover { background-color: var(--accent-hover); }
        .error-alert {
          background-color: rgba(248, 113, 113, 0.1);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.85rem;
          border: 1px solid rgba(248, 113, 113, 0.2);
        }
      `}</style>
    </div>
  );
};

export default Login;
