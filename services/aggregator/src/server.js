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
  
  // Check if service is killed
  if (chaosConfig.killedServices[service.name]) {
    return {
      name: service.name,
      status: 'unhealthy',
      latency: null,
      timestamp: new Date().toISOString(),
      details: null,
      error: 'Service killed by Chaos Monkey'
    };
  }

  try {
    // Apply latency if configured
    const latencyMs = chaosConfig.latencyConfig[service.name] || 0;
    if (latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
    }

    const response = await axios.get(`${service.url}${service.healthEndpoint}`, {
      timeout: 3000 + (latencyMs || 0) // Extend timeout if latency is added
    });
    
    const latency = Date.now() - startTime;
    
    // Check if database is disconnected (for payment service)
    if (service.name === 'payment' && chaosConfig.dbStatus.payment === 'disconnected') {
      return {
        name: service.name,
        status: 'unhealthy',
        latency: latency,
        timestamp: new Date().toISOString(),
        details: response.data,
        error: 'Database disconnected (Chaos Monkey)'
      };
    }
    
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
      errorMessage = 'Service timed out (Chaos Monkey latency?)';
    } else if (error.response) {
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

// ============================================
// CHAOS MONKEY ENDPOINTS
// ============================================

// Store service configurations for Chaos Monkey
let chaosConfig = {
  killedServices: {},
  latencyConfig: {},
  dbStatus: {}
};

// 1. KILL a service (simulate crash)
app.post('/api/chaos/kill/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  
  // Find the service
  const service = SERVICES.find(s => s.name === serviceName);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Mark as killed
  chaosConfig.killedServices[serviceName] = true;
  
  console.log(`🔪 Chaos Monkey killed ${serviceName} service!`);
  
  // Immediately update status to show as unhealthy
  if (serviceStatus[serviceName]) {
    serviceStatus[serviceName].status = 'unhealthy';
    serviceStatus[serviceName].error = 'Service killed by Chaos Monkey';
  }

  res.json({
    success: true,
    message: `💀 ${serviceName} service has been killed by Chaos Monkey!`,
    service: serviceName,
    timestamp: new Date().toISOString()
  });
});

// 2. RESTORE a killed service
app.post('/api/chaos/restore/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  
  if (chaosConfig.killedServices[serviceName]) {
    delete chaosConfig.killedServices[serviceName];
    console.log(`🔄 Restored ${serviceName} service`);
    
    // Trigger immediate health check to update status
    setTimeout(checkAllServices, 1000);
    
    res.json({
      success: true,
      message: `✅ ${serviceName} service has been restored!`,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({ error: 'Service is not currently killed' });
  }
});

// 3. INJECT LATENCY into a service
app.post('/api/chaos/latency/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  const { latencyMs } = req.body;
  
  if (!latencyMs || latencyMs < 0 || latencyMs > 5000) {
    return res.status(400).json({ 
      error: 'Please provide latencyMs (0-5000ms)' 
    });
  }

  // Find the service
  const service = SERVICES.find(s => s.name === serviceName);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Store latency configuration
  chaosConfig.latencyConfig[serviceName] = latencyMs;
  
  console.log(`🐌 Chaos Monkey added ${latencyMs}ms latency to ${serviceName} service!`);

  res.json({
    success: true,
    message: `🐌 Added ${latencyMs}ms latency to ${serviceName}!`,
    service: serviceName,
    latencyMs: latencyMs,
    timestamp: new Date().toISOString()
  });
});

// 4. REMOVE latency
app.post('/api/chaos/remove-latency/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  
  if (chaosConfig.latencyConfig[serviceName]) {
    delete chaosConfig.latencyConfig[serviceName];
    console.log(`✅ Removed latency from ${serviceName} service`);
    
    res.json({
      success: true,
      message: `✅ Removed latency from ${serviceName}!`,
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(400).json({ error: 'No latency configuration found for this service' });
  }
});

// 5. TOGGLE database connection (Payment service)
app.post('/api/chaos/toggle-db/:serviceName', async (req, res) => {
  const { serviceName } = req.params;
  
  // Only payment service has this feature
  if (serviceName !== 'payment') {
    return res.status(400).json({ 
      error: 'Only payment service has database toggle feature' 
    });
  }

  // Toggle DB status
  const currentStatus = chaosConfig.dbStatus[serviceName] || 'connected';
  const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
  chaosConfig.dbStatus[serviceName] = newStatus;

  console.log(`🗄️ ${serviceName} database ${newStatus}`);

  res.json({
    success: true,
    message: `🗄️ ${serviceName} database ${newStatus === 'connected' ? 'reconnected' : 'disconnected'}!`,
    service: serviceName,
    dbStatus: newStatus,
    timestamp: new Date().toISOString()
  });
});

// 6. Get current Chaos configuration
app.get('/api/chaos/config', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    chaosConfig: chaosConfig,
    serviceStatus: Object.values(serviceStatus).map(s => ({
      name: s.name,
      status: s.status,
      latency: s.latency,
      error: s.error
    }))
  });
});

// 7. KILL ALL services (full chaos)
app.post('/api/chaos/kill-all', async (req, res) => {
  console.log('☠️ Chaos Monkey killing ALL services!');
  
  SERVICES.forEach(service => {
    chaosConfig.killedServices[service.name] = true;
    if (serviceStatus[service.name]) {
      serviceStatus[service.name].status = 'unhealthy';
      serviceStatus[service.name].error = 'Service killed by Chaos Monkey';
    }
  });

  res.json({
    success: true,
    message: '☠️ ALL services have been killed by Chaos Monkey!',
    timestamp: new Date().toISOString()
  });
});

// 8. RESTORE ALL services
app.post('/api/chaos/restore-all', async (req, res) => {
  chaosConfig.killedServices = {};
  chaosConfig.latencyConfig = {};
  chaosConfig.dbStatus = {};
  
  console.log('✅ Chaos Monkey restored ALL services!');
  
  // Trigger immediate health check
  setTimeout(checkAllServices, 1000);

  res.json({
    success: true,
    message: '✅ ALL services have been restored!',
    timestamp: new Date().toISOString()
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