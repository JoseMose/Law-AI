import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/about.css';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      {/* Navigation */}
      <nav className="navbar landing-nav">
        <div className="navbar-container">
          <div className="navbar-brand landing-logo">Law‑AI</div>
          <ul className="navbar-nav">
            <li><button onClick={() => navigate('/#features')} className="navbar-link">Features</button></li>
            <li><button onClick={() => navigate('/#benefits')} className="navbar-link">Benefits</button></li>
            <li><button onClick={() => navigate('/#pricing')} className="navbar-link">Pricing</button></li>
            <li><button onClick={() => navigate('/about')} className="navbar-link active">About</button></li>
            <li><button onClick={() => navigate('/#contact')} className="navbar-link">Contact</button></li>
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
        className="about-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
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
      </motion.section>

      {/* Mission Section */}
      <motion.section 
        className="about-mission"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
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
      </motion.section>

      {/* Values Section */}
      <motion.section 
        className="about-values"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="section-header">
            <div className="section-badge">Our Values</div>
            <h2 className="section-title">What Drives Us</h2>
          </div>
          <div className="values-grid">
            <motion.div 
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="value-icon">🔒</div>
              <h3 className="value-title">Security First</h3>
              <p className="value-description">
                We understand the sensitive nature of legal documents. Our platform 
                is built with enterprise-grade security, end-to-end encryption, and 
                strict compliance with legal industry standards.
              </p>
            </motion.div>
            <motion.div 
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="value-icon">🎯</div>
              <h3 className="value-title">Precision & Accuracy</h3>
              <p className="value-description">
                Legal work demands perfection. Our AI models are trained on millions 
                of legal documents and continuously refined to provide the highest 
                accuracy in contract analysis and document review.
              </p>
            </motion.div>
            <motion.div 
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="value-icon">🤝</div>
              <h3 className="value-title">Human-Centered Design</h3>
              <p className="value-description">
                Technology should enhance human capabilities, not complicate them. 
                Every feature is designed with the legal professional's workflow and 
                expertise at the center of the experience.
              </p>
            </motion.div>
            <motion.div 
              className="value-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="value-icon">⚡</div>
              <h3 className="value-title">Efficiency & Speed</h3>
              <p className="value-description">
                Time is money in legal practice. Our AI can review contracts 10x 
                faster than traditional methods, allowing lawyers to focus on 
                high-value strategic work.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Team Section */}
      <motion.section 
        className="about-team"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
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
            <motion.div 
              className="team-member"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="member-avatar">👨‍💼</div>
              <h3 className="member-name">Joseph Esfandiari</h3>
              <p className="member-title">Founder & Creator</p>
              <p className="member-bio">
                Visionary entrepreneur and legal technology innovator who identified the need for 
                a comprehensive, all-in-one legal practice management platform. Combines deep 
                understanding of legal workflows with modern technology solutions.
              </p>
            </motion.div>
            <motion.div 
              className="team-member"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="member-avatar">👨‍💻</div>
              <h3 className="member-name">Development Team</h3>
              <p className="member-title">Technical Implementation</p>
              <p className="member-bio">
                Expert developers specializing in AI integration, secure cloud infrastructure, 
                and legal compliance. Focused on building enterprise-grade solutions that 
                meet the demanding security and performance requirements of legal practice.
              </p>
            </motion.div>
            <motion.div 
              className="team-member"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="member-avatar">👩‍⚖️</div>
              <h3 className="member-name">Legal Advisory Board</h3>
              <p className="member-title">Industry Expertise</p>
              <p className="member-bio">
                Experienced legal professionals providing guidance on compliance, security, 
                and best practices. Ensures the platform meets the real-world needs of 
                modern legal practices while maintaining the highest standards.
              </p>
            </motion.div>
            <motion.div 
              className="team-member"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="member-avatar">�️</div>
              <h3 className="member-name">Security & Compliance</h3>
              <p className="member-title">Data Protection</p>
              <p className="member-bio">
                Cybersecurity experts ensuring GDPR/HIPAA compliance, end-to-end encryption, 
                and enterprise-grade security. Built on AWS infrastructure with comprehensive 
                audit trails and access controls for complete data protection.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Story Section */}
      <motion.section 
        className="about-story"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="story-grid">
            <div className="story-content">
              <div className="section-badge">Our Story</div>
              <h2 className="section-title">From Vision to Reality</h2>
              <div className="story-timeline">
                <motion.div 
                  className="timeline-item"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="timeline-year">2024</div>
                  <div className="timeline-content">
                    <h4>The Vision</h4>
                    <p>
                      Joseph Esfandiari identified the fragmentation in legal technology - 
                      lawyers were juggling multiple systems for case management, document review, 
                      billing, and client communication. There had to be a better way.
                    </p>
                  </div>
                </motion.div>
                <motion.div 
                  className="timeline-item"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="timeline-year">Early 2025</div>
                  <div className="timeline-content">
                    <h4>The Development</h4>
                    <p>
                      Joseph began developing Law-AI as a comprehensive platform integrating 
                      all essential legal practice tools with AI-powered features, built on 
                      secure AWS infrastructure with enterprise-grade compliance.
                    </p>
                  </div>
                </motion.div>
                <motion.div 
                  className="timeline-item"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.3 }}
                  viewport={{ once: true }}
                >
                  <div className="timeline-year">Mid 2025</div>
                  <div className="timeline-content">
                    <h4>The Platform</h4>
                    <p>
                      The complete platform launched with 7 core modules: Case Management, 
                      Contract AI, Legal Research, e-Signatures, Client Communication, 
                      Billing, and Security & Compliance features.
                    </p>
                  </div>
                </motion.div>
                <motion.div 
                  className="timeline-item"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut", delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <div className="timeline-year">Today</div>
                  <div className="timeline-content">
                    <h4>The Future</h4>
                    <p>
                      Law-AI continues to evolve with plans for multi-state legal databases, 
                      international compliance modules, and advanced AI-powered document 
                      drafting to serve legal professionals worldwide.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
            <motion.div 
              className="story-visual"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="story-graphic">
                <div className="story-element">📊</div>
                <div className="story-element">⚖️</div>
                <div className="story-element">🤖</div>
                <div className="story-element">📈</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="about-cta"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Legal Practice?</h2>
            <p className="cta-description">
              Join hundreds of law firms already using Law-AI to work smarter, not harder.
            </p>
            <div className="cta-actions">
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
                onClick={() => navigate('/#contact')}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                Contact Sales
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>

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