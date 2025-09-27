const serverless = require('serverless-http');

// Minimal Express app for testing
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.json({ message: 'Lambda is working!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'law-ai-lambda' });
});

// Catch all other routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

module.exports.handler = serverless(app);