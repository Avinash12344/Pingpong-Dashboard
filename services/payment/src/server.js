const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Simulate database connection (for realism)
let dbConnected = true;
let transactionCount = 0;

// Health check with artificial latency (for Chaos Monkey)
app.get('/health', (req, res) => {
  // Add random latency 0-100ms to simulate real service
  const latency = Math.floor(Math.random() * 100);
  
  setTimeout(() => {
    const healthData = {
      service: 'payment',
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'connected' : 'disconnected',
      latency_ms: latency,
      transactions_processed: transactionCount
    };
    
    res.status(200).json(healthData);
  }, latency);
});

// Payment processing endpoint (simulated)
app.post('/api/process-payment', (req, res) => {
  const { amount, currency, method } = req.body;
  
  if (!amount || !currency) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['amount', 'currency']
    });
  }

  // Simulate payment processing
  const success = Math.random() > 0.1; // 90% success rate
  
  if (!success) {
    return res.status(500).json({
      error: 'Payment processing failed',
      message: 'Insufficient funds or network error'
    });
  }

  transactionCount++;
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  res.json({
    success: true,
    transactionId,
    amount,
    currency,
    timestamp: new Date().toISOString(),
    processing_time: Math.floor(Math.random() * 100) + 'ms'
  });
});

// Simulate database disconnection (for Chaos Monkey)
app.post('/api/admin/db-disconnect', (req, res) => {
  dbConnected = false;
  res.json({ message: 'Database disconnected for testing' });
});

// Reconnect database
app.post('/api/admin/db-reconnect', (req, res) => {
  dbConnected = true;
  res.json({ message: 'Database reconnected' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Payment Service is running',
    endpoints: {
      health: '/health',
      processPayment: 'POST /api/process-payment',
      admin: '/api/admin/*'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`💰 Payment Service running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/process-payment`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Payment server closed');
    process.exit(0);
  });
});

module.exports = app;