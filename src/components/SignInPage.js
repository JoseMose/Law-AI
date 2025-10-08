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
  const { signIn, signUp, confirmSignUp, setUser } = useAuth();
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Card Container */}
        <div className="card">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {showConfirm
                ? 'Confirm your account'
                : isSignUp
                  ? 'Create your account'
                  : 'Welcome back'
              }
            </h2>
            <p className="text-gray-600 text-sm">
              {!isSignUp && !showConfirm && (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="btn btn-primary"
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
                    className="btn btn-primary"
                  >
                    Sign in
                  </button>
                </>
              )}
              {showConfirm && 'Enter the confirmation code sent to your email'}
            </p>
          </div>

          {/* Form */}
          <div className="card-body">
            {/* Demo Access Button */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">🚀 Quick Demo Access</h3>
              <p className="text-xs text-blue-600 mb-3">
                Skip authentication and try the case law search feature immediately
              </p>
              <button
                type="button"
                onClick={() => {
                  // Set demo user and navigate to dashboard
                  setUser({ username: 'demo-user', demo: true });
                  sessionStorage.setItem('username', 'demo-user');
                  sessionStorage.setItem('accessToken', 'demo-token');
                  navigate('/dashboard');
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🎯 Try Case Law Search Now
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or sign in with account</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              {showConfirm ? (
                <div>
                  <label htmlFor="code" className="form-label text-center">
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
                  <p className="text-xs text-gray-500 mt-2">
                    Check your email for the confirmation code
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="username" className="form-label text-center">
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
                    {!isSignUp && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>Note:</strong> Authentication system is currently unavailable. Use demo access instead.
                      </div>
                    )}
                  </div>

                  {isSignUp && (
                    <div>
                      <label htmlFor="email" className="form-label text-center">
                        Email Address
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

                  <div>
                    <label htmlFor="password" className="form-label text-center">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="form-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {isSignUp && (
                      <p className="text-xs text-gray-500 mt-2">
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="font-medium mb-1">Authentication Error</div>
                  <div>{error}</div>
                  <div className="text-xs text-red-600 mt-2">
                    💡 <strong>Tip:</strong> Use the demo access button above to try the app without signing in
                  </div>
                </div>
              )}

              <div className="text-center mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
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
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
              >
                ← Back to homepage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
