import React from 'react';
import { ServerStatus } from './ServerStatus';

export const DemoMode = () => {
  return (
    <div className="App">
      <ServerStatus />
      <div className="demo-mode" style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
          🚀 Law-AI Frontend Demo
        </h1>
        
        <div style={{ 
          backgroundColor: '#f9fafb', 
          padding: '1.5rem', 
          borderRadius: '6px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ color: '#374151', marginBottom: '1rem' }}>
            Welcome to Law-AI!
          </h3>
          <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
            This is a legal document analysis platform powered by AI. 
            Currently, you're viewing the frontend-only version deployed on AWS Amplify.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gap: '1rem', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          marginBottom: '2rem'
        }}>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px' 
          }}>
            <h4 style={{ color: '#374151', marginBottom: '0.5rem' }}>📄 Document Analysis</h4>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              AI-powered contract review and analysis using AWS Textract and Bedrock
            </p>
          </div>
          
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px' 
          }}>
            <h4 style={{ color: '#374151', marginBottom: '0.5rem' }}>🔐 Secure Authentication</h4>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              AWS Cognito integration for secure user management
            </p>
          </div>
          
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#f3f4f6', 
            borderRadius: '6px' 
          }}>
            <h4 style={{ color: '#374151', marginBottom: '0.5rem' }}>☁️ Cloud Storage</h4>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              AWS S3 integration for secure document storage and management
            </p>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#eff6ff', 
          padding: '1.5rem', 
          borderRadius: '6px',
          border: '1px solid #dbeafe'
        }}>
          <h4 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>
            🛠️ To Enable Full Functionality
          </h4>
          <ol style={{ 
            textAlign: 'left', 
            color: '#374151', 
            lineHeight: '1.6',
            paddingLeft: '1rem'
          }}>
            <li>Deploy the backend using AWS Lambda + API Gateway</li>
            <li>Configure environment variables in Amplify Console</li>
            <li>Update REACT_APP_API_URL to your deployed API endpoint</li>
            <li>Apply IAM policies from the security guide</li>
          </ol>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <a 
            href="https://github.com/JoseMose/Law-AI" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1f2937',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
};