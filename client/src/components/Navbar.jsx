import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <NavLink to="/" className="nav-brand">
          <span className="text-gradient">TEC</span> HEC
        </NavLink>
        
        <div className={`nav-links ${isOpen ? 'active' : ''}`}>
          <NavLink to="/" className="nav-link" onClick={() => setIsOpen(false)}>Home</NavLink>
          <NavLink to="/apply" className="nav-link" onClick={() => setIsOpen(false)}>Apply</NavLink>
          <NavLink to="/alumni" className="nav-link" onClick={() => setIsOpen(false)}>Alumni Directory</NavLink>
          <NavLink to="/admin" className="nav-link" onClick={() => setIsOpen(false)}>Admin</NavLink>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {isOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
