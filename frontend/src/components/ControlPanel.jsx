import React, { useState } from 'react';
import { FaSync, FaPlay, FaPause } from 'react-icons/fa';
import '../styles/components/ControlPanel.css';

const ControlPanel = ({ onRefresh, isAutoRefresh, onToggleAutoRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="control-panel">
      <div className="control-panel__left">
        <h1 className="control-panel__title">PingPong Dashboard</h1>
        <span className="control-panel__badge">v1.0.0</span>
      </div>

      <div className="control-panel__right">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="control-panel__btn control-panel__btn--refresh"
        >
          <FaSync className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>

        <button
          onClick={onToggleAutoRefresh}
          className={`control-panel__btn control-panel__btn--auto ${isAutoRefresh ? 'active' : ''}`}
        >
          {isAutoRefresh ? <FaPause /> : <FaPlay />}
          <span>{isAutoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}</span>
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;