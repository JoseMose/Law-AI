import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/documentation.css';

const Documentation = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'case-management', title: 'Case Management', icon: '📋' },
    { id: 'contract-ai', title: 'Contract AI', icon: '🤖' },
    { id: 'legal-research', title: 'Legal Research', icon: '🔍' },
    { id: 'e-signatures', title: 'e-Signatures', icon: '✍️' },
    { id: 'client-communication', title: 'Client Communication', icon: '💬' },
    { id: 'billing-invoicing', title: 'Billing & Invoicing', icon: '💰' },
    { id: 'security-compliance', title: 'Security & Compliance', icon: '🔒' },
    { id: 'api-integration', title: 'API & Integration', icon: '🔗' },
  ];

  const documentation = {
    'getting-started': {
      title: 'Getting Started with Law-AI',
      content: [
        {
          heading: 'Account Setup',
          text: 'Follow these steps to get your Law-AI account up and running quickly.',
          steps: [
            'Sign up for your Law-AI account at law-ai.com/signup',
            'Verify your email address and complete profile setup',
            'Choose your subscription plan (Solo Practice, Small Firm, or Enterprise)',
            'Set up your firm information and billing preferences',
            'Configure user roles and permissions for your team'
          ]
        },
        {
          heading: 'Initial Configuration',
          text: 'Configure your platform settings for optimal performance.',
          steps: [
            'Upload your firm logo and customize branding (Enterprise only)',
            'Set up client intake forms and document templates',
            'Configure email notifications and alert preferences',
            'Connect your Stripe account for payment processing',
            'Import existing client and case data (CSV format supported)'
          ]
        },
        {
          heading: 'First Case Creation',
          text: 'Create your first case to familiarize yourself with the platform.',
          steps: [
            'Navigate to Case Management Dashboard',
            'Click "New Case" and fill out case details',
            'Add client information and contact details',
            'Upload initial case documents to secure storage',
            'Set up case timeline and milestone tracking'
          ]
        }
      ]
    },
    'case-management': {
      title: 'Case Management Dashboard',
      content: [
        {
          heading: 'Creating Cases',
          text: 'Manage all your legal cases in one centralized dashboard.',
          steps: [
            'Click "New Case" from the dashboard',
            'Enter case title, client information, and case type',
            'Set case priority level (High, Medium, Low)',
            'Assign team members with appropriate roles',
            'Add case description and initial notes'
          ]
        },
        {
          heading: 'Document Organization',
          text: 'Keep all case documents organized and accessible.',
          steps: [
            'Upload documents using drag-and-drop interface',
            'Organize files in custom folder structures',
            'Tag documents for easy searching and filtering',
            'Set document access permissions by user role',
            'Track document versions and revision history'
          ]
        },
        {
          heading: 'Case Tracking',
          text: 'Monitor case progress and important deadlines.',
          steps: [
            'Set up case milestones and deadlines',
            'Track billable hours and expenses',
            'Add case notes and status updates',
            'Generate case progress reports',
            'Set automated reminders for important dates'
          ]
        }
      ]
    },
    'contract-ai': {
      title: 'Contract AI Helper',
      content: [
        {
          heading: 'Contract Analysis',
          text: 'Upload and analyze contracts with AI-powered insights.',
          steps: [
            'Upload contract files (PDF, DOCX, TXT formats supported)',
            'AI automatically scans for risks, missing clauses, and issues',
            'Review highlighted sections and suggested improvements',
            'Download analysis report with detailed findings',
            'Track analysis history for all processed contracts'
          ]
        },
        {
          heading: 'AI Redlining',
          text: 'Get intelligent suggestions for contract improvements.',
          steps: [
            'Select contract sections for AI review',
            'AI suggests improved clause wording and language',
            'Accept or modify AI suggestions as needed',
            'Track all changes with comprehensive version control',
            'Generate redlined documents for client review'
          ]
        },
        {
          heading: 'Clause Library',
          text: 'Access and manage a library of standard legal clauses.',
          steps: [
            'Browse pre-built clause library by category',
            'Add custom clauses specific to your practice',
            'Insert clauses directly into contract drafts',
            'Maintain clause version history and updates',
            'Share clause libraries across your firm (Enterprise)'
          ]
        }
      ]
    },
    'legal-research': {
      title: 'AI Legal Researcher',
      content: [
        {
          heading: 'Georgia Legal Database',
          text: 'Search comprehensive Georgia laws, statutes, and regulations.',
          steps: [
            'Enter search terms in the legal research interface',
            'Filter results by law type, date, or jurisdiction',
            'Review search results with AI-generated summaries',
            'Bookmark important legal references',
            'Export citations in standard legal formats'
          ]
        },
        {
          heading: 'Case Precedent Search',
          text: 'Find relevant case law and precedents for your legal arguments.',
          steps: [
            'Search by case facts, legal issues, or citations',
            'Review case summaries and key holdings',
            'Analyze precedent relevance to your current case',
            'Save important cases to your research library',
            'Generate case law citations for briefs and filings'
          ]
        },
        {
          heading: 'AI Legal Summaries',
          text: 'Get plain-language explanations of complex legal concepts.',
          steps: [
            'Request AI summary of specific laws or cases',
            'Review simplified explanations with key points',
            'Use summaries for client explanations',
            'Verify AI summaries with original legal text',
            'Save summaries for future reference and reuse'
          ]
        }
      ]
    },
    'e-signatures': {
      title: 'e-Signature Workflow',
      content: [
        {
          heading: 'Signature Requests',
          text: 'Send secure digital signature requests to clients and parties.',
          steps: [
            'Upload document requiring signatures',
            'Add signature fields and specify signers',
            'Customize signing instructions and messages',
            'Send signature requests via secure email links',
            'Track signature status and completion'
          ]
        },
        {
          heading: 'Multi-Party Signing',
          text: 'Coordinate signatures from multiple parties efficiently.',
          steps: [
            'Set up signing order (sequential or parallel)',
            'Assign different access levels to each signer',
            'Configure automatic notifications and reminders',
            'Monitor signing progress in real-time',
            'Receive notifications when all parties have signed'
          ]
        },
        {
          heading: 'Audit Trails',
          text: 'Maintain comprehensive records of all signature activity.',
          steps: [
            'Access detailed audit logs for each document',
            'Review signer authentication and verification',
            'Download tamper-proof audit certificates',
            'Export audit trails for court proceedings',
            'Maintain long-term signature validity records'
          ]
        }
      ]
    },
    'client-communication': {
      title: 'Secure Client Communication',
      content: [
        {
          heading: 'Messaging Portal',
          text: 'Communicate securely with clients through encrypted messaging.',
          steps: [
            'Access client messaging from case dashboard',
            'Send encrypted messages with read receipts',
            'Share documents securely within messages',
            'Set up automated message templates',
            'Archive message history for case records'
          ]
        },
        {
          heading: 'Document Sharing',
          text: 'Share case documents securely with clients and third parties.',
          steps: [
            'Select documents for client sharing',
            'Set document access permissions and expiration',
            'Generate secure download links for clients',
            'Track document access and download history',
            'Receive notifications when documents are viewed'
          ]
        },
        {
          heading: 'Client Updates',
          text: 'Keep clients informed with automated case updates.',
          steps: [
            'Configure automatic update triggers and events',
            'Customize update messages and templates',
            'Choose notification methods (email, SMS, portal)',
            'Set update frequency and client preferences',
            'Track client engagement with updates'
          ]
        }
      ]
    },
    'billing-invoicing': {
      title: 'Billing & Invoicing',
      content: [
        {
          heading: 'Time Tracking',
          text: 'Track billable hours accurately with integrated timers.',
          steps: [
            'Start timers for billable tasks and activities',
            'Categorize time entries by case and task type',
            'Add detailed descriptions and notes',
            'Review and edit time entries before billing',
            'Generate time reports by case or client'
          ]
        },
        {
          heading: 'Invoice Generation',
          text: 'Create professional invoices automatically from time entries.',
          steps: [
            'Select billable time entries for invoicing',
            'Customize invoice templates and branding',
            'Add expenses and additional charges',
            'Preview and approve invoices before sending',
            'Send invoices directly to clients via email'
          ]
        },
        {
          heading: 'Payment Processing',
          text: 'Accept payments securely through Stripe integration.',
          steps: [
            'Connect your Stripe account for payment processing',
            'Enable online payment options for clients',
            'Track payment status and history',
            'Set up automatic payment reminders',
            'Generate financial reports and dashboards'
          ]
        }
      ]
    },
    'security-compliance': {
      title: 'Security & Compliance',
      content: [
        {
          heading: 'Data Encryption',
          text: 'All data is protected with enterprise-grade encryption.',
          steps: [
            'Data encrypted in transit using TLS 1.3 protocol',
            'Data encrypted at rest using AES-256 encryption',
            'Secure key management with AWS KMS',
            'Regular encryption key rotation and updates',
            'Compliance with SOC 2 Type II standards'
          ]
        },
        {
          heading: 'Access Controls',
          text: 'Manage user permissions with role-based access control.',
          steps: [
            'Define user roles (Admin, Lawyer, Paralegal, Assistant)',
            'Set granular permissions for each role',
            'Enable two-factor authentication for all users',
            'Monitor user activity with audit logs',
            'Set up automatic session timeouts'
          ]
        },
        {
          heading: 'Compliance Features',
          text: 'Maintain compliance with legal industry standards.',
          steps: [
            'GDPR compliance with data privacy controls',
            'HIPAA-ready security for healthcare-related cases',
            'Comprehensive audit trails for all activities',
            'Data retention policies and automated cleanup',
            'Regular security assessments and penetration testing'
          ]
        }
      ]
    },
    'api-integration': {
      title: 'API & Integration',
      content: [
        {
          heading: 'REST API Access',
          text: 'Access Law-AI functionality through our RESTful API (Enterprise only).',
          steps: [
            'Generate API keys from your enterprise dashboard',
            'Review API documentation and endpoints',
            'Test API calls using provided examples',
            'Implement authentication using API keys',
            'Monitor API usage and rate limits'
          ]
        },
        {
          heading: 'Webhook Configuration',
          text: 'Receive real-time notifications about platform events.',
          steps: [
            'Configure webhook URLs in your account settings',
            'Select events for webhook notifications',
            'Verify webhook signatures for security',
            'Handle webhook payloads in your application',
            'Test webhook delivery and error handling'
          ]
        },
        {
          heading: 'Third-Party Integrations',
          text: 'Connect Law-AI with your existing legal tools and systems.',
          steps: [
            'Available integrations: Stripe, email systems, calendars',
            'Configure integration settings and credentials',
            'Map data fields between systems',
            'Test integration functionality thoroughly',
            'Monitor integration health and error logs'
          ]
        }
      ]
    }
  };

  const currentDoc = documentation[activeSection];

  return (
    <div className="docs-page">
      {/* Navigation */}
      <nav className="navbar docs-nav">
        <div className="navbar-container">
          <div className="navbar-brand docs-logo" onClick={() => navigate('/')}>
            Law‑AI
          </div>
          <ul className="navbar-nav">
            <li><button onClick={() => navigate('/')} className="nav-button">Home</button></li>
            <li><button onClick={() => navigate('/about')} className="nav-button">About</button></li>
            <li><button onClick={() => navigate('/help')} className="nav-button">Help Center</button></li>
            <li><button onClick={() => navigate('/documentation')} className="nav-button active">Documentation</button></li>
          </ul>
          <div className="navbar-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/signin')}>
              Sign In
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/signin')}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="docs-container">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          <div className="sidebar-header">
            <h3>Documentation</h3>
          </div>
          <nav className="sidebar-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="sidebar-icon">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="docs-content">
          <div className="docs-header">
            <h1 className="docs-title">{currentDoc.title}</h1>
          </div>

          <div className="docs-body">
            {currentDoc.content.map((section, index) => (
              <section key={index} className="docs-section">
                <h2 className="section-heading">{section.heading}</h2>
                <p className="section-text">{section.text}</p>
                
                {section.steps && (
                  <ol className="steps-list">
                    {section.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="step-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>

          {/* Navigation Footer */}
          <div className="docs-nav-footer">
            <div className="nav-buttons">
              {sections.findIndex(s => s.id === activeSection) > 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) - 1].id)}
                >
                  ← Previous
                </button>
              )}
              {sections.findIndex(s => s.id === activeSection) < sections.length - 1 && (
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) + 1].id)}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="docs-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">Law‑AI</div>
              <p className="footer-tagline">
                Comprehensive legal practice management platform.
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <ul>
                  <li><button onClick={() => navigate('/#features')} className="footer-link">Features</button></li>
                  <li><button onClick={() => navigate('/#pricing')} className="footer-link">Pricing</button></li>
                  <li><button onClick={() => navigate('/signin')} className="footer-link">Sign In</button></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li><button onClick={() => navigate('/about')} className="footer-link">About</button></li>
                  <li><button onClick={() => navigate('/status')} className="footer-link">Status</button></li>
                  <li><a href="mailto:careers@law-ai.com" className="footer-link">Careers</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <ul>
                  <li><button onClick={() => navigate('/help')} className="footer-link">Help Center</button></li>
                  <li><button onClick={() => navigate('/documentation')} className="footer-link">Documentation</button></li>
                  <li><button onClick={() => navigate('/community')} className="footer-link">Community</button></li>
                  <li><a href="mailto:contact@law-ai.com" className="footer-link">Contact</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Law-AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Documentation;