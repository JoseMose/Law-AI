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
            <Link 
              to="/cases" 
              className={`navbar-link ${isActive('/cases') ? 'active' : ''}`}
            >
              Cases
            </Link>
          </li>
          {/* Future navigation items can go here */}
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