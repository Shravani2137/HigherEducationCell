import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import ternaLogo from "../assets/terna.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <NavLink to="/" className="nav-brand">
          <img
            className="nav-logo"
            src={ternaLogo}
            alt="Terna Engineering College"
          />
          <span className="nav-brand-text">
            <strong>Higher Education Cell</strong>
            <small>Student portal</small>
          </span>
        </NavLink>

        <div className={`nav-links ${isOpen ? "active" : ""}`}>
          <NavLink to="/" className="nav-link" onClick={() => setIsOpen(false)}>
            Home
          </NavLink>
          <NavLink
            to="/apply"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Apply
          </NavLink>
          <NavLink
            to="/alumni"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Alumni Directory
          </NavLink>
          <NavLink
            to="/admin"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Admin
          </NavLink>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
