// Direct Lambda handler for Law-AI API
exports.handler = async (event, context) => {
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  
  console.log(`${method} ${path}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
  };
  
  try {
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // Health check endpoint
    if (path === '/health' || path === '/dev/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          service: 'law-ai-lambda',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        })
      };
    }
    
    // Root endpoint
    if (path === '/' || path === '/dev' || path === '/dev/') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Law-AI API is running on AWS Lambda',
          timestamp: new Date().toISOString(),
          endpoints: ['/health', '/auth/*', '/upload', '/cases/*']
        })
      };
    }
    
    // Default response for unhandled routes
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Route not found',
        path: path,
        method: method,
        message: 'This endpoint is not yet implemented in the direct handler'
      })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};