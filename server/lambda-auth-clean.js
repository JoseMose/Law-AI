// Clean Lambda Auth Handler - Only Essential Parts
// Import all modules
const {
  cognitoClient,
  bedrockClient,
  CLIENT_ID,
  CLIENT_SECRET,
  USER_POOL_ID,
  createBillingRecord,
  getBillingRecords,
  getBillingRecord,
  getLedgerEntries,
  updateBillingStatus
} = require('./aws-clients');

const {
  createdClients,
  getSecretHash,
  createResponse
} = require('./helpers');

const {
  updateDocumentReviewTimestamp,
  loadCasesFromS3,
  saveCasesToS3,
  loadClientsFromS3,
  saveClientsToS3
} = require('./s3-operations');

// In-memory case storage (persists during Lambda execution)
let cases = [];

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
        service: 'law-ai-lambda-clean',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
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
          clean: true
        }
      });
    }

    // Cases collection endpoint
    if (path === '/cases' || path === '/dev/cases') {
      if (method === 'GET') {
        try {
          const cases = await loadCasesFromS3();
          return createResponse(200, {
            success: true,
            cases: cases,
            count: cases.length,
            timestamp: new Date().toISOString()
          });
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

    // Case folder listing endpoint
    const folderListMatch = path.match(/^\/(?:dev\/)?case-folders\/([^\/]+)\/?$/);
    if (folderListMatch) {
      const caseId = folderListMatch[1];
      
      try {
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const prefix = `cases/${caseId}/files/`;
        const listCommand = new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET_NAME || 'contractfiles1',
          Prefix: prefix,
          Delimiter: '/'
        });
        
        const s3Response = await s3Client.send(listCommand);
        
        // Process folders (common prefixes)
        const folders = (s3Response.CommonPrefixes || []).map(prefix => {
          const folderName = prefix.Prefix.replace(`cases/${caseId}/files/`, '').replace('/', '');
          return {
            id: folderName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: folderName,
            type: 'folder',
            path: prefix.Prefix
          };
        });
        
        // Process files in root of case
        const files = (s3Response.Contents || [])
          .filter(obj => {
            const key = obj.Key;
            const relativePath = key.replace(`cases/${caseId}/files/`, '');
            const isRootFile = !relativePath.includes('/') && relativePath.length > 0;
            return isRootFile;
          })
          .map(obj => {
            const fileName = obj.Key.split('/').pop();
            return {
              id: fileName.split('.')[0] || fileName,
              name: fileName,
              filename: fileName,
              key: obj.Key,
              size: obj.Size,
              lastModified: obj.LastModified.toISOString(),
              type: 'file',
              path: obj.Key,
              extension: fileName.split('.').pop()?.toLowerCase() || 'unknown'
            };
          });
        
        return createResponse(200, {
          success: true,
          caseId: caseId,
          folders: folders,
          files: files,
          totalItems: folders.length + files.length,
          s3Bucket: process.env.S3_BUCKET_NAME || 'contractfiles1',
          s3Prefix: prefix,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting case folders from S3:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to retrieve case folders',
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
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || 'contractfiles1',
          Key: key
        });
        
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        
        return createResponse(200, {
          success: true,
          url: presignedUrl,
          key: key,
          expiresIn: 3600
        });
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
          const clients = await loadClientsFromS3();
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
        'GET /cases',
        'GET /case-folders/{caseId}',
        'GET /clients',
        'GET /s3/presign-get?key={key}'
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