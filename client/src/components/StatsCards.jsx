import React, { useEffect, useState } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiMessageCircle } from 'react-icons/fi';

const CountUp = ({ end, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}</span>;
};

const StatsCards = ({ stats = {} }) => {
  return (
    <div className="stats-grid">
      <div className="card stat-card stat-total">
        <div className="stat-icon"><FiUsers /></div>
        <div className="stat-value"><CountUp end={stats.total || 0} /></div>
        <div className="stat-label">Total Students</div>
      </div>
      <div className="card stat-card stat-completed">
        <div className="stat-icon"><FiCheckCircle /></div>
        <div className="stat-value"><CountUp end={stats.completed || 0} /></div>
        <div className="stat-label">Completed Profiles</div>
      </div>
      <div className="card stat-card stat-pending">
        <div className="stat-icon"><FiClock /></div>
        <div className="stat-value"><CountUp end={stats.pending || 0} /></div>
        <div className="stat-label">Pending Profiles</div>
      </div>
      <div className="card stat-card stat-followup">
        <div className="stat-icon"><FiMessageCircle /></div>
        <div className="stat-value"><CountUp end={stats.followUp || 0} /></div>
        <div className="stat-label">Needs Follow-up</div>
      </div>
    </div>
  );
};

export default StatsCards;
