const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SERVICES = [
  {
    name: 'auth',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    healthEndpoint: '/health'
  },
  {
    name: 'payment',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
    healthEndpoint: '/health'
  },
  {
    name: 'notification',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
    healthEndpoint: '/health'
  }
];

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 5; // seconds
const STATUS_HISTORY_LIMIT = process.env.STATUS_HISTORY_LIMIT || 60;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// In-memory storage for service status
let serviceStatus = {};
let statusHistory = [];
let lastCheckTimestamp = null;
let isChecking = false;

// Initialize service status
SERVICES.forEach(service => {
  serviceStatus[service.name] = {
    name: service.name,
    status: 'unknown',
    latency: null,
    lastCheck: null,
    uptime: 0,
    checks: 0,
    failures: 0,
    error: null,
    details: null
  };
});

// Function to check a single service
async function checkService(service) {
  const startTime = Date.now();
  try {
    const response = await axios.get(`${service.url}${service.healthEndpoint}`, {
      timeout: 3000 // 3 second timeout
    });
    
    const latency = Date.now() - startTime;
    
    return {
      name: service.name,
      status: 'healthy',
      latency: latency,
      timestamp: new Date().toISOString(),
      details: response.data,
      error: null
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    let status = 'unhealthy';
    let errorMessage = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Service is not running';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Service timed out';
    } else if (error.response) {
      status = 'unhealthy';
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
    
    return {
      name: service.name,
      status: status,
      latency: latency,
      timestamp: new Date().toISOString(),
      details: null,
      error: errorMessage
    };
  }
}

// Function to check all services
async function checkAllServices() {
  if (isChecking) {
    console.log('⚠️ Health check already in progress, skipping...');
    return;
  }

  isChecking = true;
  console.log(`🔍 Starting health check at ${new Date().toISOString()}`);

  try {
    const results = await Promise.all(
      SERVICES.map(service => checkService(service))
    );

    // Update service status
    results.forEach(result => {
      const current = serviceStatus[result.name];
      
      // Update status
      current.status = result.status;
      current.latency = result.latency;
      current.lastCheck = result.timestamp;
      current.error = result.error;
      current.details = result.details;
      current.checks += 1;
      
      if (result.status === 'unhealthy') {
        current.failures += 1;
      } else {
        // Calculate uptime percentage
        const totalChecks = current.checks;
        const healthyChecks = totalChecks - current.failures;
        current.uptime = (healthyChecks / totalChecks) * 100;
      }
    });

    // Store in history
    const historyEntry = {
      timestamp: new Date().toISOString(),
      services: results.map(r => ({
        name: r.name,
        status: r.status,
        latency: r.latency,
        error: r.error
      }))
    };

    statusHistory.push(historyEntry);
    
    // Limit history size
    if (statusHistory.length > STATUS_HISTORY_LIMIT) {
      statusHistory = statusHistory.slice(-STATUS_HISTORY_LIMIT);
    }

    lastCheckTimestamp = new Date().toISOString();

    // Log results
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    console.log(`✅ Health check complete: ${healthyCount}/${SERVICES.length} services healthy`);
    console.log(`📊 History size: ${statusHistory.length} entries`);

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  } finally {
    isChecking = false;
  }
}

// Schedule health checks
cron.schedule(`*/${CHECK_INTERVAL} * * * * *`, () => {
  checkAllServices();
});

// Run initial health check on startup
console.log('🚀 Running initial health check...');
setTimeout(checkAllServices, 1000);

// API Routes

// Get current status of all services
app.get('/api/status', (req, res) => {
  const statusSummary = {
    timestamp: new Date().toISOString(),
    lastCheck: lastCheckTimestamp,
    services: Object.values(serviceStatus),
    summary: {
      total: SERVICES.length,
      healthy: Object.values(serviceStatus).filter(s => s.status === 'healthy').length,
      unhealthy: Object.values(serviceStatus).filter(s => s.status === 'unhealthy').length,
      unknown: Object.values(serviceStatus).filter(s => s.status === 'unknown').length
    }
  };

  res.json(statusSummary);
});

// Get status history
app.get('/api/status/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const history = statusHistory.slice(-Math.min(limit, STATUS_HISTORY_LIMIT));
  
  res.json({
    total: statusHistory.length,
    limit: Math.min(limit, STATUS_HISTORY_LIMIT),
    history: history
  });
});

// Get specific service status
app.get('/api/status/:serviceName', (req, res) => {
  const { serviceName } = req.params;
  const status = serviceStatus[serviceName];
  
  if (!status) {
    return res.status(404).json({
      error: 'Service not found',
      available: Object.keys(serviceStatus)
    });
  }

  res.json(status);
});

// Trigger manual health check
app.post('/api/check', async (req, res) => {
  res.json({
    message: 'Health check triggered',
    timestamp: new Date().toISOString()
  });
  
  // Run check asynchronously
  await checkAllServices();
});

// Get system metrics
app.get('/api/metrics', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  const metrics = {
    service: 'aggregator',
    uptime: Math.floor(uptime),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB'
    },
    monitoring: {
      interval: CHECK_INTERVAL + 's',
      totalChecks: Object.values(serviceStatus).reduce((sum, s) => sum + s.checks, 0),
      historySize: statusHistory.length,
      lastCheck: lastCheckTimestamp
    }
  };

  res.json(metrics);
});

// Health check for the aggregator itself
app.get('/health', (req, res) => {
  const healthyServices = Object.values(serviceStatus).filter(s => s.status === 'healthy').length;
  const totalServices = SERVICES.length;
  const allHealthy = healthyServices === totalServices;
  
  res.json({
    service: 'aggregator',
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    monitored_services: {
      total: totalServices,
      healthy: healthyServices,
      unhealthy: totalServices - healthyServices
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'PingPong Dashboard Aggregator',
    version: '1.0.0',
    description: 'Real-time microservices monitoring',
    endpoints: {
      status: 'GET /api/status',
      history: 'GET /api/status/history',
      service: 'GET /api/status/:serviceName',
      check: 'POST /api/check',
      metrics: 'GET /api/metrics',
      health: 'GET /health'
    },
    documentation: 'https://github.com/Avinash12344/Pingpong-Dashboard'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    available_endpoints: ['/api/status', '/api/status/history', '/api/status/:name', '/api/check', '/api/metrics', '/health']
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
  console.log(`📡 Aggregator API running on http://localhost:${PORT}`);
  console.log(`📊 Service status: http://localhost:${PORT}/api/status`);
  console.log(`📈 Metrics: http://localhost:${PORT}/api/metrics`);
  console.log(`🔄 Health check interval: ${CHECK_INTERVAL} seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Aggregator server closed');
    process.exit(0);
  });
});

module.exports = app;