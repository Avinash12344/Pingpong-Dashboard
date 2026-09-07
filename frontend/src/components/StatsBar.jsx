import React from 'react';
import { FaServer, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import '../styles/components/StatsBar.css';

const StatsBar = ({ status }) => {
  if (!status) return null;

  const stats = [
    {
      label: 'Services',
      value: status.summary?.total || 0,
      icon: <FaServer className="stats-bar__icon stats-bar__icon--blue" />,
    },
    {
      label: 'Healthy',
      value: status.summary?.healthy || 0,
      icon: <FaCheckCircle className="stats-bar__icon stats-bar__icon--green" />,
    },
    {
      label: 'Unhealthy',
      value: status.summary?.unhealthy || 0,
      icon: <FaExclamationTriangle className="stats-bar__icon stats-bar__icon--red" />,
    },
    {
      label: 'Last Check',
      value: status.lastCheck ? new Date(status.lastCheck).toLocaleTimeString() : 'Never',
      icon: <FaClock className="stats-bar__icon stats-bar__icon--purple" />,
    },
  ];

  return (
    <div className="stats-bar">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="stats-bar__item"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="stats-bar__icon">{stat.icon}</div>
          <div className="stats-bar__content">
            <p className="stats-bar__label">{stat.label}</p>
            <p className="stats-bar__value">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;