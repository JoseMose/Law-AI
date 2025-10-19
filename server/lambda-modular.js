// Modular Lambda Function for Law AI
// Main routing logic with extracted modules

const authHandlers = require('./auth-handlers');
const s3Handlers = require('./s3-handlers');
const caseHandlers = require('./case-handlers');

// Import helper functions
const { createResponse } = s3Handlers;

// Main Lambda handler
exports.handler = async (event, context) => {
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  
  console.log(`${method} ${path}`);
  
  // Parse request body - will be handled per endpoint as needed
  let requestBody = {};
  let rawBody = event.body || '';

  try {
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return createResponse(200, { success: true, message: 'CORS preflight' });
    }

    // Health check endpoint
    if (path === '/health' || path === '/dev/health') {
      return createResponse(200, {
        status: 'healthy',
        service: 'law-ai-lambda-modular',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        auth: 'Cognito integrated'
      });
    }

    // Test endpoint for debugging
    if (path === '/test' || path === '/dev/test') {
      return createResponse(200, {
        message: 'Test endpoint for frontend debugging',
        success: true,
        data: {
          test: true,
          timestamp: new Date().toISOString(),
          random: Math.random(),
          deployedAt: new Date().toISOString(),
          modular: true
        }
      });
    }

    // Authentication endpoints
    if (path === '/signin' || path === '/dev/signin') {
      if (method !== 'POST') {
        return createResponse(405, { error: 'Method not allowed. Use POST for sign in.' });
      }
      
      try {
        let bodyStr = rawBody;
        if (event.isBase64Encoded) {
          bodyStr = Buffer.from(rawBody, 'base64').toString('utf-8');
        }
        requestBody = JSON.parse(bodyStr);
        
        const result = await authHandlers.handleSignIn(requestBody.username, requestBody.password);
        return createResponse(200, result);
      } catch (error) {
        console.error('SignIn error:', error);
        return createResponse(400, { 
          success: false, 
          error: error.message 
        });
      }
    }

    if (path === '/signup' || path === '/dev/signup') {
      if (method !== 'POST') {
        return createResponse(405, { error: 'Method not allowed. Use POST for sign up.' });
      }
      
      try {
        let bodyStr = rawBody;
        if (event.isBase64Encoded) {
          bodyStr = Buffer.from(rawBody, 'base64').toString('utf-8');
        }
        requestBody = JSON.parse(bodyStr);
        
        const result = await authHandlers.handleSignUp(requestBody.username, requestBody.password, requestBody.email);
        return createResponse(200, result);
      } catch (error) {
        console.error('SignUp error:', error);
        return createResponse(400, { 
          success: false, 
          error: error.message 
        });
      }
    }

    // Case folder listing endpoint
    const folderListMatch = path.match(/^\/(?:dev\/)?case-folders\/([^\/]+)\/?$/);
    if (folderListMatch) {
      const caseId = folderListMatch[1];
      
      try {
        const result = await s3Handlers.getCaseFolders(caseId);
        return createResponse(200, result);
      } catch (error) {
        console.error('Error getting case folders:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to retrieve case folders',
          details: error.message
        });
      }
    }

    // Cases collection endpoint
    if (path === '/cases' || path === '/dev/cases') {
      if (method === 'GET') {
        try {
          const result = await caseHandlers.getAllCases();
          return createResponse(200, result);
        } catch (error) {
          console.error('Error getting all cases:', error);
          return createResponse(500, {
            success: false,
            error: 'Failed to retrieve cases',
            details: error.message
          });
        }
      }
      
      return createResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['GET']
      });
    }

    // Case documents collection operations (POST /cases/1/documents)
    if (path.match(/^\/(?:dev\/)?cases\/\d+\/documents\/?$/)) {
      const pathParts = path.split('/');
      const caseId = pathParts[pathParts.indexOf('cases') + 1];
      
      try {
        if (rawBody) {
          let bodyStr = rawBody;
          if (event.isBase64Encoded) {
            bodyStr = Buffer.from(rawBody, 'base64').toString('utf-8');
          }
          requestBody = JSON.parse(bodyStr);
        }
        
        const result = await caseHandlers.handleCaseDocuments(caseId, method, requestBody);
        return createResponse(method === 'POST' ? 201 : 200, result);
      } catch (error) {
        console.error('Error handling case documents:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to handle case documents operation',
          details: error.message
        });
      }
    }

    // Case document operations (DELETE /cases/1/documents/file.pdf)
    if (path.match(/\/(?:dev\/)?cases\/\d+\/documents\//)) {
      const pathParts = path.split('/');
      const caseId = pathParts[pathParts.indexOf('cases') + 1];
      const documentName = pathParts[pathParts.length - 1];
      
      try {
        const result = await caseHandlers.handleCaseDocument(caseId, documentName, method);
        return createResponse(200, result);
      } catch (error) {
        console.error('Error handling case document:', error);
        return createResponse(error.message.includes('not found') ? 404 : 500, {
          success: false,
          error: 'Failed to handle case document operation',
          details: error.message
        });
      }
    }

    // Individual case operations
    if (path.match(/\/(?:dev\/)?cases\/\d+$/)) {
      const caseId = path.split('/').pop();
      
      try {
        if (rawBody && (method === 'PUT' || method === 'POST')) {
          let bodyStr = rawBody;
          if (event.isBase64Encoded) {
            bodyStr = Buffer.from(rawBody, 'base64').toString('utf-8');
          }
          requestBody = JSON.parse(bodyStr);
        }
        
        const result = await caseHandlers.handleCase(caseId, method, requestBody);
        return createResponse(200, result);
      } catch (error) {
        console.error('Error handling case operation:', error);
        return createResponse(error.message.includes('not found') ? 404 : 500, {
          success: false,
          error: 'Failed to handle case operation',
          details: error.message
        });
      }
    }

    // Folder Creation endpoint
    if (path === '/folders/create' || path === '/dev/folders/create') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST to create folders.'
        });
      }

      try {
        let bodyStr = rawBody;
        if (event.isBase64Encoded) {
          bodyStr = Buffer.from(rawBody, 'base64').toString('utf-8');
        }
        requestBody = JSON.parse(bodyStr);
        
        const { caseId, folderName, parentPath } = requestBody;
        
        if (!caseId || !folderName) {
          return createResponse(400, { 
            success: false, 
            error: 'caseId and folderName are required' 
          });
        }

        const result = await caseHandlers.createFolderInCase(caseId, folderName, parentPath);
        return createResponse(201, result);
      } catch (error) {
        console.error('Error creating folder:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to create folder',
          details: error.message
        });
      }
    }

    // S3 Presigned GET URL endpoint (for file preview)
    if (path === '/s3/presign-get' || path === '/dev/s3/presign-get') {
      if (method !== 'GET') {
        return createResponse(405, {
          error: 'Method not allowed. Use GET for presigned URL generation.'
        });
      }
      
      const key = event.queryStringParameters?.key;
      if (!key) {
        return createResponse(400, {
          error: 'key parameter is required for presigned URL generation'
        });
      }
      
      try {
        const result = await s3Handlers.generatePresignedUrl(key);
        return createResponse(200, result);
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        return createResponse(400, {
          success: false,
          error: error.message
        });
      }
    }

    // Clients endpoint
    if (path === '/clients' || path === '/dev/clients') {
      if (method === 'GET') {
        try {
          const clients = await s3Handlers.loadClientsFromS3();
          return createResponse(200, {
            success: true,
            clients: clients,
            count: clients.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error getting clients:', error);
          return createResponse(500, {
            success: false,
            error: 'Failed to retrieve clients',
            details: error.message
          });
        }
      }
      
      return createResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['GET']
      });
    }

    // Default fallback for unmatched routes
    return createResponse(404, {
      error: 'Endpoint not found',
      path: path,
      method: method,
      message: 'The requested endpoint does not exist',
      availableEndpoints: [
        'GET /health',
        'GET /test', 
        'POST /signin',
        'POST /signup',
        'GET /cases',
        'GET /case-folders/{caseId}',
        'GET /clients',
        'GET /s3/presign-get?key={key}',
        'POST /folders/create'
      ]
    });

  } catch (error) {
    console.error('Lambda handler error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};