const serverless = require('serverless-http');
const app = require('./index'); // Import your existing Express app

// Export the handler for AWS Lambda
module.exports.handler = serverless(app);