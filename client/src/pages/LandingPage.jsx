import React from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiActivity, FiUsers, FiArrowRight, FiBookOpen } from 'react-icons/fi';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-bg"></div>
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        
        <div className="hero-content">
          <img src="/hec-logo.svg" alt="Terna Higher Education Cell official logo" className="hero-logo" />
          <h1 className="hero-title">
            Terna Engineering College
            <br />
            <span className="text-gradient">Higher Education Cell</span>
          </h1>
          <p className="hero-subtitle">
            Streamlining your higher education journey. Track your applications, connect with alumni, and manage your documents all in one place.
          </p>
          
          <div className="hero-ctas">
            <Link to="/apply" className="cta-card">
              <div className="cta-icon">
                <FiFileText />
              </div>
              <h3 className="cta-title">Apply / Submit Documents</h3>
              <p className="cta-desc">Start your higher education journey. Submit your details, entrance scores, and necessary documents.</p>
              <div className="mt-auto text-accent-blue flex items-center gap-2 font-medium">
                Get Started <FiArrowRight />
              </div>
            </Link>
            
            <Link to="/alumni" className="cta-card">
              <div className="cta-icon">
                <FiUsers />
              </div>
              <h3 className="cta-title">Alumni Directory</h3>
              <p className="cta-desc">Connect with TEC alumni pursuing higher education globally. Find mentors and seek guidance.</p>
              <div className="mt-auto text-accent-blue flex items-center gap-2 font-medium">
                Browse Directory <FiArrowRight />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="features-section container">
        <div className="text-center mb-12">
          <h2 className="text-3xl mb-4">Why use the HEC Portal?</h2>
          <p className="text-text-secondary max-w-2xl mx-auto">We've simplified the process of tracking higher education pursuits for both students and the institution.</p>
        </div>
        
        <div className="features-grid">
          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-purple bg-opacity-20 flex items-center justify-center text-accent-purple text-2xl mb-4">
              <FiBookOpen />
            </div>
            <h3 className="text-xl mb-2">Document Management</h3>
            <p className="text-text-secondary text-sm">Securely upload and store your transcript, offer letters, and scorecards in one central hub.</p>
          </div>
          
          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-blue bg-opacity-20 flex items-center justify-center text-accent-blue text-2xl mb-4">
              <FiActivity />
            </div>
            <h3 className="text-xl mb-2">Status Tracking</h3>
            <p className="text-text-secondary text-sm">Keep your department updated on your admission process, from applying to getting an admit.</p>
          </div>
          
          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-teal bg-opacity-20 flex items-center justify-center text-accent-teal text-2xl mb-4">
              <FiUsers />
            </div>
            <h3 className="text-xl mb-2">Alumni Connect</h3>
            <p className="text-text-secondary text-sm">Discover which universities your seniors are studying at and connect with them for guidance.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Terna Engineering College — Higher Education Cell. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
