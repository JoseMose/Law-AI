// Lambda handler with full Cognito authentication
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProvider({ 
  region: 'us-east-1'
});

// Environment variables
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// Helper function to create HMAC for Cognito secret hash
const crypto = require('crypto');

function getSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

// Helper function to create response with cache-busting
function createResponse(statusCode, data, customHeaders = {}) {
  const timestamp = Date.now();
  const responseData = {
    ...data,
    _timestamp: timestamp,
    _requestId: Math.random().toString(36).substr(2, 9)
  };
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '-1',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random().toString(36)}"`,
      'Vary': 'Accept-Encoding',
      ...customHeaders
    },
    body: JSON.stringify(responseData)
  };
}

// In-memory case storage (persists during Lambda execution)
let cases = [];

// S3 persistence for cases
async function loadCasesFromS3() {
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: 'us-east-1' });
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'cases/cases.json'
    });
    
    const response = await s3Client.send(command);
    const casesData = await response.Body.transformToString();
    return JSON.parse(casesData);
  } catch (error) {
    // If file doesn't exist or other error, return empty array
    console.log('No existing cases file or error loading cases:', error.message);
    return [];
  }
}

async function saveCasesToS3(casesArray) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: 'us-east-1' });
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'cases/cases.json',
      Body: JSON.stringify(casesArray, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log('Cases saved to S3 successfully');
    return true;
  } catch (error) {
    console.error('Error saving cases to S3:', error);
    return false;
  }
}

