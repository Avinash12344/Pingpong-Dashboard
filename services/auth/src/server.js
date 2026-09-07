const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
dotenv.config();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json());

//Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    service: 'auth',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(healthData);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service is running',
    endpoints: {
      health: '/health',
      version: '/version'
    }
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.json({
    service: 'auth',
    version: process.env.npm_package_version || '1.0.0',
    node: process.version
  });
});

//404 handler
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

//Start the server
const server = app.listen(PORT, () => {
    console.log(`Auth service is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Version info available at http://localhost:${PORT}/version`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
})

//Gracefull shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;