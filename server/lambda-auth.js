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
let cases = [
  {
    id: '1',
    title: 'Sample Contract Review',
    description: 'Review of employment contract for ABC Corp',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    status: 'active',
    priority: 'high',
    client: 'ABC Corporation',
    type: 'Contract Review',
    documents: [
      { id: 1, name: 'contract.pdf', filename: 'contract.pdf', key: 'contract.pdf', size: '2.1 MB', url: '/documents/contract.pdf' },
      { id: 2, name: 'addendum.pdf', filename: 'addendum.pdf', key: 'addendum.pdf', size: '0.8 MB', url: '/documents/addendum.pdf' }
    ]
  },
  {
    id: '2', 
    title: 'Employment Agreement Analysis',
    description: 'Analysis of non-compete clauses in employment agreement',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15',
    status: 'completed',
    priority: 'medium',
    client: 'John Doe',
    type: 'Legal Analysis',
    documents: [
      { id: 3, name: 'agreement.pdf', filename: 'agreement.pdf', key: 'agreement.pdf', size: '1.5 MB', url: '/documents/agreement.pdf' }
    ]
  },
  {
    id: '3',
    title: 'Lease Agreement Dispute',
    description: 'Commercial lease dispute resolution',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-25',
    status: 'in-progress',
    priority: 'high',
    client: 'XYZ Properties',
    type: 'Litigation',
    documents: [
      { id: 4, name: 'lease.pdf', filename: 'lease.pdf', key: 'lease.pdf', size: '3.2 MB', url: '/documents/lease.pdf' },
      { id: 5, name: 'notice.pdf', filename: 'notice.pdf', key: 'notice.pdf', size: '0.5 MB', url: '/documents/notice.pdf' },
      { id: 6, name: 'response.pdf', filename: 'response.pdf', key: 'response.pdf', size: '1.2 MB', url: '/documents/response.pdf' }
    ]
  }
];

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
        // Get all cases from in-memory storage
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
        
        const newCase = {
          id: String(cases.length + 1),
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
      const documentName = pathParts[pathParts.length - 1];
      
      if (method === 'DELETE') {
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
        
        return createResponse(200, {
          success: true,
          message: `Case ${caseId} deleted successfully`,
          deletedCaseId: caseId,
          remainingCases: cases.length
        });
      }
      
      if (method === 'PUT') {
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
        
        return createResponse(200, {
          success: true,
          message: `Case ${caseId} updated successfully`,
          updatedCase: cases[caseIndex]
        });
      }
      
      if (method === 'GET') {
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
      
      // Handle direct file upload
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        let fileName = 'uploaded-file';
        const contentDisposition = event.headers['content-disposition'] || event.headers['Content-Disposition'];
        if (contentDisposition && contentDisposition.includes('filename=')) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            fileName = match[1];
          }
        }
        
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;
        
        let fileBuffer;
        if (event.isBase64Encoded) {
          fileBuffer = Buffer.from(rawBody, 'base64');
        } else {
          fileBuffer = Buffer.from(rawBody);
        }
        
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: contentType || 'application/octet-stream'
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
        'DELETE /s3/object',
        'POST /s3/upload'
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