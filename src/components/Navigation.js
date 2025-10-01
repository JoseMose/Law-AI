import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ user, onSignOut }) => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/cases') {
      return location.pathname === '/cases' || location.pathname.startsWith('/case/');
    }
    return location.pathname === path;
  };

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo/Brand */}
        <Link to="/cases" className="navbar-brand">
          Law‑AI
        </Link>

        {/* Navigation Links */}
        <ul className="navbar-nav">
          <li>
            <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`} title="Overview of cases, billing, deadlines, etc.">Dashboard</Link>
          </li>
          <li>
            <Link to="/cases" className={`navbar-link ${isActive('/cases') ? 'active' : ''}`} title="🔥 Central hub (everything lives here)">Cases</Link>
          </li>
          <li>
            <Link to="/clients" className={`navbar-link ${isActive('/clients') ? 'active' : ''}`} title="Client directory + history">Clients</Link>
          </li>
          <li>
            <Link to="/billing" className={`navbar-link ${isActive('/billing') ? 'active' : ''}`} title="Global financial overview (invoices, payments, subscriptions)">Billing</Link>
          </li>
          <li>
            <Link to="/settings" className={`navbar-link ${isActive('/settings') ? 'active' : ''}`} title="Account, team, security, integrations">Settings</Link>
          </li>
        </ul>

        {/* User Menu */}
        <div className="navbar-user">
          <span className="text-sm text-gray-600">
            Welcome, {user?.username}
          </span>
          <div className="navbar-avatar">
            {getInitials(user?.username)}
          </div>
          <button 
            onClick={onSignOut}
            className="btn btn-ghost btn-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;