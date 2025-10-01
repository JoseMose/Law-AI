import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/about.css';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      {/* Navigation */}
      <nav className="navbar about-nav">
        <div className="navbar-container">
          <div className="navbar-brand about-logo" onClick={() => navigate('/')}>
            Law‑AI
          </div>
          <ul className="navbar-nav">
            <li><button onClick={() => navigate('/')} className="nav-button">Home</button></li>
            <li><button onClick={() => navigate('/#features')} className="nav-button">Features</button></li>
            <li><button onClick={() => navigate('/#pricing')} className="nav-button">Pricing</button></li>
            <li><button onClick={() => navigate('/about')} className="nav-button active">About</button></li>
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
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1 className="about-hero-title">
              Complete Legal Practice
              <span className="about-highlight"> Management Platform</span>
            </h1>
            <p className="about-hero-description">
              Law-AI was created to provide legal professionals with a comprehensive, 
              all-in-one platform that integrates every aspect of modern legal practice.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission">
        <div className="container">
          <div className="mission-grid">
            <div className="mission-content">
              <div className="section-badge">Our Mission</div>
              <h2 className="section-title">Streamlining Legal Practice</h2>
              <p className="mission-text">
                Our mission is to provide legal professionals with an integrated platform that 
                combines case management, AI-powered contract analysis, secure client communication, 
                automated billing, and comprehensive legal research tools - all in one secure, 
                compliant system built on enterprise-grade AWS infrastructure.
              </p>
              <div className="mission-stats">
                <div className="stat-card">
                  <div className="stat-number">2025</div>
                  <div className="stat-label">Founded</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">7</div>
                  <div className="stat-label">Core Modules</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">Secure & Encrypted</div>
                </div>
              </div>
            </div>
            <div className="mission-visual">
              <div className="mission-icon">⚖️</div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">Our Values</div>
            <h2 className="section-title">What Drives Us</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">🔒</div>
              <h3 className="value-title">Security First</h3>
              <p className="value-description">
                We understand the sensitive nature of legal documents. Our platform 
                is built with enterprise-grade security, end-to-end encryption, and 
                strict compliance with legal industry standards.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">🎯</div>
              <h3 className="value-title">Precision & Accuracy</h3>
              <p className="value-description">
                Legal work demands perfection. Our AI models are trained on millions 
                of legal documents and continuously refined to provide the highest 
                accuracy in contract analysis and document review.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">🤝</div>
              <h3 className="value-title">Human-Centered Design</h3>
              <p className="value-description">
                Technology should enhance human capabilities, not complicate them. 
                Every feature is designed with the legal professional's workflow and 
                expertise at the center of the experience.
              </p>
            </div>
            <div className="value-card">
              <div className="value-icon">⚡</div>
              <h3 className="value-title">Efficiency & Speed</h3>
              <p className="value-description">
                Time is money in legal practice. Our AI can review contracts 10x 
                faster than traditional methods, allowing lawyers to focus on 
                high-value strategic work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-team">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">Our Team</div>
            <h2 className="section-title">Building the Future of Legal Practice</h2>
            <p className="section-description">
              Our team brings together legal industry expertise, advanced technology development, 
              and security compliance to create a platform that truly serves legal professionals.
            </p>
          </div>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">👨‍💼</div>
              <h3 className="member-name">Joseph Esfandiari</h3>
              <p className="member-title">Founder & Creator</p>
              <p className="member-bio">
                Visionary entrepreneur and legal technology innovator who identified the need for 
                a comprehensive, all-in-one legal practice management platform. Combines deep 
                understanding of legal workflows with modern technology solutions.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">👨‍💻</div>
              <h3 className="member-name">Development Team</h3>
              <p className="member-title">Technical Implementation</p>
              <p className="member-bio">
                Expert developers specializing in AI integration, secure cloud infrastructure, 
                and legal compliance. Focused on building enterprise-grade solutions that 
                meet the demanding security and performance requirements of legal practice.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍⚖️</div>
              <h3 className="member-name">Legal Advisory Board</h3>
              <p className="member-title">Industry Expertise</p>
              <p className="member-bio">
                Experienced legal professionals providing guidance on compliance, security, 
                and best practices. Ensures the platform meets the real-world needs of 
                modern legal practices while maintaining the highest standards.
              </p>
            </div>
            <div className="team-member">
              <div className="member-avatar">�️</div>
              <h3 className="member-name">Security & Compliance</h3>
              <p className="member-title">Data Protection</p>
              <p className="member-bio">
                Cybersecurity experts ensuring GDPR/HIPAA compliance, end-to-end encryption, 
                and enterprise-grade security. Built on AWS infrastructure with comprehensive 
                audit trails and access controls for complete data protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="about-story">
        <div className="container">
          <div className="story-grid">
            <div className="story-content">
              <div className="section-badge">Our Story</div>
              <h2 className="section-title">From Vision to Reality</h2>
              <div className="story-timeline">
                <div className="timeline-item">
                  <div className="timeline-year">2024</div>
                  <div className="timeline-content">
                    <h4>The Vision</h4>
                    <p>
                      Joseph Esfandiari identified the fragmentation in legal technology - 
                      lawyers were juggling multiple systems for case management, document review, 
                      billing, and client communication. There had to be a better way.
                    </p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-year">Early 2025</div>
                  <div className="timeline-content">
                    <h4>The Development</h4>
                    <p>
                      Joseph began developing Law-AI as a comprehensive platform integrating 
                      all essential legal practice tools with AI-powered features, built on 
                      secure AWS infrastructure with enterprise-grade compliance.
                    </p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-year">Mid 2025</div>
                  <div className="timeline-content">
                    <h4>The Platform</h4>
                    <p>
                      The complete platform launched with 7 core modules: Case Management, 
                      Contract AI, Legal Research, e-Signatures, Client Communication, 
                      Billing, and Security & Compliance features.
                    </p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-year">Today</div>
                  <div className="timeline-content">
                    <h4>The Future</h4>
                    <p>
                      Law-AI continues to evolve with plans for multi-state legal databases, 
                      international compliance modules, and advanced AI-powered document 
                      drafting to serve legal professionals worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="story-visual">
              <div className="story-graphic">
                <div className="story-element">📊</div>
                <div className="story-element">⚖️</div>
                <div className="story-element">🤖</div>
                <div className="story-element">📈</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Legal Practice?</h2>
            <p className="cta-description">
              Join hundreds of law firms already using Law-AI to work smarter, not harder.
            </p>
            <div className="cta-actions">
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/signin')}
              >
                Start Free Trial
                <span>→</span>
              </button>
              <button 
                className="btn btn-secondary btn-lg"
                onClick={() => navigate('/#contact')}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="about-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">Law‑AI</div>
              <p className="footer-tagline">
                Intelligent legal technology for modern law firms.
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

export default AboutPage;