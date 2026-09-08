import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import '../styles/components/AlertSystem.css';

const AlertSystem = ({ serviceStatus, previousStatus }) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!serviceStatus || !previousStatus) return;

    const newAlerts = [];

    // Check each service for status changes
    Object.values(serviceStatus.services || {}).forEach((service) => {
      const prevService = previousStatus.services?.[service.name];
      
      if (prevService) {
        // Service went from healthy to unhealthy
        if (prevService.status === 'healthy' && service.status === 'unhealthy') {
          newAlerts.push({
            id: Date.now() + Math.random(),
            type: 'error',
            message: `🔴 ${service.name} service is DOWN!`,
            details: service.error || 'Service is unhealthy',
            timestamp: new Date().toISOString()
          });
        }
        
        // Service went from unhealthy to healthy
        if (prevService.status === 'unhealthy' && service.status === 'healthy') {
          newAlerts.push({
            id: Date.now() + Math.random(),
            type: 'success',
            message: `✅ ${service.name} service is BACK ONLINE!`,
            details: 'Service has recovered',
            timestamp: new Date().toISOString()
          });
        }

        // Latency spike detected
        if (service.latency && prevService.latency) {
          const latencyIncrease = service.latency - prevService.latency;
          if (latencyIncrease > 500) {
            newAlerts.push({
              id: Date.now() + Math.random(),
              type: 'warning',
              message: `⚠️ ${service.name} latency spike!`,
              details: `Increased by ${latencyIncrease}ms (${prevService.latency}ms → ${service.latency}ms)`,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        newAlerts.forEach(alert => {
          new Notification('PingPong Alert', {
            body: alert.message,
            icon: alert.type === 'error' ? '🔴' : '✅'
          });
        });
      }
    }
  }, [serviceStatus, previousStatus]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <FaExclamationCircle className="alert__icon alert__icon--error" />;
      case 'success':
        return <FaCheckCircle className="alert__icon alert__icon--success" />;
      case 'warning':
        return <FaExclamationCircle className="alert__icon alert__icon--warning" />;
      default:
        return <FaInfoCircle className="alert__icon alert__icon--info" />;
    }
  };

  return (
    <div className="alert-container">
      {alerts.length > 0 && (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`alert alert--${alert.type} animate-slide-in`}
            >
              <div className="alert__content">
                {getAlertIcon(alert.type)}
                <div className="alert__body">
                  <div className="alert__message">{alert.message}</div>
                  <div className="alert__details">{alert.details}</div>
                  <div className="alert__timestamp">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button 
                className="alert__close"
                onClick={() => removeAlert(alert.id)}
              >
                ×
              </button>
            </div>
          ))}
          
          {alerts.length > 0 && (
            <button 
              className="alert__clear-all"
              onClick={clearAllAlerts}
            >
              Clear All Alerts
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertSystem;