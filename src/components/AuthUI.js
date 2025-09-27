import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ServerStatus } from './ServerStatus';
import '../styles/Auth.css';
import logo from '../logo.svg';

export const AuthUI = ({ children }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [sessionValue, setSessionValue] = useState(null);
  const { signIn, signUp, confirmSignUp, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (showConfirm) {
        await confirmSignUp(username, code);
        setShowConfirm(false);
        setIsSignUp(false);
      } else if (isSignUp) {
        await signUp(username, password, email);
        setShowConfirm(true);
      } else if (challenge) {
        // Handle NEW_PASSWORD_REQUIRED
        const { authService } = require('../services/auth-new');
        const result = await authService.respondToChallenge(username, sessionValue, challenge, password);
        if (result.success) {
          // tokens are stored by the service
          window.location.reload();
        } else if (result.challenge) {
          setChallenge(result.challenge);
          setSessionValue(result.session);
          setError('Additional challenge required.');
        }
      } else {
        const res = await signIn(username, password);
        if (res && res.challenge) {
          setChallenge(res.challenge);
          setSessionValue(res.session);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      // Handle specific error codes
      if (err.code === 'NETWORK_ERROR') {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else if (err.code === 'AUTH_FAILED') {
        setError('Invalid username or password.');
      } else if (err.code === 'SERVER_ERROR') {
        setError('Server error. Please try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return children;
  }

  return (
    <div className="auth-container">
      <ServerStatus />
      <div className="auth-header">
        <img src={logo} alt="Logo" className="auth-logo" />
        <h2>{showConfirm ? 'Confirm Sign Up' : isSignUp ? 'Create Account' : challenge ? 'Set New Password' : 'Welcome Back'}</h2>
      </div>

      <div className="form-progress">
        {isSignUp && (
          <>
            <div className={`progress-step ${!showConfirm && 'active'}`} />
            <div className={`progress-step ${showConfirm && 'active'}`} />
          </>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="auth-form">
        {!showConfirm && (
          <>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            
            {isSignUp && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Password</label>
              <div className="password-toggle">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a password" : challenge ? "Enter new password" : "Enter your password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isSignUp && (
                <div className="password-requirements">
                  Password must be at least 8 characters long
                </div>
              )}
            </div>
          </>
        )}

        {showConfirm && (
          <div className="form-group">
            <label>Confirmation Code</label>
            <div className="confirmation-code">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                maxLength={6}
                required
              />
            </div>
            <div className="password-requirements">
              Enter the verification code sent to your email
            </div>
          </div>
        )}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? (
            <div className="auth-loading">
              <div className="auth-loading-spinner"></div>
              Please wait...
            </div>
          ) : (
            showConfirm ? 'Verify Code' : isSignUp ? 'Create Account' : challenge ? 'Set New Password' : 'Sign In'
          )}
        </button>
      </form>

      {!showConfirm && (
        <button 
          className="auth-button secondary"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      )}
    </div>
  );
};