// Main Lambda handler
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

    // Health check endpoint
    if (path === '/health' || path === '/dev/health') {
      return createResponse(200, {
        status: 'healthy',
        service: 'law-ai-lambda',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
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
          random: Math.random()
        }
      });
    }

    // Direct auth endpoints (without /auth/ prefix)
    if (path === '/verifyToken' || path === '/dev/verifyToken') {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Authorization header with Bearer token required'
          })
        };
      }
      
      const token = authHeader.substring(7);
      
      try {
        const getUserCommand = new (require('@aws-sdk/client-cognito-identity-provider').GetUserCommand)({
          AccessToken: token
        });
        
        const userInfo = await cognitoClient.send(getUserCommand);
        
        const attributes = {};
        userInfo.UserAttributes.forEach(attr => {
          attributes[attr.Name] = attr.Value;
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            valid: true,
            username: userInfo.Username,
            attributes: attributes,
            user: {
              email: attributes.email,
              emailVerified: attributes.email_verified === 'true',
              sub: attributes.sub
            }
          })
        };
        
      } catch (error) {
        console.error('Token verification error:', error);
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            valid: false,
            error: error.name === 'NotAuthorizedException' ? 'Invalid or expired token' : 'Token verification failed',
            code: error.name
          })
        };
      }
    }

    // Authentication endpoints
    if (path.includes('/auth/')) {
      // Parse JSON body for auth endpoints
      try {
        if (rawBody) {
          requestBody = JSON.parse(rawBody);
        }
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
      
      // Sign In endpoint
      if (path === '/auth/signin' || path === '/dev/auth/signin') {
        const { email, username, password } = requestBody;
        const userIdentifier = email || username;
        
        if (!userIdentifier || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Email/username and password are required'
            })
          };
        }
        
        try {
          const secretHash = getSecretHash(userIdentifier, CLIENT_ID, CLIENT_SECRET);
          
          const authParams = {
            ClientId: CLIENT_ID,
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            UserPoolId: USER_POOL_ID,
            AuthParameters: {
              USERNAME: userIdentifier,
              PASSWORD: password,
              SECRET_HASH: secretHash
            }
          };
          
          const command = new (require('@aws-sdk/client-cognito-identity-provider').AdminInitiateAuthCommand)(authParams);
          const result = await cognitoClient.send(command);
          
          if (result.ChallengeName) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: false,
                challenge: result.ChallengeName,
                challengeParameters: result.ChallengeParameters,
                session: result.Session
              })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Authentication successful',
              accessToken: result.AuthenticationResult.AccessToken,
              idToken: result.AuthenticationResult.IdToken,
              refreshToken: result.AuthenticationResult.RefreshToken,
              expiresIn: result.AuthenticationResult.ExpiresIn
            })
          };
          
        } catch (error) {
          console.error('Cognito signin error:', error);
          
          let errorMessage = 'Authentication failed';
          if (error.name === 'NotAuthorizedException') {
            errorMessage = 'Invalid email or password';
          } else if (error.name === 'UserNotFoundException') {
            errorMessage = 'User not found';
          } else if (error.name === 'UserNotConfirmedException') {
            errorMessage = 'User account not confirmed. Please check your email for confirmation instructions.';
          }
          
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              error: errorMessage,
              code: error.name
            })
          };
        }
      }

      // Sign Up endpoint
      if (path === '/auth/signup' || path === '/dev/auth/signup') {
        const { email, password, firstName, lastName } = requestBody;
        
        if (!email || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Email and password are required'
            })
          };
        }
        
        try {
          const secretHash = getSecretHash(email, CLIENT_ID, CLIENT_SECRET);
          
          const signUpParams = {
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            SecretHash: secretHash,
            UserAttributes: [
              {
                Name: 'email',
                Value: email
              }
            ]
          };
          
          if (firstName) {
            signUpParams.UserAttributes.push({
              Name: 'given_name',
              Value: firstName
            });
          }
          
          if (lastName) {
            signUpParams.UserAttributes.push({
              Name: 'family_name',
              Value: lastName
            });
          }
          
          const command = new (require('@aws-sdk/client-cognito-identity-provider').SignUpCommand)(signUpParams);
          const result = await cognitoClient.send(command);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'User created successfully. Please check your email for confirmation code.',
              userSub: result.UserSub,
              codeDeliveryDetails: result.CodeDeliveryDetails
            })
          };
          
        } catch (error) {
          console.error('Cognito signup error:', error);
          
          let errorMessage = 'User registration failed';
          if (error.name === 'UsernameExistsException') {
            errorMessage = 'An account with this email already exists';
          } else if (error.name === 'InvalidPasswordException') {
            errorMessage = 'Password does not meet requirements';
          } else if (error.name === 'InvalidParameterException') {
            errorMessage = 'Invalid email format';
          }
          
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: errorMessage,
              code: error.name
            })
          };
        }
      }

      // Email confirmation endpoint
      if (path === '/auth/confirm' || path === '/dev/auth/confirm') {
        const { email, confirmationCode } = requestBody;
        
        if (!email || !confirmationCode) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Email and confirmation code are required'
            })
          };
        }
        
        try {
          const secretHash = getSecretHash(email, CLIENT_ID, CLIENT_SECRET);
          
          const confirmParams = {
            ClientId: CLIENT_ID,
            Username: email,
            ConfirmationCode: confirmationCode,
            SecretHash: secretHash
          };
          
          const command = new (require('@aws-sdk/client-cognito-identity-provider').ConfirmSignUpCommand)(confirmParams);
          await cognitoClient.send(command);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Email confirmed successfully. You can now sign in.'
            })
          };
          
        } catch (error) {
          console.error('Cognito confirm error:', error);
          
          let errorMessage = 'Confirmation failed';
          if (error.name === 'CodeMismatchException') {
            errorMessage = 'Invalid confirmation code';
          } else if (error.name === 'ExpiredCodeException') {
            errorMessage = 'Confirmation code has expired';
          }
          
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: errorMessage,
              code: error.name
            })
          };
        }
      }

      // Token verification endpoint
      if (path === '/auth/verify' || path === '/dev/auth/verify') {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              error: 'Authorization header with Bearer token required'
            })
          };
        }
        
        const token = authHeader.substring(7);
        
        try {
          const getUserCommand = new (require('@aws-sdk/client-cognito-identity-provider').GetUserCommand)({
            AccessToken: token
          });
          
          const userInfo = await cognitoClient.send(getUserCommand);
          
          const attributes = {};
          userInfo.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              valid: true,
              username: userInfo.Username,
              attributes: attributes,
              user: {
                email: attributes.email,
                emailVerified: attributes.email_verified === 'true',
                sub: attributes.sub
              }
            })
          };
          
        } catch (error) {
          console.error('Token verification error:', error);
          
          let errorMessage = 'Token verification failed';
          if (error.name === 'NotAuthorizedException') {
            errorMessage = 'Invalid or expired token';
          }
          
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              valid: false,
              error: errorMessage,
              code: error.name
            })
          };
        }
      }
    }

    // Cases endpoint with CRUD operations
    if (path === '/cases' || path === '/dev/cases') {
      if (method === 'GET') {
        // Get all cases from S3 storage
        try {
          cases = await loadCasesFromS3();
        } catch (error) {
          console.error('Error loading cases:', error);
          cases = [];
        }
        
        return {
          statusCode: 200,
          headers: {
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
          },
          body: JSON.stringify(cases)
        };
      }
      
      if (method === 'POST') {
        // Create new case
        try {
          requestBody = JSON.parse(rawBody);
        } catch (e) {
          return createResponse(400, { error: 'Invalid JSON in request body' });
        }
        
        // Load existing cases first
        cases = await loadCasesFromS3();
        
        const newCase = {
          id: String(Date.now()), // Use timestamp for unique ID
          title: requestBody.title || 'New Case',
          description: requestBody.description || '',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          status: requestBody.status || 'active',
          priority: requestBody.priority || 'medium',
          client: requestBody.client || '',
          type: requestBody.type || 'General',
          documents: []
        };
        
        cases.push(newCase);
        
        // Save to S3
        await saveCasesToS3(cases);
        
        return createResponse(201, {
          success: true,
          message: 'Case created successfully',
          case: newCase
        });
      }
    }

    // Case documents collection operations (POST /cases/1/documents)
    if (path.match(/^\/cases\/\d+\/documents\/?$/) || path.match(/^\/dev\/cases\/\d+\/documents\/?$/)) {
      const pathParts = path.split('/');
      const caseId = pathParts[pathParts.indexOf('cases') + 1];
      
      if (method === 'POST') {
        // Add document to case
        try {
          requestBody = JSON.parse(rawBody);
        } catch (e) {
          return createResponse(400, { error: 'Invalid JSON in request body' });
        }
        
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: `Case ${caseId} not found`
          });
        }
        
        const docName = requestBody.name || 'untitled.pdf';
        const newDocument = {
          id: Date.now(), // Use timestamp as unique ID
          name: docName,
          filename: docName,
          key: docName,
          size: requestBody.size || '1.0 MB',
          url: `/documents/${docName}`,
          uploadDate: new Date().toISOString().split('T')[0]
        };
        
        cases[caseIndex].documents.push(newDocument);
        cases[caseIndex].updatedAt = new Date().toISOString().split('T')[0];
        
        return createResponse(201, {
          success: true,
          message: `Document added to case ${caseId}`,
          addedDocument: newDocument,
          updatedCase: cases[caseIndex]
        });
      }
      
      return createResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['POST']
      });
    }

    // Case document operations (DELETE /cases/1/documents/file.pdf)
    if (path.match(/\/cases\/\d+\/documents\//) || path.match(/\/dev\/cases\/\d+\/documents\//)) {
      const pathParts = path.split('/');
      const caseId = pathParts[pathParts.indexOf('cases') + 1];
      const documentName = decodeURIComponent(pathParts[pathParts.length - 1]);
      
      if (method === 'DELETE') {
        // Load cases from S3 first
        cases = await loadCasesFromS3();
        
        // Delete document from case
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: `Case ${caseId} not found`
          });
        }
        
        const documentIndex = cases[caseIndex].documents.findIndex(d => d.name === documentName);
        if (documentIndex === -1) {
          return createResponse(404, {
            success: false,
            error: `Document ${documentName} not found in case ${caseId}`,
            availableDocuments: cases[caseIndex].documents.map(d => d.name)
          });
        }
        
        // Remove the document
        const removedDocument = cases[caseIndex].documents.splice(documentIndex, 1)[0];
        cases[caseIndex].updatedAt = new Date().toISOString().split('T')[0];
        
        // Save updated cases to S3
        await saveCasesToS3(cases);
        
        return createResponse(200, {
          success: true,
          message: `Document ${documentName} deleted from case ${caseId}`,
          deletedDocument: removedDocument,
          remainingDocuments: cases[caseIndex].documents.length,
          updatedCase: cases[caseIndex]
        });
      }
      
      return createResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['DELETE']
      });
    }

    // Individual case operations
    if (path.match(/\/cases\/\d+/) || path.match(/\/dev\/cases\/\d+/)) {
      const caseId = path.split('/').pop();
      
      if (method === 'DELETE') {
        // Load cases from S3 first
        cases = await loadCasesFromS3();
        
        // Find and delete case
        const initialLength = cases.length;
        cases = cases.filter(c => c.id !== caseId);
        
        if (cases.length === initialLength) {
          return createResponse(404, {
            success: false,
            error: `Case ${caseId} not found`,
            availableCases: cases.map(c => ({ id: c.id, title: c.title }))
          });
        }
        
        // Save updated cases to S3
        await saveCasesToS3(cases);
        
        return createResponse(200, {
          success: true,
          message: `Case ${caseId} deleted successfully`,
          deletedCaseId: caseId,
          remainingCases: cases.length
        });
      }
      
      if (method === 'PUT') {
        // Load cases from S3 first
        cases = await loadCasesFromS3();
        
        // Update case
        try {
          requestBody = JSON.parse(rawBody);
        } catch (e) {
          return createResponse(400, { error: 'Invalid JSON in request body' });
        }
        
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: `Case ${caseId} not found`
          });
        }
        
        // Update the case
        cases[caseIndex] = {
          ...cases[caseIndex],
          ...requestBody,
          id: caseId, // Ensure ID doesn't change
          updatedAt: new Date().toISOString().split('T')[0]
        };
        
        // Save updated cases to S3
        await saveCasesToS3(cases);
        
        return createResponse(200, {
          success: true,
          message: `Case ${caseId} updated successfully`,
          updatedCase: cases[caseIndex]
        });
      }
      
      if (method === 'GET') {
        // Load cases from S3 first
        cases = await loadCasesFromS3();
        
        // Get specific case
        const case_ = cases.find(c => c.id === caseId);
        if (!case_) {
          return createResponse(404, {
            success: false,
            error: `Case ${caseId} not found`
          });
        }
        
        return createResponse(200, {
          success: true,
          case: case_
        });
      }
    }

    // Document operations
    if (path.startsWith('/documents/') || path.startsWith('/dev/documents/')) {
      const fileName = path.split('/').pop();
      
      // Mock documents for testing
      const mockDocs = {
        'contract.pdf': { content: 'Sample Employment Contract Content...', type: 'application/pdf' },
        'addendum.pdf': { content: 'Contract Addendum Content...', type: 'application/pdf' },
        'agreement.pdf': { content: 'Employment Agreement Content...', type: 'application/pdf' },
        'lease.pdf': { content: 'Commercial Lease Agreement Content...', type: 'application/pdf' },
        'notice.pdf': { content: 'Legal Notice Content...', type: 'application/pdf' },
        'response.pdf': { content: 'Response Document Content...', type: 'application/pdf' }
      };
      
      if (mockDocs[fileName]) {
        return createResponse(200, {
          success: true,
          document: {
            name: fileName,
            content: mockDocs[fileName].content,
            type: mockDocs[fileName].type,
            size: '2.3 MB',
            pages: 5,
            downloadUrl: `https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev/documents/${fileName}`,
            previewText: mockDocs[fileName].content
          }
        });
      } else {
        return createResponse(404, {
          error: 'Document not found',
          available: Object.keys(mockDocs)
        });
      }
    }

    // S3 Object deletion endpoint
    if (path === '/s3/object' || path === '/dev/s3/object') {
      if (method === 'DELETE') {
        try {
          const parsedBody = rawBody ? JSON.parse(rawBody) : {};
          const { fileName, key } = parsedBody;
          
          if (!fileName && !key) {
            return createResponse(400, {
              error: 'fileName or key is required for S3 object deletion'
            });
          }
          
          const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
          const s3Client = new S3Client({ region: 'us-east-1' });
          
          const objectKey = key || fileName;
          
          const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: objectKey
          });
          
          await s3Client.send(command);
          
          return createResponse(200, {
            success: true,
            message: `Object ${objectKey} deleted successfully`,
            deletedObject: objectKey,
            bucket: process.env.S3_BUCKET_NAME
          });
          
        } catch (error) {
          console.error('S3 delete error:', error);
          
          return createResponse(500, {
            error: 'Failed to delete S3 object',
            details: error.message
          });
        }
      }
      
      if (method === 'GET') {
        // List S3 objects (optional functionality)
        try {
          const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
          const s3Client = new S3Client({ region: 'us-east-1' });
          
          const command = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 100
          });
          
          const result = await s3Client.send(command);
          
          const objects = result.Contents?.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified,
            url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${obj.Key}`
          })) || [];
          
          return createResponse(200, {
            success: true,
            objects,
            count: objects.length,
            bucket: process.env.S3_BUCKET_NAME
          });
          
        } catch (error) {
          console.error('S3 list error:', error);
          
          return createResponse(500, {
            error: 'Failed to list S3 objects',
            details: error.message
          });
        }
      }
      
      return createResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['DELETE', 'GET']
      });
    }

    // S3 Presigned GET URL endpoint
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
      
      // Check if the file appears to be a PDF (for preview safety)
      // Extract actual file extension and check if it's really a PDF
      const fileExtension = key.split('.').pop().toLowerCase();
      if (fileExtension !== 'pdf' || key.toLowerCase().includes('.docx') || key.toLowerCase().includes('.doc')) {
        return createResponse(400, {
          error: 'Only PDF files can be previewed',
          fileType: fileExtension,
          fileName: key.split('/').pop(),
          suggestion: 'Use download instead of preview for non-PDF files'
        });
      }
      
      // Check if this is a mock document (simple filename without timestamp)
      const isMockDocument = !key.includes('-') || key.length < 20;
      
      if (isMockDocument) {
        // For mock documents, return a placeholder/demo URL
        return createResponse(200, {
          success: true,
          url: `data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVGl0bGUgKE1vY2sgRG9jdW1lbnQpCi9Qcm9kdWNlciAoTGF3LUFJIERlbW8pCi9DcmVhdG9yIChMYXctQUkpCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCi8xMiBUZgowIDAgVGQKKFRoaXMgaXMgYSBkZW1vIGRvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDE3NyAwMDAwMCBuIAowMDAwMDAwMjUyIDAwMDAwIG4gCjAwMDAwMDAzNDQgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDYgMCBSCj4+CnN0YXJ0eHJlZgo0MTAKJSVFT0YK`,
          key: key,
          isMock: true,
          message: 'This is a demo document for preview purposes'
        });
      }
      
      try {
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
        
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key
        });
        
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        
        return createResponse(200, {
          success: true,
          url: presignedUrl,
          key: key,
          bucket: process.env.S3_BUCKET_NAME,
          expiresIn: 3600,
          isMock: false
        });
        
      } catch (error) {
        console.error('S3 presigned GET URL error:', error);
        
        return createResponse(500, {
          error: 'Failed to generate presigned URL',
          details: error.message
        });
      }
    }

    // S3 Download endpoint - proxy download through Lambda
    if (path === '/s3/download' || path === '/dev/s3/download') {
      if (method !== 'GET') {
        return createResponse(405, {
          error: 'Method not allowed. Use GET for downloads.'
        });
      }

      // Authentication required - check both header and query parameter
      const authHeader = event.headers.Authorization || event.headers.authorization;
      const queryToken = event.queryStringParameters?.t;
      
      let token;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (queryToken) {
        token = queryToken;
      } else {
        return createResponse(401, {
          error: 'Authorization required: provide Bearer token in header or t parameter in query'
        });
      }
      try {
        const getUserCommand = new (require('@aws-sdk/client-cognito-identity-provider').GetUserCommand)({
          AccessToken: token
        });
        await cognitoClient.send(getUserCommand);
      } catch (error) {
        return createResponse(401, {
          error: 'Invalid or expired token'
        });
      }

      const key = event.queryStringParameters?.key;
      if (!key) {
        return createResponse(400, {
          error: 'key parameter is required for download'
        });
      }

      try {
        const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });

        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key
        });

        const s3Response = await s3Client.send(command);
        
        // Stream the file content as response
        const chunks = [];
        for await (const chunk of s3Response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Determine content type - force PDF if the key suggests it's a PDF
        const contentType = key.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                           (s3Response.ContentType || 'application/octet-stream');

        return {
          statusCode: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': s3Response.ContentLength?.toString() || buffer.length.toString(),
            'Content-Disposition': contentType === 'application/pdf' ? 'inline; filename="document.pdf"' : 'attachment',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-Frame-Options': 'SAMEORIGIN',
            'Cross-Origin-Resource-Policy': 'same-site'
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true
        };

      } catch (error) {
        console.error('S3 download error:', error);
        return createResponse(500, {
          error: 'Failed to download file',
          details: error.message
        });
      }
    }

    // S3 Upload endpoint
    if (path === '/s3/upload' || path === '/dev/s3/upload') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST for file uploads.'
        });
      }
      
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      
      if (contentType.includes('application/json')) {
        try {
          const parsedBody = rawBody ? JSON.parse(rawBody) : {};
          const { fileName, fileType, fileSize } = parsedBody;
          
          if (!fileName || !fileType) {
            return createResponse(400, {
              error: 'fileName and fileType are required for presigned URL generation'
            });
          }
          
          const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
          const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
          
          const s3Client = new S3Client({ region: 'us-east-1' });
          
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}-${fileName}`;
          
          const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: uniqueFileName,
            ContentType: fileType,
            ContentLength: fileSize
          });
          
          const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          
          return createResponse(200, {
            success: true,
            uploadUrl,
            fileName: uniqueFileName,
            bucket: process.env.S3_BUCKET_NAME,
            fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${uniqueFileName}`
          });
          
        } catch (jsonError) {
          return createResponse(400, {
            error: 'Invalid JSON in request body',
            details: jsonError.message
          });
        }
      }
      
      // Handle direct file upload with multipart form data parsing
      try {
        // Check content length to prevent oversized uploads (limit to 10MB)
        const contentLength = parseInt(event.headers['content-length'] || event.headers['Content-Length'] || '0');
        if (contentLength > 10 * 1024 * 1024) {
          return createResponse(413, {
            error: 'File too large. Maximum file size is 10MB.',
            fileSize: `${(contentLength / (1024 * 1024)).toFixed(1)}MB`,
            maxSize: '10MB'
          });
        }

        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        let fileName = 'uploaded-file';
        let fileBuffer;
        const contentDisposition = event.headers['content-disposition'] || event.headers['Content-Disposition'];
        
        // Parse multipart form data
        let bodyBuffer;
        try {
          if (event.isBase64Encoded) {
            bodyBuffer = Buffer.from(rawBody, 'base64');
          } else {
            bodyBuffer = Buffer.from(rawBody);
          }
        } catch (error) {
          return createResponse(400, {
            error: 'Invalid request body encoding',
            details: error.message
          });
        }
        
        // Simple multipart parser for file uploads
        function parseMultipartFile(buffer) {
          const boundary = contentType.split('boundary=')[1];
          if (!boundary) {
            throw new Error('No boundary found in multipart data');
          }
          
          const boundaryBuffer = Buffer.from('--' + boundary);
          const parts = [];
          let start = 0;
          
          // Split by boundary
          while (true) {
            const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
            if (boundaryIndex === -1) break;
            
            if (start > 0) {
              parts.push(buffer.slice(start, boundaryIndex));
            }
            start = boundaryIndex + boundaryBuffer.length;
          }
          
          // Find the file part
          for (const part of parts) {
            const partStr = part.toString();
            const headerEndIndex = partStr.indexOf('\r\n\r\n');
            if (headerEndIndex === -1) continue;
            
            const headers = partStr.substring(0, headerEndIndex);
            if (headers.includes('Content-Disposition') && headers.includes('filename=')) {
              // Extract filename
              const filenameMatch = headers.match(/filename="?([^";\r\n]+)"?/);
              if (filenameMatch) {
                fileName = filenameMatch[1];
              }
              
              // Extract file content (skip headers + \r\n\r\n, and trim final \r\n)
              const fileContent = part.slice(headerEndIndex + 4);
              // Remove trailing \r\n if present
              const endTrim = fileContent.length >= 2 && 
                            fileContent[fileContent.length - 2] === 13 && 
                            fileContent[fileContent.length - 1] === 10 ? 2 : 0;
              return {
                fileName,
                content: fileContent.slice(0, fileContent.length - endTrim)
              };
            }
          }
          throw new Error('No file found in multipart data');
        }
        
        let fileContentType = 'application/octet-stream';
        
        if (contentType.includes('multipart/form-data')) {
          try {
            const parsed = parseMultipartFile(bodyBuffer);
            fileName = parsed.fileName;
            fileBuffer = parsed.content;
          } catch (parseError) {
            return createResponse(400, {
              error: 'Failed to parse multipart form data',
              details: parseError.message,
              contentType: contentType
            });
          }
          
          // Validate file type - only allow PDFs (and reject files with multiple extensions)
          const fileExtension = fileName.split('.').pop().toLowerCase();
          if (fileExtension !== 'pdf' || fileName.toLowerCase().includes('.docx') || fileName.toLowerCase().includes('.doc')) {
            return createResponse(400, {
              error: 'Only PDF files are allowed. DOCX, DOC, and other formats are not supported.',
              fileName: fileName,
              detectedType: fileExtension,
              allowedTypes: ['pdf']
            });
          }
          
          // Determine content type based on file extension
          fileContentType = 'application/pdf';
        } else {
          // Direct file upload (not multipart)
          fileBuffer = bodyBuffer;
          fileContentType = contentType || 'application/octet-stream';
        }
        
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;
        
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: fileContentType
        });
        
        await s3Client.send(command);
        
                // Get caseId from query parameters
        let caseId = null;
        let originalFileName = fileName;
        
        if (event.queryStringParameters && event.queryStringParameters.caseId) {
          caseId = event.queryStringParameters.caseId;
        }
        
        // Extract filename from Content-Disposition header if available
        if (contentDisposition && contentDisposition.includes('filename=')) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            originalFileName = match[1];
          }
        }
        
        // If caseId is provided, add document to the case
        let updatedCase = null;
        if (caseId) {
          // Load cases from S3 first
          cases = await loadCasesFromS3();
          
          const caseIndex = cases.findIndex(c => c.id === caseId);
          if (caseIndex !== -1) {
            const newDocument = {
              id: timestamp,
              name: originalFileName,
              filename: originalFileName,
              key: uniqueFileName, // S3 key
              size: `${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB`,
              url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${uniqueFileName}`,
              uploadDate: new Date().toISOString().split('T')[0]
            };
            
            cases[caseIndex].documents.push(newDocument);
            cases[caseIndex].updatedAt = new Date().toISOString().split('T')[0];
            updatedCase = cases[caseIndex];
            
            // Save updated cases to S3
            await saveCasesToS3(cases);
          }
        }
        
        return createResponse(200, {
          success: true,
          fileName: uniqueFileName,
          originalFileName: originalFileName,
          bucket: process.env.S3_BUCKET_NAME,
          fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${uniqueFileName}`,
          size: fileBuffer.length,
          caseId: caseId,
          addedToCase: !!updatedCase,
          updatedCase: updatedCase
        });
        
      } catch (error) {
        console.error('S3 upload error:', error);
        
        return createResponse(500, {
          error: 'Failed to upload file',
          details: error.message
        });
      }
    }

    // Contract Review endpoint
    if (path === '/contracts/review' || path === '/dev/contracts/review') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST for contract review.'
        });
      }

      // Authentication required
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createResponse(401, {
          error: 'Authorization header with Bearer token required'
        });
      }

      const token = authHeader.substring(7);
      try {
        const getUserCommand = new (require('@aws-sdk/client-cognito-identity-provider').GetUserCommand)({
          AccessToken: token
        });
        await cognitoClient.send(getUserCommand);
      } catch (error) {
        return createResponse(401, {
          error: 'Invalid or expired token'
        });
      }

      try {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        const { content } = parsedBody;

        if (!content) {
          return createResponse(400, {
            error: 'Content is required for contract review'
          });
        }

        // Mock contract review response
        // In a real implementation, this would integrate with AI services like Bedrock/OpenAI
        const mockReview = {
          summary: "This appears to be a standard employment contract with several key provisions.",
          issues: [
            {
              type: "warning",
              section: "Termination Clause",
              description: "The termination clause may be too broad and could limit employee rights.",
              suggestion: "Consider adding specific termination conditions and notice periods."
            },
            {
              type: "info", 
              section: "Compensation",
              description: "Salary and benefits structure is clearly defined.",
              suggestion: "No changes needed in this section."
            }
          ],
          overallRisk: "Medium",
          recommendations: [
            "Review termination clause with employment law specialist",
            "Consider adding intellectual property protection clauses",
            "Ensure compliance with local labor laws"
          ]
        };

        return createResponse(200, {
          success: true,
          review: mockReview
        });

      } catch (error) {
        console.error('Contract review error:', error);
        return createResponse(500, {
          error: 'Failed to review contract',
          details: error.message
        });
      }
    }

    // Contract Fix endpoint
    if (path === '/contracts/fix' || path === '/dev/contracts/fix') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST for contract fix.'
        });
      }

      // Authentication required
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createResponse(401, {
          error: 'Authorization header with Bearer token required'
        });
      }

      const token = authHeader.substring(7);
      try {
        const getUserCommand = new (require('@aws-sdk/client-cognito-identity-provider').GetUserCommand)({
          AccessToken: token
        });
        await cognitoClient.send(getUserCommand);
      } catch (error) {
        return createResponse(401, {
          error: 'Invalid or expired token'
        });
      }

      try {
        const parsedBody = rawBody ? JSON.parse(rawBody) : {};
        const { content, issue } = parsedBody;

        if (!content || !issue) {
          return createResponse(400, {
            error: 'Content and issue description are required for contract fix'
          });
        }

        // Mock contract fix response
        // In a real implementation, this would integrate with AI services
        const mockFix = {
          originalSection: content.substring(0, 200) + "...",
          revisedSection: "REVISED: " + content.substring(0, 150) + "... [with suggested improvements]",
          changes: [
            "Added specific termination notice period of 30 days",
            "Clarified grounds for termination",
            "Added employee protection clauses"
          ],
          explanation: "The revised section addresses the identified issues by providing clearer terms and better protection for both parties."
        };

        return createResponse(200, {
          success: true,
          fix: mockFix
        });

      } catch (error) {
        console.error('Contract fix error:', error);
        return createResponse(500, {
          error: 'Failed to fix contract',
          details: error.message
        });
      }
    }

    // Root endpoint
    if (path === '/' || path === '/dev' || path === '/dev/') {
      return createResponse(200, {
        message: 'Law-AI API with Cognito Authentication',
        timestamp: new Date().toISOString(),
        status: 'Production Ready',
        available_endpoints: [
          '/health', 
          '/auth/signin', 
          '/auth/signup', 
          '/auth/confirm', 
          '/auth/verify', 
          '/verifyToken',
          '/cases', 
          '/cases/{id} (GET, PUT, DELETE)',
          '/cases/{id}/documents/{name} (POST, DELETE)',
          '/documents/{filename}',
          '/s3/upload'
        ],
        authentication: 'AWS Cognito integrated'
      });
    }

    // Default 404 for unhandled routes
    return createResponse(404, {
      error: 'Route not found',
      path: path,
      method: method,
      availableRoutes: [
        'GET /health',
        'GET /',
        'POST /auth/signin',
        'POST /auth/signup', 
        'POST /auth/confirm',
        'GET /auth/verify',
        'GET /verifyToken',
        'GET /cases',
        'GET /cases/{id}',
        'DELETE /cases/{id}',
        'PUT /cases/{id}',
        'DELETE /cases/{id}/documents/{name}',
        'POST /cases/{id}/documents',
        'GET /documents/{filename}',
        'GET /s3/presign-get',
        'GET /s3/download',
        'DELETE /s3/object',
        'POST /s3/upload',
        'POST /contracts/review',
        'POST /contracts/fix'
      ]
    });
    
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message
    });
  }
};