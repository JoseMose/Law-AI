import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/help.css';

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqCategories = [
    { id: 'all', name: 'All Topics', icon: '📚' },
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'billing', name: 'Billing & Pricing', icon: '💰' },
    { id: 'security', name: 'Security & Privacy', icon: '🔒' },
    { id: 'integrations', name: 'Integrations', icon: '🔗' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🛠️' },
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'How do I get started with Law-AI?',
      answer: 'Getting started is easy! Simply sign up for a free trial, complete your profile setup, and begin uploading your first case documents. Our onboarding guide will walk you through each module: Case Management, Contract AI, Legal Research, e-Signatures, Client Communication, and Billing.'
    },
    {
      category: 'getting-started',
      question: 'What are the 7 core modules included?',
      answer: 'Law-AI includes: (1) Case Management Dashboard, (2) Contract AI Helper with analysis and redlining, (3) AI Legal Researcher for Georgia laws, (4) e-Signature Workflow, (5) Secure Client Communication, (6) Billing & Invoicing with Stripe integration, and (7) Security & Compliance features with full encryption.'
    },
    {
      category: 'billing',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure Stripe integration. Enterprise customers can also arrange for ACH transfers or wire payments with annual billing.'
    },
    {
      category: 'billing',
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees. Your access will continue until the end of your current billing period.'
    },
    {
      category: 'security',
      question: 'How secure is my data?',
      answer: 'Security is our top priority. We use end-to-end encryption, secure AWS infrastructure, and maintain GDPR/HIPAA compliance. All data is encrypted both in transit and at rest, with comprehensive audit logs and role-based access controls.'
    },
    {
      category: 'security',
      question: 'Is Law-AI HIPAA compliant?',
      answer: 'Yes, Law-AI is designed with HIPAA compliance in mind. We maintain strict data privacy controls, secure infrastructure, and proper access management to ensure your sensitive legal data meets healthcare privacy requirements when applicable.'
    },
    {
      category: 'integrations',
      question: 'What integrations are available?',
      answer: 'Currently, Law-AI includes built-in Stripe payment processing and email/SMS notifications. We are developing integrations with popular legal tools, calendar systems, and document management platforms. Enterprise customers can access our API for custom integrations.'
    },
    {
      category: 'troubleshooting',
      question: 'Why is my contract analysis taking longer than expected?',
      answer: 'Contract analysis time depends on document size and complexity. Most contracts are processed within 30-60 seconds. Larger documents (50+ pages) or complex agreements may take 2-3 minutes. Check your internet connection and try refreshing if analysis appears stuck.'
    },
    {
      category: 'troubleshooting',
      question: 'I cannot access the Georgia legal database. What should I do?',
      answer: 'First, ensure you have an active subscription that includes legal research features. Check your internet connection and try clearing your browser cache. If the issue persists, contact our support team as there may be temporary maintenance on the legal database servers.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="help-page">
      {/* Navigation */}
      <nav className="navbar help-nav">
        <div className="navbar-container">
          <div className="navbar-brand help-logo" onClick={() => navigate('/')}>
            Law‑AI
          </div>
          <ul className="navbar-nav">
            <li><button onClick={() => navigate('/')} className="nav-button">Home</button></li>
            <li><button onClick={() => navigate('/about')} className="nav-button">About</button></li>
            <li><button onClick={() => navigate('/help')} className="nav-button active">Help Center</button></li>
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

      {/* Hero Section */}
      <section className="help-hero">
        <div className="container">
          <div className="help-hero-content">
            <h1 className="help-hero-title">
              How can we <span className="help-highlight">help you?</span>
            </h1>
            <p className="help-hero-description">
              Find answers, tutorials, and support resources for Law-AI platform
            </p>
            <div className="help-search">
              <input
                type="text"
                placeholder="Search for help articles, FAQs, or guides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="help-search-input"
              />
              <button className="help-search-button">🔍</button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="help-actions">
        <div className="container">
          <div className="actions-grid">
            <div className="action-card">
              <div className="action-icon">📖</div>
              <h3 className="action-title">Getting Started Guide</h3>
              <p className="action-description">
                Complete walkthrough of setting up your Law-AI account and using all 7 modules
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/documentation')}>
                View Guide
              </button>
            </div>
            <div className="action-card">
              <div className="action-icon">💬</div>
              <h3 className="action-title">Contact Support</h3>
              <p className="action-description">
                Get personalized help from our support team for technical issues or questions
              </p>
              <a href="mailto:support@law-ai.com" className="btn btn-secondary">
                Email Support
              </a>
            </div>
            <div className="action-card">
              <div className="action-icon">👥</div>
              <h3 className="action-title">Community Forum</h3>
              <p className="action-description">
                Connect with other Law-AI users, share tips, and get answers from the community
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/community')}>
                Join Community
              </button>
            </div>
            <div className="action-card">
              <div className="action-icon">📊</div>
              <h3 className="action-title">System Status</h3>
              <p className="action-description">
                Check current system status, uptime, and any ongoing maintenance or issues
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/status')}>
                View Status
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="help-faq">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-description">
              Find quick answers to common questions about Law-AI platform
            </p>
          </div>

          {/* Category Filter */}
          <div className="faq-categories">
            {faqCategories.map(category => (
              <button
                key={category.id}
                className={`category-filter ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="faq-list">
            {filteredFaqs.map((faq, index) => (
              <details key={index} className="faq-item">
                <summary className="faq-question">
                  <span className="faq-icon">❓</span>
                  {faq.question}
                  <span className="faq-toggle">▼</span>
                </summary>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="no-results">
              <p>No FAQs found matching your search criteria.</p>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="help-contact">
        <div className="container">
          <div className="contact-content">
            <h2 className="contact-title">Still need help?</h2>
            <p className="contact-description">
              Our support team is here to help you get the most out of Law-AI
            </p>
            <div className="contact-methods">
              <div className="contact-method">
                <div className="contact-icon">📧</div>
                <h3>Email Support</h3>
                <p>Get detailed help via email</p>
                <a href="mailto:support@law-ai.com" className="contact-link">support@law-ai.com</a>
              </div>
              <div className="contact-method">
                <div className="contact-icon">💬</div>
                <h3>Live Chat</h3>
                <p>Quick answers to urgent questions</p>
                <button className="contact-link" onClick={() => alert('Live chat coming soon!')}>
                  Start Chat
                </button>
              </div>
              <div className="contact-method">
                <div className="contact-icon">📞</div>
                <h3>Phone Support</h3>
                <p>Enterprise customers only</p>
                <span className="contact-link">Available with Enterprise plan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="help-footer">
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

export default HelpCenter;