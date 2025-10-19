import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'https://sb7snqtgc3.execute-api.us-east-1.amazonaws.com/dev';

const BillingSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
      return;
    }

    // Process the successful payment
    processPayment(sessionId);
  }, [searchParams]);

  const processPayment = async (sessionId) => {
    try {
      setLoading(true);
      
      // Call backend to verify and record the payment
      const response = await fetch(`${API_BASE}/billing/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to process payment');
      }

      const data = await response.json();
      setPaymentDetails(data);
      setLoading(false);

      // Redirect to billing page after 3 seconds
      setTimeout(() => {
        navigate('/billing');
      }, 3000);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Processing Payment...</h2>
          <p className="text-gray-600">Please wait while we confirm your payment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/billing')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-green-500 text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully.
        </p>
        
        {paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">
                  ${(paymentDetails.amount / 100).toFixed(2)}
                </span>
              </div>
              {paymentDetails.caseTitle && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Case:</span>
                  <span className="font-semibold text-gray-900">{paymentDetails.caseTitle}</span>
                </div>
              )}
              {paymentDetails.clientName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-semibold text-gray-900">{paymentDetails.clientName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-4">
          Redirecting to billing page in a few seconds...
        </p>
        
        <button
          onClick={() => navigate('/billing')}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Billing Now
        </button>
      </div>
    </div>
  );
};

export default BillingSuccess;
