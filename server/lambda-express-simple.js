const serverless = require('serverless-http');

// Create a minimal Express app with auth routes for testing
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost')) return callback(null, true);
    if (origin.includes('amplifyapp.com')) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'law-ai-lambda',
    timestamp: new Date().toISOString()
  });
});

// Basic auth endpoints for testing
app.post('/auth/signin', (req, res) => {
  res.status(501).json({ 
    error: 'Authentication not yet implemented in Lambda',
    message: 'This endpoint will be implemented with full Cognito integration',
    received: req.body
  });
});

app.post('/auth/signup', (req, res) => {
  res.status(501).json({ 
    error: 'Authentication not yet implemented in Lambda',
    message: 'This endpoint will be implemented with full Cognito integration',
    received: req.body
  });
});

// Catch all auth routes
app.use('/auth/*', (req, res) => {
  res.status(501).json({ 
    error: 'Authentication endpoint not yet implemented',
    path: req.path,
    method: req.method,
    message: 'Auth endpoints are being migrated to Lambda'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Law-AI API is running on AWS Lambda',
    timestamp: new Date().toISOString(),
    status: 'Partial implementation - auth endpoints coming soon'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.path,
    method: req.method,
    availableRoutes: ['/health', '/auth/signin', '/auth/signup']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

module.exports.handler = serverless(app);