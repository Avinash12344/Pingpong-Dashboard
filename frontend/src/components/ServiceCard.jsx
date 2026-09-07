import React from 'react';
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import '../styles/components/ServiceCard.css';

const ServiceCard = ({ service }) => {
  const getStatusConfig = () => {
    switch (service.status) {
      case 'healthy':
        return {
          statusClass: 'service-card--healthy',
          icon: <FaCheckCircle className="service-card__status-icon service-card__status-icon--healthy" />,
          statusText: 'Operational',
          statusValueClass: 'service-card__value--healthy',
        };
      case 'unhealthy':
        return {
          statusClass: 'service-card--unhealthy',
          icon: <FaExclamationCircle className="service-card__status-icon service-card__status-icon--unhealthy" />,
          statusText: 'Degraded',
          statusValueClass: 'service-card__value--unhealthy',
        };
      default:
        return {
          statusClass: 'service-card--unknown',
          icon: <FaSpinner className="service-card__status-icon service-card__status-icon--unknown animate-spin" />,
          statusText: 'Unknown',
          statusValueClass: 'service-card__value--unknown',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`service-card ${config.statusClass}`}>
      <div className="service-card__header">
        <h3 className="service-card__name">{service.name}</h3>
        {config.icon}
      </div>

      <div className="service-card__body">
        <div className="service-card__row">
          <span className="service-card__label">Status:</span>
          <span className={`service-card__value ${config.statusValueClass}`}>
            {config.statusText}
          </span>
        </div>

        <div className="service-card__row">
          <span className="service-card__label">Latency:</span>
          <span className="service-card__value">
            {service.latency ? `${service.latency}ms` : 'N/A'}
          </span>
        </div>

        <div className="service-card__row">
          <span className="service-card__label">Uptime:</span>
          <span className="service-card__value">
            {service.uptime ? `${service.uptime.toFixed(1)}%` : 'N/A'}
          </span>
        </div>

        <div className="service-card__row">
          <span className="service-card__label">Last Check:</span>
          <span className="service-card__value" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
            {service.lastCheck ? new Date(service.lastCheck).toLocaleTimeString() : 'Never'}
          </span>
        </div>

        {service.error && (
          <div className="service-card__error">
            Error: {service.error}
          </div>
        )}

        <div className="service-card__footer">
          <span>Checks: {service.checks || 0}</span>
          <span>Failures: {service.failures || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;