// Lambda handler - Simple modular version without duplicates
const {
  CognitoIdentityProvider,
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  cognitoClient,
  CLIENT_ID,
  CLIENT_SECRET,
  USER_POOL_ID
} = require('./aws-clients');

const {
  createdClients,
  getSecretHash,
  createResponse
} = require('./helpers');

const {
  loadCasesFromS3,
  saveCasesToS3,
  loadClientsFromS3,
  saveClientsToS3
} = require('./s3-operations');

exports.handler = async (event, context) => {
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  
  console.log(`${method} ${path}`);
  
  try {
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return createResponse(200, { success: true, message: 'CORS preflight' });
    }

    // Health check endpoint
    if (path === '/health' || path === '/dev/health' || path.endsWith('/health')) {
      return createResponse(200, {
        status: 'healthy',
        service: 'law-ai-lambda',
        timestamp: new Date().toISOString()
      });
    }

    // Test endpoint
    if (path === '/test' || path === '/dev/test') {
      return createResponse(200, {
        message: 'Test endpoint working',
        path: path,
        method: method
      });
    }

    // Clients GET endpoint
    if ((path === '/clients' || path === '/dev/clients') && method === 'GET') {
      console.log('Get clients endpoint hit');
      const s3Clients = await loadClientsFromS3();
      const allClients = [...s3Clients, ...createdClients];

      return createResponse(200, {
        success: true,
        clients: allClients,
        total: allClients.length
      });
    }

    // Clients POST endpoint
    if ((path === '/clients' || path === '/dev/clients') && method === 'POST') {
      console.log('Create client endpoint hit');

      let body;
      try {
        let bodyStr = event.body || '{}';
        if (event.isBase64Encoded) {
          bodyStr = Buffer.from(event.body, 'base64').toString('utf-8');
        }
        body = JSON.parse(bodyStr);
      } catch (parseError) {
        return createResponse(400, {
          success: false,
          error: 'Invalid JSON in request body'
        });
      }

      const { first_name, last_name, email } = body;
      if (!first_name || !last_name || !email) {
        return createResponse(400, {
          success: false,
          error: 'first_name, last_name, and email are required'
        });
      }

      const clientId = `client-${Date.now()}`;
      const now = new Date().toISOString();

      const newClient = {
        id: clientId,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        email,
        created_at: now,
        updated_at: now,
        linked_cases: [],
        s3_documents: []
      };

      const existingClients = await loadClientsFromS3();
      existingClients.push(newClient);
      await saveClientsToS3(existingClients);
      createdClients.push(newClient);

      return createResponse(201, {
        success: true,
        client: newClient
      });
    }

    // Root endpoint
    if (path === '/' || path === '/dev' || path === '/dev/') {
      return createResponse(200, {
        message: 'Law-AI API',
        timestamp: new Date().toISOString(),
        endpoints: ['/health', '/test', '/clients']
      });
    }

    // 404 for unknown endpoints
    return createResponse(404, {
      error: 'Endpoint not found',
      path: path
    });

  } catch (error) {
    console.error('Lambda error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message
    });
  }
};
