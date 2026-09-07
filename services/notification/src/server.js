const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Simulate notification queue
let notificationQueue = [];
let processedCount = 0;
let emailProviderStatus = 'operational';
let smsProviderStatus = 'operational';

// Health check with notification-specific metrics
app.get('/health', (req, res) => {
  // Add random latency 0-150ms (notification services are often slower)
  const latency = Math.floor(Math.random() * 150);
  
  setTimeout(() => {
    const healthData = {
      service: 'notification',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      queue_length: notificationQueue.length,
      messages_processed: processedCount,
      providers: {
        email: emailProviderStatus,
        sms: smsProviderStatus
      },
      latency_ms: latency
    };
    
    res.status(200).json(healthData);
  }, latency);
});

// Send notification endpoint
app.post('/api/notify', (req, res) => {
  const { type, recipient, message, priority } = req.body;
  
  if (!type || !recipient || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['type', 'recipient', 'message']
    });
  }

  // Add to queue
  const notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    recipient,
    message,
    priority: priority || 'normal',
    timestamp: new Date().toISOString(),
    status: 'queued'
  };

  notificationQueue.push(notification);

  // Simulate processing (remove from queue after delay)
  setTimeout(() => {
    const index = notificationQueue.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      const processed = notificationQueue.splice(index, 1)[0];
      processed.status = 'sent';
      processed.processed_at = new Date().toISOString();
      processedCount++;
      
      // Log to console (would be in real logging system)
      console.log(`📧 ${processed.type} notification sent to ${processed.recipient}`);
    }
  }, Math.random() * 1000 + 500); // 500-1500ms processing time

  res.status(202).json({
    success: true,
    notificationId: notification.id,
    status: 'queued',
    estimated_processing_time: '500-1500ms',
    queue_position: notificationQueue.length
  });
});

// Get queue status
app.get('/api/queue/status', (req, res) => {
  res.json({
    queue_length: notificationQueue.length,
    processed_count: processedCount,
    queue: notificationQueue.slice(0, 5) // Show first 5
  });
});

// Admin - Toggle provider status
app.post('/api/admin/toggle-provider/:provider', (req, res) => {
  const { provider } = req.params;
  
  if (provider === 'email') {
    emailProviderStatus = emailProviderStatus === 'operational' ? 'degraded' : 'operational';
  } else if (provider === 'sms') {
    smsProviderStatus = smsProviderStatus === 'operational' ? 'degraded' : 'operational';
  } else {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  res.json({
    message: `Provider ${provider} status toggled`,
    status: provider === 'email' ? emailProviderStatus : smsProviderStatus
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Notification Service is running',
    endpoints: {
      health: '/health',
      notify: 'POST /api/notify',
      queue_status: 'GET /api/queue/status',
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
  console.log(`📨 Notification Service running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📬 Queue status: http://localhost:${PORT}/api/queue/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Notification server closed');
    process.exit(0);
  });
});

module.exports = app;