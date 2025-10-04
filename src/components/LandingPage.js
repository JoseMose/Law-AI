import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const heroTextY = useTransform(scrollYProgress, [0, 1], [0, -75]);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar landing-nav">
        <div className="navbar-container">
          <div className="navbar-brand landing-logo">Law‑AI</div>
          <ul className="navbar-nav">
            <li><a href="#features" className="navbar-link">Features</a></li>
            <li><a href="#benefits" className="navbar-link">Benefits</a></li>
            <li><a href="#pricing" className="navbar-link">Pricing</a></li>
            <li><button onClick={() => navigate('/about')} className="navbar-link">About</button></li>
            <li><a href="#contact" className="navbar-link">Contact</a></li>
          </ul>
          <div className="navbar-actions">
            <motion.button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/signin')}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              Sign In
            </motion.button>
            <motion.button 
              className="btn btn-primary btn-sm" 
              onClick={() => navigate('/signin')}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        className="hero-section"
        style={{ y: heroY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span>⚖️ Complete Legal Practice Platform</span>
              </div>
              <motion.h1 
                className="hero-title"
                style={{ y: heroTextY }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeInOut" }}
              >
                All-in-One Legal
                <span className="hero-highlight"> Practice Management</span>
                <br />with AI-Powered Tools
              </motion.h1>
              <p className="hero-description">
                Streamline your entire legal practice with integrated case management, AI contract analysis, 
                secure client communication, and automated billing. Everything you need in one secure platform.
              </p>
              <div className="hero-actions">
                <motion.button 
                  className="btn btn-primary btn-lg"
                  onClick={() => navigate('/signin')}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  Start Free Trial
                  <span>→</span>
                </motion.button>
                <motion.button 
                  className="btn btn-secondary btn-lg"
                  onClick={() => scrollToSection('demo')}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <span>▶</span>
                  Watch Demo
                </motion.button>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">7</div>
                  <div className="stat-label">Core Modules</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Secure & Encrypted</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">GA</div>
                  <div className="stat-label">Legal Database</div>
                </div>
              </div>
            </div>

            {/* Hero Visual - Mock Interface */}
            <div className="hero-visual">
              <div className="mock-interface">
                <div className="interface-window">
                  <div className="window-header">
                    <div className="window-controls">
                      <span className="control red"></span>
                      <span className="control yellow"></span>
                      <span className="control green"></span>
                    </div>
                    <div className="window-title">Contract Review - Employment Agreement.pdf</div>
                  </div>
                  <div className="window-content">
                    <div className="review-panel">
                      <div className="panel-header">
                        <h4>AI Analysis Complete</h4>
                        <span className="status-badge success">3 Issues Found</span>
                      </div>
                      <div className="issue-list">
                        <div className="issue-item critical">
                          <span className="issue-icon">🔴</span>
                          <div className="issue-content">
                            <div className="issue-title">Overly Broad Termination Clause</div>
                            <div className="issue-description">Line 45: Clause allows termination without cause</div>
                          </div>
                          <button className="fix-btn">Fix</button>
                        </div>
                        <div className="issue-item warning">
                          <span className="issue-icon">🟡</span>
                          <div className="issue-content">
                            <div className="issue-title">Missing IP Assignment</div>
                            <div className="issue-description">Section 8: No intellectual property clause</div>
                          </div>
                          <button className="fix-btn">Fix</button>
                        </div>
                        <div className="issue-item info">
                          <span className="issue-icon">🔵</span>
                          <div className="issue-content">
                            <div className="issue-title">Incomplete Benefits Detail</div>
                            <div className="issue-description">Section 12: Benefits not fully specified</div>
                          </div>
                          <button className="fix-btn">Fix</button>
                        </div>
                      </div>
                      <button className="apply-all-btn">
                        ✨ Apply All AI Fixes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        id="features" 
        className="features-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features for Legal Professionals</h2>
            <p className="section-description">
              Everything you need to manage documents, review contracts, and organize cases efficiently.
            </p>
          </div>
          
          <div className="features-grid">
            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">📋</div>
              <h3 className="feature-title">Case Management Dashboard</h3>
              <p className="feature-description">
                Create, organize, and track all cases in one centralized platform with 
                client profiles and role-based access control.
              </p>
              <ul className="feature-list">
                <li>✓ Centralized case organization</li>
                <li>✓ Client profiles & history</li>
                <li>✓ Role-based permissions</li>
                <li>✓ Real-time case tracking</li>
              </ul>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">🤖</div>
              <h3 className="feature-title">Contract AI Helper</h3>
              <p className="feature-description">
                AI-powered contract analysis with risk detection, redlining suggestions, 
                and comprehensive clause library for faster drafting.
              </p>
              <ul className="feature-list">
                <li>✓ Automated risk assessment</li>
                <li>✓ AI redlining & suggestions</li>
                <li>✓ Version control tracking</li>
                <li>✓ Standard clause library</li>
              </ul>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">�</div>
              <h3 className="feature-title">AI Legal Researcher</h3>
              <p className="feature-description">
                Search Georgia laws and statutes, find relevant case precedents, and get 
                AI-powered summaries with ready-to-use citations.
              </p>
              <ul className="feature-list">
                <li>✓ Georgia legal database</li>
                <li>✓ Case precedent finder</li>
                <li>✓ Plain-language AI summaries</li>
                <li>✓ Citation export tools</li>
              </ul>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">✍️</div>
              <h3 className="feature-title">e-Signature Workflow</h3>
              <p className="feature-description">
                Secure digital signature requests with audit trails, multi-party signing, 
                and client portal integration for seamless execution.
              </p>
              <ul className="feature-list">
                <li>✓ Digital signature requests</li>
                <li>✓ Tamper-proof audit trails</li>
                <li>✓ Multi-party signing support</li>
                <li>✓ Client portal integration</li>
              </ul>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">�</div>
              <h3 className="feature-title">Secure Client Communication</h3>
              <p className="feature-description">
                Encrypted messaging portal with real-time case updates, secure document sharing, 
                and optional email/SMS alerts integration.
              </p>
              <ul className="feature-list">
                <li>✓ Encrypted messaging portal</li>
                <li>✓ Real-time case updates</li>
                <li>✓ Secure document sharing</li>
                <li>✓ Email/SMS notifications</li>
              </ul>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="feature-icon">�</div>
              <h3 className="feature-title">Billing & Invoicing</h3>
              <p className="feature-description">
                Automated time tracking, invoice generation, payment processing with Stripe, 
                and comprehensive financial dashboard for revenue tracking.
              </p>
              <ul className="feature-list">
                <li>✓ Automated time tracking</li>
                <li>✓ Invoice generation</li>
                <li>✓ Payment processing (Stripe)</li>
                <li>✓ Financial dashboard</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section 
        id="benefits" 
        className="benefits-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="benefits-grid">
            <div className="benefits-content">
              <h2 className="section-title">Why Law Firms Choose Law‑AI</h2>
              <div className="benefit-items">
                <motion.div 
                  className="benefit-item"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="benefit-icon">🔒</div>
                  <div className="benefit-content">
                    <h4>Enterprise-Grade Security</h4>
                    <p>End-to-end encryption, GDPR/HIPAA compliance, and AWS infrastructure ensure your data is always protected.</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="benefit-item"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="benefit-icon">⚡</div>
                  <div className="benefit-content">
                    <h4>Complete Practice Integration</h4>
                    <p>Manage cases, contracts, research, signatures, billing, and client communication in one unified platform.</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="benefit-item"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <div className="benefit-icon">🤖</div>
                  <div className="benefit-content">
                    <h4>AI-Powered Efficiency</h4>
                    <p>Contract analysis, legal research, and document drafting powered by advanced AI to accelerate your workflow.</p>
                  </div>
                </motion.div>
                <motion.div 
                  className="benefit-item"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="benefit-icon">�</div>
                  <div className="benefit-content">
                    <h4>Automated Compliance & Tracking</h4>
                    <p>Audit logs, signature trails, and automated invoicing ensure complete compliance and financial transparency.</p>
                  </div>
                </motion.div>
              </div>
            </div>
            <motion.div 
              className="benefits-visual"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="stats-card">
                <h4>Platform Capabilities</h4>
                <div className="metric">
                  <div className="metric-value">7</div>
                  <div className="metric-label">Integrated modules</div>
                </div>
                <div className="metric">
                  <div className="metric-value">AWS</div>
                  <div className="metric-label">Secure infrastructure</div>
                </div>
                <div className="metric">
                  <div className="metric-value">100%</div>
                  <div className="metric-label">Encrypted & compliant</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Pricing Section */}
      <motion.section 
        id="pricing" 
        className="pricing-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Complete Legal Platform Pricing</h2>
            <p className="section-description">
              All-in-one pricing includes case management, AI tools, e-signatures, billing, and secure communication. No hidden fees.
            </p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="plan-name">Solo Practice</h3>
                <div className="plan-price">
                  <span className="price">$149</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-description">Complete legal platform for solo practitioners</p>
              </div>
              <ul className="plan-features">
                <li>✓ Case management dashboard</li>
                <li>✓ AI contract analyzer & redlining</li>
                <li>✓ Georgia legal research</li>
                <li>✓ E-signature workflow</li>
                <li>✓ Client communication portal</li>
                <li>✓ Basic time tracking & billing</li>
                <li>✓ 10GB secure storage (S3)</li>
              </ul>
              <button className="btn btn-secondary w-full">Start Free Trial</button>
            </div>

            <div className="pricing-card featured">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3 className="plan-name">Small Firm</h3>
                <div className="plan-price">
                  <span className="price">$299</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-description">Full platform for small to mid-size firms</p>
              </div>
              <ul className="plan-features">
                <li>✓ All Solo Practice features</li>
                <li>✓ Role-based access control</li>
                <li>✓ Multi-party e-signatures</li>
                <li>✓ Advanced billing & invoicing</li>
                <li>✓ Payment processing (Stripe)</li>
                <li>✓ Financial dashboard</li>
                <li>✓ Audit logs & compliance</li>
                <li>✓ 100GB secure storage</li>
              </ul>
              <button className="btn btn-primary w-full">Start Free Trial</button>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3 className="plan-name">Enterprise</h3>
                <div className="plan-price">
                  <span className="price">Custom</span>
                </div>
                <p className="plan-description">Large firms & custom requirements</p>
              </div>
              <ul className="plan-features">
                <li>✓ All Small Firm features</li>
                <li>✓ Multi-state legal database</li>
                <li>✓ Custom branding (white-label)</li>
                <li>✓ Advanced AI document drafting</li>
                <li>✓ International compliance modules</li>
                <li>✓ Dedicated support & training</li>
                <li>✓ Unlimited storage</li>
                <li>✓ SLA guarantees & priority</li>
              </ul>
              <button className="btn btn-secondary w-full">Contact Sales</button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="cta-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Legal Practice?</h2>
            <p>Join hundreds of law firms already using Law‑AI to streamline their document workflows.</p>
            <div className="cta-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/signin')}
              >
                Start Your Free Trial
              </button>
              <button className="btn btn-ghost btn-lg">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer id="contact" className="about-footer">
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
                  <li><a href="#features" className="footer-link">Features</a></li>
                  <li><a href="#pricing" className="footer-link">Pricing</a></li>
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

export default LandingPage;