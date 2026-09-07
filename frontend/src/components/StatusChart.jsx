import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import '../styles/components/Chart.css';

const StatusChart = ({ history }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!history || !history.history) return;

    const data = history.history.map((entry) => {
      const dataPoint = {
        timestamp: new Date(entry.timestamp).toLocaleTimeString(),
      };

      entry.services.forEach((service) => {
        dataPoint[service.name] = service.status === 'healthy' ? 1 : 0;
      });

      return dataPoint;
    });

    setChartData(data);
  }, [history]);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6'];

  if (!chartData.length) {
    return (
      <div className="chart-container">
        <h3 className="chart-container__title">Service Health History</h3>
        <div className="chart-container__empty">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-container__title">Service Health History</h3>
      <div className="chart-container__wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis 
              domain={[0, 1.5]} 
              tickFormatter={(value) => value === 1 ? 'Healthy' : 'Down'}
              ticks={[0, 1]}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'timestamp') return value;
                return value === 1 ? 'Healthy' : 'Down';
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="auth"
              stroke={COLORS[0]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="payment"
              stroke={COLORS[1]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="notification"
              stroke={COLORS[2]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatusChart;