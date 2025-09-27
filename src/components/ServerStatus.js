import React, { useEffect, useState } from 'react';

export const ServerStatus = () => {
  const [status, setStatus] = useState('checking');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${API_URL}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'same-origin'
        });
        
        if (response.ok) {
          setStatus('connected');
        } else {
          console.error('Server error:', await response.text());
          setStatus('error');
        }
      } catch (error) {
        console.error('Server connection error:', error);
        if (error instanceof TypeError && error.message.includes('CORS')) {
          setStatus('cors-error');
        } else {
          setStatus('error');
        }
      }
    };

    checkServer();
    // Add API_URL to dependencies array to refresh check if URL changes
  }, [API_URL]);

  if (status === 'cors-error') {
    return (
      <div style={{ 
        backgroundColor: '#fee2e2', 
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        CORS Error: Unable to connect to server due to security restrictions. Please ensure the server is running and properly configured.
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ 
        backgroundColor: '#fee2e2', 
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        Unable to connect to server. Please ensure the server is running at {API_URL}.
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div style={{
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        padding: '0.75rem',
        borderRadius: '6px',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        Checking server connection...
      </div>
    );
  }

  return null;
};