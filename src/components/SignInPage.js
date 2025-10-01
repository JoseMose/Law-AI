import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SignInPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (showConfirm) {
        await confirmSignUp(username, code);
        setShowConfirm(false);
        setIsSignUp(false);
        setError('Account confirmed! Please sign in.');
      } else if (isSignUp) {
        await signUp(username, password, email);
        setShowConfirm(true);
      } else {
        await signIn(username, password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <button 
              onClick={() => navigate('/')}
              className="text-2xl font-bold text-gray-900 hover:text-accent transition-colors"
            >
              Law‑AI
            </button>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {showConfirm 
              ? 'Confirm your account' 
              : isSignUp 
                ? 'Create your account' 
                : 'Sign in to your account'
            }
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {!isSignUp && !showConfirm && (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="font-medium text-accent hover:text-accent-dark"
                >
                  Sign up
                </button>
              </>
            )}
            {isSignUp && !showConfirm && (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="font-medium text-accent hover:text-accent-dark"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {showConfirm ? (
              <div className="form-group">
                <label htmlFor="code" className="form-label">
                  Confirmation Code
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter confirmation code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <p className="form-help">
                  Check your email for the confirmation code
                </p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="form-input"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input pr-10"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="form-help">
                      Must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="form-error bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex justify-center"
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : showConfirm ? (
                'Confirm Account'
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {showConfirm && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setIsSignUp(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to sign in
              </button>
            </div>
          )}
        </form>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-accent"
          >
            ← Back to homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;