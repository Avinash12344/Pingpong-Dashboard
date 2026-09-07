import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { fetchServiceStatus, fetchServiceHistory, triggerHealthCheck } from './api/services';
import ServiceCard from './components/ServiceCard';
import StatusChart from './components/StatusChart';
import LatencyChart from './components/LatencyChart';
import StatsBar from './components/StatsBar';
import ControlPanel from './components/ControlPanel';
import '../src/styles/globals.css';

function App() {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery('serviceStatus', fetchServiceStatus, {
    refetchInterval: isAutoRefresh ? 5000 : false,
    refetchOnWindowFocus: true,
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery('serviceHistory', () => fetchServiceHistory(30), {
    refetchInterval: isAutoRefresh ? 10000 : false,
  });

  const handleRefresh = async () => {
    await triggerHealthCheck();
    await refetchStatus();
    await refetchHistory();
  };

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  if (statusLoading && !statusData) {
    return (
      <div className="loading-container">
        <div className="loading-container__content">
          <div className="loading-container__spinner"></div>
          <h2 className="loading-container__title">Loading Dashboard...</h2>
          <p className="loading-container__subtitle">Fetching service status</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="error-container">
        <div className="error-container__card">
          <h2 className="error-container__title">Connection Error</h2>
          <p className="error-container__message">Failed to connect to Aggregator API</p>
          <p className="error-container__hint">
            Make sure the Aggregator is running on port 3000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-8)', paddingBottom: 'var(--spacing-8)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        <ControlPanel
          onRefresh={handleRefresh}
          isAutoRefresh={isAutoRefresh}
          onToggleAutoRefresh={toggleAutoRefresh}
        />

        <StatsBar status={statusData} />

        {statusData?.services && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--spacing-6)',
          }}>
            {Object.values(statusData.services).map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--spacing-6)',
        }}>
          <StatusChart history={historyData} />
          <LatencyChart history={historyData} />
        </div>

        {isAutoRefresh && (
          <div className="text-center animate-pulse" style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 'var(--font-size-sm)',
          }}>
            Auto-refreshing every 5 seconds...
          </div>
        )}
      </div>
    </div>
  );
}

export default App;