import React from "react";
import { Link } from "react-router-dom";
import { FiActivity, FiUsers, FiArrowRight, FiBookOpen } from "react-icons/fi";
import hecLogo from "../assets/hec_logo.png";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-campus-image" aria-hidden="true" />
        <div className="hero-content">
          <img
            className="hero-hec-logo"
            src={hecLogo}
            alt="Terna Higher Education Cell crest"
          />
          <p className="eyebrow">OFFICIAL STUDENT PORTAL</p>
          <h1 className="hero-title">Higher Education Cell</h1>
          <p className="hero-subtitle">
            Supporting students in their journey towards higher education with a
            clear, secure application and document process.
          </p>
          <div className="hero-ctas">
            <Link to="/apply" className="btn btn-primary">
              Submit Higher Education Details <FiArrowRight />
            </Link>
            <Link to="/alumni" className="btn btn-secondary">
              Explore Alumni Guidance
            </Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Higher Education Cell process">
          <div className="hero-panel-top">
            <FiBookOpen />
            <span>Student support, in one place</span>
          </div>
          <div className="hero-rule" />
          <div className="hero-feature">
            <span>01</span>
            <div>
              <strong>Enter details</strong>
              <small>Academic and higher education information</small>
            </div>
          </div>
          <div className="hero-feature">
            <span>02</span>
            <div>
              <strong>Upload documents</strong>
              <small>Securely submit the required records</small>
            </div>
          </div>
          <div className="hero-feature">
            <span>03</span>
            <div>
              <strong>Track verification</strong>
              <small>Review and approval by the HEC team</small>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section container">
        <div className="text-center mb-12">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2 className="text-3xl mb-4">
            A straightforward process for every student
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Submit your information once, keep your documents together, and let
            the HEC team guide the review.
          </p>
        </div>

        <div className="features-grid">
          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-purple bg-opacity-20 flex items-center justify-center text-accent-purple text-2xl mb-4">
              <FiBookOpen />
            </div>
            <h3 className="text-xl mb-2">Document Management</h3>
            <p className="text-text-secondary text-sm">
              Securely upload and store your transcript, offer letters, and
              scorecards in one central hub.
            </p>
          </div>

          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-blue bg-opacity-20 flex items-center justify-center text-accent-blue text-2xl mb-4">
              <FiActivity />
            </div>
            <h3 className="text-xl mb-2">Status Tracking</h3>
            <p className="text-text-secondary text-sm">
              Keep your department updated on your admission process, from
              applying to getting an admit.
            </p>
          </div>

          <div className="card text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-teal bg-opacity-20 flex items-center justify-center text-accent-teal text-2xl mb-4">
              <FiUsers />
            </div>
            <h3 className="text-xl mb-2">Alumni Connect</h3>
            <p className="text-text-secondary text-sm">
              Discover which universities your seniors are studying at and
              connect with them for guidance.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          &copy; {new Date().getFullYear()} Terna Engineering College — Higher
          Education Cell. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
