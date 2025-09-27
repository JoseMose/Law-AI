// Working serverless-http wrapper
const serverless = require('serverless-http');
const express = require('express');

const app = express();

// Add basic middleware
app.use(express.json());

// Simple test routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'law-ai-lambda',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    message: 'Express with serverless-http is working!',
    timestamp: new Date().toISOString()
  });
});

// Catch all for debugging
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.path,
    method: req.method
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

// Export with proper serverless-http configuration
module.exports.handler = serverless(app, {
  binary: false,
  request: function(request, event, context) {
    // Log incoming requests for debugging
    console.log('Request path:', request.path);
    console.log('Request method:', request.method);
  }
});