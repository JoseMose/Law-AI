// Lambda handler for client management endpoints
// Import extracted modules
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');

const {
  createdClients,
  createResponse
} = require('./helpers');

const {
  loadClientsFromS3,
  saveClientsToS3
} = require('./s3-operations');

// In-memory client storage (persists during Lambda execution)
let clients = [];

exports.handler = async (event, context) => {
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';

  console.log(`${method} ${path}`);

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '-1',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}-${Math.random().toString(36)}"`,
    'Vary': 'Accept-Encoding'
  };

  // Parse request body - will be handled per endpoint as needed
  let requestBody = {};
  let rawBody = event.body || '';

  try {
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true, message: 'CORS preflight' })
      };
    }

    // ==========================================
    // CLIENTS API ENDPOINTS
    // ==========================================

    // Handle /clients endpoint (GET and POST)
    if (path === '/clients' || path === '/dev/clients') {
      if (method === 'GET') {
        console.log('Get clients endpoint hit');

        try {
          // Load clients from S3 and combine with any created clients
          const s3Clients = await loadClientsFromS3();
          const allClients = [...s3Clients, ...createdClients];

          return createResponse(200, {
            success: true,
            clients: allClients,
            total: allClients.length
          });
        } catch (error) {
          console.error('Error fetching clients:', error);
          return createResponse(500, {
            success: false,
            error: 'Failed to fetch clients',
            details: error.message
          });
        }
      } else if (method === 'POST') {
        console.log('Create client endpoint hit');

        let body;
        try {
          let bodyStr = event.body || '{}';
          if (event.isBase64Encoded) {
            bodyStr = Buffer.from(event.body, 'base64').toString('utf-8');
          }
          body = JSON.parse(bodyStr);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          return createResponse(400, {
            success: false,
            error: 'Invalid JSON in request body',
            details: parseError.message
          });
        }

        const { first_name, last_name, email, phone, address, date_of_birth, company_name, notes } = body;

        if (!first_name || !last_name || !email) {
          return createResponse(400, {
            success: false,
            error: 'first_name, last_name, and email are required'
          });
        }

        try {
          // Generate client data
          const clientId = `client-${Date.now()}`;
          const now = new Date().toISOString();
          const fullName = `${first_name} ${last_name}`;

          const newClient = {
            id: clientId,
            first_name,
            last_name,
            full_name: fullName,
            email,
            phone: phone || null,
            address: address || null,
            date_of_birth: date_of_birth || null,
            company_name: company_name || null,
            notes: notes || null,
            created_at: now,
            updated_at: now,
            created_by: { name: 'System', email: 'system@law-ai.com' },
            linked_cases: [],
            s3_documents: []
          };

          // Load existing clients from S3, add new client, and save back
          const existingClients = await loadClientsFromS3();
          existingClients.push(newClient);
          await saveClientsToS3(existingClients);

          // Also keep in memory for this execution
          createdClients.push(newClient);

          return createResponse(201, {
            success: true,
            client: newClient,
            message: 'Client created successfully'
          });
        } catch (error) {
          console.error('Error creating client:', error);
          return createResponse(500, {
            success: false,
            error: 'Failed to create client',
            details: error.message
          });
        }
      } else {
        return createResponse(405, { error: 'Method not allowed. Use GET to retrieve clients or POST to create a client.' });
      }
    }

    // Get single client
    if (path.match(/^\/clients\/[^\/]+$/)) {
      if (method === 'GET') {
        const clientId = path.split('/clients/')[1];
        console.log('Get client endpoint hit for:', clientId);

        try {
          // Check if it's a created client first (in-memory storage)
          let client = createdClients.find(c => c.id === clientId);

          if (!client) {
            // Check S3 clients
            const s3Clients = await loadClientsFromS3();
            client = s3Clients.find(c => c.id === clientId);
          }

          if (!client) {
            return createResponse(404, {
              success: false,
              error: 'Client not found'
            });
          }

          // Load cases to find linked cases for this client
          const cases = await loadCasesFromS3();
          const linkedCases = cases
            .filter(case_ => case_.client === clientId)
            .map(case_ => case_.id);

          // Add linked_cases to the client response
          const clientWithCases = {
            ...client,
            linked_cases: linkedCases
          };

          return createResponse(200, {
            success: true,
            client: clientWithCases
          });
        } catch (error) {
          console.error('Error fetching client:', error);
          return createResponse(500, {
            success: false,
            error: 'Failed to fetch client',
            details: error.message
          });
        }
      }
      // If not GET, continue to next handler (PUT, DELETE)
    }

    // Update client
    if (path.match(/^\/clients\/[^\/]+$/)) {
      if (method !== 'PUT') {
        return createResponse(405, { error: 'Method not allowed. Use PUT to update client.' });
      }

      const clientId = path.split('/clients/')[1];
      console.log('Update client endpoint hit for:', clientId);

      let body;
      try {
        let bodyStr = event.body || '{}';
        if (event.isBase64Encoded) {
          bodyStr = Buffer.from(event.body, 'base64').toString('utf-8');
        }
        body = JSON.parse(bodyStr);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return createResponse(400, {
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        });
      }

      try {
        // Load existing clients from S3
        const s3Clients = await loadClientsFromS3();

        // Find and update the client
        let clientIndex = createdClients.findIndex(c => c.id === clientId);
        let s3ClientIndex = s3Clients.findIndex(c => c.id === clientId);
        let updatedClient;

        if (clientIndex !== -1) {
          // Update existing created client
          updatedClient = {
            ...createdClients[clientIndex],
            ...body,
            updated_at: new Date().toISOString()
          };
          createdClients[clientIndex] = updatedClient;
        } else if (s3ClientIndex !== -1) {
          // Update client from S3
          updatedClient = {
            ...s3Clients[s3ClientIndex],
            ...body,
            updated_at: new Date().toISOString()
          };
          s3Clients[s3ClientIndex] = updatedClient;
          // Save updated clients back to S3
          await saveClientsToS3(s3Clients);
        } else {
          // For mock clients, create updated version
          updatedClient = {
            id: clientId,
            ...body,
            updated_at: new Date().toISOString()
          };
        }

        return createResponse(200, {
          success: true,
          client: updatedClient,
          message: 'Client updated successfully'
        });
      } catch (error) {
        console.error('Error updating client:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to update client',
          details: error.message
        });
      }
    }

    // Delete client
    if (path.match(/^\/clients\/[^\/]+$/)) {
      if (method !== 'DELETE') {
        return createResponse(405, { error: 'Method not allowed. Use DELETE to remove client.' });
      }

      const clientId = path.split('/clients/')[1];
      console.log('Delete client endpoint hit for:', clientId);

      try {
        // Load existing clients from S3 and remove the specified client
        const s3Clients = await loadClientsFromS3();
        const filteredClients = s3Clients.filter(c => c.id !== clientId);

        // Save the filtered clients back to S3
        await saveClientsToS3(filteredClients);

        // Also remove from in-memory storage if it exists
        const memoryIndex = createdClients.findIndex(c => c.id === clientId);
        if (memoryIndex !== -1) {
          createdClients.splice(memoryIndex, 1);
        }

        return createResponse(200, {
          success: true,
          message: 'Client deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting client:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to delete client',
          details: error.message
        });
      }
    }

    // Upload client document
    if (path.match(/^\/clients\/[^\/]+\/documents$/)) {
      if (method !== 'POST') {
        return createResponse(405, { error: 'Method not allowed. Use POST to upload document.' });
      }

      const clientId = path.split('/clients/')[1].split('/documents')[0];
      console.log('Upload client document endpoint hit for client:', clientId);

      // This would handle multipart form data for file uploads
      // For now, return a placeholder response
      return createResponse(200, {
        success: true,
        message: 'Document upload endpoint - implementation pending',
        clientId
      });
    }

    // Get client documents
    if (path.match(/^\/clients\/[^\/]+\/documents$/)) {
      if (method !== 'GET') {
        return createResponse(405, { error: 'Method not allowed. Use GET to retrieve documents.' });
      }

      const clientId = path.split('/clients/')[1].split('/documents')[0];
      console.log('=== CLIENT DOCUMENTS DEBUG ===');
      console.log('Full path:', path);
      console.log('Extracted client ID:', clientId);
      console.log('Client ID type:', typeof clientId);
      console.log('Client ID length:', clientId ? clientId.length : 'null/undefined');

      try {
        // First check if there are any documents in S3 for this client
        const s3Client = new S3Client({ region: 'us-east-1' });

        const listCommand = new ListObjectsV2Command({
          Bucket: 'contractfiles1',
          Prefix: `clients/${clientId}/`,
          MaxKeys: 1000
        });

        const s3Response = await s3Client.send(listCommand);
        const objects = s3Response.Contents || [];
        console.log('S3 objects found for client', clientId, ':', objects.length, 'objects');

        // If no objects found, return a test document to debug
        if (objects.length === 0) {
          console.log('No documents found for client', clientId, 'returning test document');
          const testKey = `clients/${clientId}/test_document.pdf`;
          console.log('Creating test document with key:', testKey);

          const testDocument = {
            key: testKey,
            filename: 'test_document.pdf',
            file_type: 'application/pdf',
            uploaded_at: new Date().toISOString(),
            uploaded_by: 'system',
            size: 12345,
            download_url: `https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/s3/download?key=${encodeURIComponent(testKey)}`
          };

          console.log('Test document created:', testDocument);

          return createResponse(200, {
            success: true,
            documents: [testDocument],
            clientId,
            message: 'Test document for debugging'
          });
        }

        console.log('Found objects:', objects.map(obj => ({ key: obj.Key, size: obj.Size })));

        // Convert S3 objects to document format
        const documents = [];

        for (const obj of objects) {
          console.log('Processing S3 object:', obj);
          const key = obj.Key;
          console.log('Object key:', key);

          if (!key) {
            console.error('Object has undefined key:', obj);
            continue;
          }

          const filename = key.split('/').pop();

          // Skip if filename is empty (folder-like objects)
          if (!filename) {
            console.log('Skipping folder-like object:', key);
            continue;
          }

          // Get object metadata for content type and size
          let contentType = 'application/octet-stream';
          let size = obj.Size || 0;

          try {
            const headCommand = new HeadObjectCommand({
              Bucket: 'contractfiles1',
              Key: key
            });
            const headResponse = await s3Client.send(headCommand);
            contentType = headResponse.ContentType || contentType;
            size = headResponse.ContentLength || size;
          } catch (headError) {
            console.log('Could not get metadata for', key, headError.message);
          }

          // Extract timestamp from filename (format: timestamp_filename)
          const timestampMatch = filename.match(/^(\d+)_/);
          const uploadedAt = timestampMatch
            ? new Date(parseInt(timestampMatch[1])).toISOString()
            : new Date().toISOString();

          documents.push({
            key: key,
            filename: filename,
            file_type: contentType,
            uploaded_at: uploadedAt,
            uploaded_by: 'system',
            size: size,
            download_url: `https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/s3/download?key=${encodeURIComponent(key)}`
          });
        }

        console.log('Final documents array:', documents);
        return createResponse(200, {
          success: true,
          documents: documents,
          clientId
        });
      } catch (error) {
        console.error('Error fetching client documents:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to fetch client documents',
          details: error.message
        });
      }
    }

    // If no endpoint matches, return 404
    return createResponse(404, {
      error: 'Endpoint not found',
      message: 'The requested clients endpoint does not exist',
      available_endpoints: [
        '/clients (GET, POST)',
        '/clients/{id} (GET, PUT, DELETE)',
        '/clients/{id}/documents (GET, POST)'
      ]
    });

  } catch (error) {
    console.error('Lambda execution error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};