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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  {error}
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
