import React, { useState } from 'react';
import { 
  FaSkull, 
  FaHeartbeat, 
  FaTachometerAlt, 
  FaDatabase,
  FaUndo,
  FaExclamationTriangle
} from 'react-icons/fa';
import { api } from '../api/config';
import '../styles/components/ChaosPanel.css';

const ChaosPanel = ({ onChaosAction }) => {
  const [loading, setLoading] = useState(false);
  const [latencyValue, setLatencyValue] = useState(1000);
  const [selectedService, setSelectedService] = useState('auth');

  const services = ['auth', 'payment', 'notification'];

  const handleChaosAction = async (action, serviceName = null, data = null) => {
    setLoading(true);
    try {
      let endpoint = '';
      let method = 'post';
      
      if (action === 'kill') {
        endpoint = `/api/chaos/kill/${serviceName}`;
      } else if (action === 'restore') {
        endpoint = `/api/chaos/restore/${serviceName}`;
      } else if (action === 'latency') {
        endpoint = `/api/chaos/latency/${serviceName}`;
        data = { latencyMs: latencyValue };
      } else if (action === 'remove-latency') {
        endpoint = `/api/chaos/remove-latency/${serviceName}`;
      } else if (action === 'toggle-db') {
        endpoint = `/api/chaos/toggle-db/${serviceName}`;
      } else if (action === 'kill-all') {
        endpoint = `/api/chaos/kill-all`;
      } else if (action === 'restore-all') {
        endpoint = `/api/chaos/restore-all`;
      }

      const response = await api.post(endpoint, data);
      
      // Refresh status after chaos action
      if (onChaosAction) {
        onChaosAction();
      }
      
      alert(`✅ Chaos Action Successful!\n${response.data.message}`);
    } catch (error) {
      alert(`❌ Chaos Action Failed!\n${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chaos-panel">
      <div className="chaos-panel__header">
        <FaSkull className="chaos-panel__icon" />
        <h2 className="chaos-panel__title">Chaos Monkey Control</h2>
        <span className="chaos-panel__badge">⚠️ Use with caution!</span>
      </div>

      <div className="chaos-panel__controls">
        {/* Service Selector */}
        <div className="chaos-panel__group">
          <label className="chaos-panel__label">Select Service:</label>
          <select 
            className="chaos-panel__select"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={loading}
          >
            {services.map(service => (
              <option key={service} value={service}>
                {service.charAt(0).toUpperCase() + service.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Latency Control */}
        <div className="chaos-panel__group">
          <label className="chaos-panel__label">
            Latency: {latencyValue}ms
          </label>
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            value={latencyValue}
            onChange={(e) => setLatencyValue(parseInt(e.target.value))}
            className="chaos-panel__slider"
            disabled={loading}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="chaos-panel__actions">
        <button
          className="chaos-panel__btn chaos-panel__btn--kill"
          onClick={() => handleChaosAction('kill', selectedService)}
          disabled={loading}
        >
          <FaSkull /> Kill Service
        </button>

        <button
          className="chaos-panel__btn chaos-panel__btn--restore"
          onClick={() => handleChaosAction('restore', selectedService)}
          disabled={loading}
        >
          <FaHeartbeat /> Restore Service
        </button>

        <button
          className="chaos-panel__btn chaos-panel__btn--latency"
          onClick={() => handleChaosAction('latency', selectedService)}
          disabled={loading}
        >
          <FaTachometerAlt /> Add Latency
        </button>

        <button
          className="chaos-panel__btn chaos-panel__btn--remove"
          onClick={() => handleChaosAction('remove-latency', selectedService)}
          disabled={loading}
        >
          <FaUndo /> Remove Latency
        </button>

        {selectedService === 'payment' && (
          <button
            className="chaos-panel__btn chaos-panel__btn--db"
            onClick={() => handleChaosAction('toggle-db', selectedService)}
            disabled={loading}
          >
            <FaDatabase /> Toggle DB
          </button>
        )}

        <button
          className="chaos-panel__btn chaos-panel__btn--kill-all"
          onClick={() => {
            if (window.confirm('⚠️ Kill ALL services? This will break everything!')) {
              handleChaosAction('kill-all');
            }
          }}
          disabled={loading}
        >
          <FaExclamationTriangle /> Kill All!
        </button>

        <button
          className="chaos-panel__btn chaos-panel__btn--restore-all"
          onClick={() => {
            if (window.confirm('Restore ALL services?')) {
              handleChaosAction('restore-all');
            }
          }}
          disabled={loading}
        >
          <FaHeartbeat /> Restore All
        </button>
      </div>

      {loading && (
        <div className="chaos-panel__loading">
          <div className="chaos-panel__spinner"></div>
          <span>Executing Chaos...</span>
        </div>
      )}
    </div>
  );
};

export default ChaosPanel;