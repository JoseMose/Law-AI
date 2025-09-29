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
    
    // Authentication endpoints
    if (path.includes('/auth/')) {
      // Parse request body for POST requests
      let requestBody = {};
      if (event.body) {
        try {
          requestBody = JSON.parse(event.body);
        } catch (e) {
          requestBody = {};
        }
      }
      
      if (path === '/auth/signin' || path === '/dev/auth/signin') {
        return {
          statusCode: 501,
          headers,
          body: JSON.stringify({
            error: 'Authentication not yet fully implemented',
            message: 'Cognito authentication is being integrated',
            received: requestBody,
            hint: 'This endpoint will connect to AWS Cognito for user authentication'
          })
        };
      }
      
      if (path === '/auth/signup' || path === '/dev/auth/signup') {
        return {
          statusCode: 501,
          headers,
          body: JSON.stringify({
            error: 'Registration not yet fully implemented',
            message: 'Cognito registration is being integrated',
            received: requestBody,
            hint: 'This endpoint will connect to AWS Cognito for user registration'
          })
        };
      }
      
      // Other auth endpoints
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({
          error: 'Authentication endpoint not yet implemented',
          path: path,
          method: method,
          message: 'Auth system is being migrated to serverless architecture'
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
          status: 'Partial Implementation',
          available_endpoints: ['/health', '/auth/signin', '/auth/signup'],
          note: 'Authentication endpoints return 501 (Not Implemented) while being developed'
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