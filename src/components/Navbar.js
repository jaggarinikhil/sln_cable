import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!user) return null;

  const links = [
    ...(user.role === 'owner' ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
    { to: '/billing', label: 'Billing' },
    { to: '/complaints', label: 'Complaints' },
    { to: '/reports', label: 'Reports' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">📡</span>
        <span className="brand-text">SLN Cable</span>
      </div>

      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
        <span /><span /><span />
      </button>

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={() => setMenuOpen(false)}>
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-user">
        <span className="user-badge">{user.role === 'owner' ? '👑' : '🔧'}</span>
        <span className="user-name">{user.displayName}</span>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
