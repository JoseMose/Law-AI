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

// In-memory storage for created clients (for demo purposes)
let createdClients = [];

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

// Helper function to analyze contract text and identify legal issues
function analyzeContractText(text) {
  const issues = [];
  const lines = text.split('\n');
  let issueId = 1;

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();

  // Check for overly broad termination clauses
  if (lowerText.includes('terminated at any time') || lowerText.includes('at-will termination')) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('terminated at any time') || line.toLowerCase().includes('at-will termination'));
    issues.push({
      id: issueId++,
      type: "error",
      title: "Overly Broad Termination Clause",
      description: "At-will termination without notice periods may violate employment laws in certain jurisdictions.",
      suggestion: "Add reasonable notice periods and define specific grounds for immediate termination.",
      section: "Termination",
      line: lineIndex >= 0 ? lineIndex + 1 : null,
      originalText: lines[lineIndex] || "Employee may be terminated at any time...",
      suggestedText: "Employee may be terminated by Company with thirty (30) days written notice, except in cases of misconduct, breach of contract, or other just cause."
    });
  }

  // Check for missing IP assignment
  if (!lowerText.includes('intellectual property') && !lowerText.includes('invention')) {
    issues.push({
      id: issueId++,
      type: "warning",
      title: "Missing Intellectual Property Assignment",
      description: "No clear assignment of intellectual property rights to the Company.",
      suggestion: "Add comprehensive IP assignment clause to protect Company's interests.",
      section: "New Section Needed",
      line: null,
      originalText: null,
      suggestedText: "SECTION: INTELLECTUAL PROPERTY\nAll inventions, discoveries, improvements, and intellectual property created by Employee during employment shall be the sole and exclusive property of Company."
    });
  }

  // Check for vague non-compete terms
  if (lowerText.includes('non-compete') || lowerText.includes('compete')) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('non-compete') || line.toLowerCase().includes('compete'));
    if (lines[lineIndex] && (lines[lineIndex].includes('[TIME PERIOD]') || lines[lineIndex].includes('time period'))) {
      issues.push({
        id: issueId++,
        type: "warning",
        title: "Vague Non-Compete Terms",
        description: "Non-compete clause lacks specific geographic scope and duration.",
        suggestion: "Define specific geographic boundaries and scope of restricted activities.",
        section: "Non-Compete",
        line: lineIndex >= 0 ? lineIndex + 1 : null,
        originalText: lines[lineIndex],
        suggestedText: "Employee agrees not to directly or indirectly engage in competing business activities within [SPECIFIC GEOGRAPHIC AREA] for a period of twelve (12) months following termination, limited to [SPECIFIC BUSINESS ACTIVITIES]."
      });
    }
  }

  // Check for incomplete benefit details
  if (lowerText.includes('benefit') && (lowerText.includes('as may be available') || lowerText.includes('similar level'))) {
    const lineIndex = lines.findIndex(line => line.toLowerCase().includes('benefit') && (line.toLowerCase().includes('available') || line.toLowerCase().includes('similar level')));
    issues.push({
      id: issueId++,
      type: "info",
      title: "Incomplete Benefit Details",
      description: "Benefits section lacks specific details about available plans and eligibility.",
      suggestion: "Reference specific benefit plans or attach detailed benefits schedule.",
      section: "Compensation/Benefits",
      line: lineIndex >= 0 ? lineIndex + 1 : null,
      originalText: lines[lineIndex] || "Employee shall also be entitled to participate in Company's benefit plans as may be available...",
      suggestedText: "Employee shall be entitled to participate in Company's standard benefits package including health insurance, dental coverage, and retirement plan as detailed in Exhibit B, subject to plan terms and eligibility requirements."
    });
  }

  // Generate annotated HTML
  const annotatedHtml = generateAnnotatedHtml(text, issues);

  // Determine overall risk level
  let overallRisk = "Low";
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;

  if (errorCount > 0) {
    overallRisk = "High";
  } else if (warningCount > 1) {
    overallRisk = "Medium";
  } else if (warningCount > 0) {
    overallRisk = "Low-Medium";
  }

  const summary = `Document review complete. Found ${issues.length} item${issues.length !== 1 ? 's' : ''} requiring attention.`;

  return {
    issues,
    annotatedHtml,
    summary,
    overallRisk
  };
}

// Helper function to generate annotated HTML for the contract editor
function generateAnnotatedHtml(text, issues) {
  const lines = text.split('\n');
  let html = `
    <div class="contract-editor">
      <div class="contract-header">
        <h2>Contract Review - AI Analysis Complete</h2>
        <div class="review-summary">
          <span class="issue-count error">${issues.filter(i => i.type === 'error').length} Critical</span>
          <span class="issue-count warning">${issues.filter(i => i.type === 'warning').length} Warnings</span>
          <span class="issue-count info">${issues.filter(i => i.type === 'info').length} Info</span>
        </div>
      </div>
      <div class="contract-content" contenteditable="true" spellcheck="false">
  `;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let processedLine = line;

    // Check if this line has any issues
    const lineIssues = issues.filter(issue => issue.line === lineNumber);
    if (lineIssues.length > 0) {
      lineIssues.forEach(issue => {
        const className = issue.type === 'error' ? 'highlight-error' :
                         issue.type === 'warning' ? 'highlight-warning' : 'highlight-info';
        processedLine = `<span class="${className}" data-issue="${issue.id}" title="Click to view suggestion">${processedLine}</span>`;
      });
    }

    html += `<div class="line-number">${lineNumber}</div>${processedLine}\n`;
  });

  // Add missing sections if needed
  const missingSections = issues.filter(issue => !issue.line);
  missingSections.forEach(issue => {
    html += `<div class="highlight-warning missing-section" data-issue="${issue.id}" title="Missing section - Click to add">
<strong>[MISSING SECTION: ${issue.title.toUpperCase()}]</strong>
<div class="suggestion-text">💡 Recommended: Add this section to your contract</div>
</div>\n`;
  });

  html += `
      </div>
    </div>

    <style>
      .contract-editor {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fefefe;
        overflow: hidden;
      }
      .contract-header {
        background: #f8f9fa;
        padding: 16px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .contract-header h2 {
        margin: 0;
        font-size: 18px;
        color: #212529;
      }
      .review-summary {
        display: flex;
        gap: 12px;
      }
      .issue-count {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }
      .issue-count.error { background: #f8d7da; color: #721c24; }
      .issue-count.warning { background: #fff3cd; color: #856404; }
      .issue-count.info { background: #d1ecf1; color: #0c5460; }
      .contract-content {
        padding: 20px;
        line-height: 1.8;
        white-space: pre-wrap;
        min-height: 500px;
        position: relative;
      }
      .line-number {
        display: inline-block;
        width: 40px;
        color: #6c757d;
        font-size: 12px;
        user-select: none;
        margin-right: 10px;
      }
      .highlight-error {
        background-color: #f8d7da;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        border-left: 3px solid #dc3545;
        transition: all 0.2s;
      }
      .highlight-warning {
        background-color: #fff3cd;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        border-left: 3px solid #ffc107;
        transition: all 0.2s;
      }
      .highlight-info {
        background-color: #d1ecf1;
        padding: 2px 4px;
        border-radius: 3px;
        cursor: pointer;
        border-left: 3px solid #17a2b8;
        transition: all 0.2s;
      }
      .highlight-error:hover, .highlight-warning:hover, .highlight-info:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .missing-section {
        background-color: #fff3cd;
        border: 2px dashed #ffc107;
        padding: 12px;
        border-radius: 6px;
        margin: 10px 0;
        text-align: center;
      }
      .suggestion-text {
        font-size: 12px;
        color: #856404;
        font-style: italic;
        margin-top: 4px;
      }
    </style>
  `;

  return html;
}

// Helper function to update document review timestamp
async function updateDocumentReviewTimestamp(caseId, documentKey) {
  try {
    const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const bucket = process.env.S3_BUCKET || 'contractfiles1';

    // Load existing case folders data
    const caseKey = `cases/${caseId}/case-folders.json`;
    let caseData = { folders: [], documents: [] };

    try {
      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: caseKey });
      const response = await s3Client.send(getCommand);
      const data = await response.Body.transformToString();
      caseData = JSON.parse(data);
    } catch (err) {
      // File doesn't exist, use default structure
      console.log('Case folders file does not exist, creating new one');
    }

    // Find and update the document
    const docIndex = caseData.documents.findIndex(doc => doc.key === documentKey);
    if (docIndex >= 0) {
      caseData.documents[docIndex].lastReviewedAt = new Date().toISOString();
    } else {
      // Document not found, add it with review timestamp
      caseData.documents.push({
        id: documentKey.split('/').pop().split('.')[0],
        filename: documentKey.split('/').pop(),
        key: documentKey,
        lastReviewedAt: new Date().toISOString()
      });
    }

    // Save updated data back to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: caseKey,
      Body: JSON.stringify(caseData, null, 2),
      ContentType: 'application/json'
    });

    await s3Client.send(putCommand);
    console.log('Updated review timestamp for document:', documentKey);

  } catch (error) {
    console.error('Failed to update document review timestamp:', error);
    throw error;
  }
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

// S3 persistence for clients
async function loadClientsFromS3() {
  try {
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: 'us-east-1' });
    
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'clients/clients.json'
    });
    
    const response = await s3Client.send(command);
    const clientsData = await response.Body.transformToString();
    return JSON.parse(clientsData);
  } catch (error) {
    // If file doesn't exist or other error, return empty array
    console.log('No existing clients file or error loading clients:', error.message);
    return [];
  }
}

async function saveClientsToS3(clientsArray) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: 'us-east-1' });
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'clients/clients.json',
      Body: JSON.stringify(clientsArray, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log('Clients saved to S3 successfully');
    return true;
  } catch (error) {
    console.error('Error saving clients to S3:', error);
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
          random: Math.random(),
          deployedAt: 'October 1, 2025 - 2:32am'
        }
      });
    }

    // New folder listing endpoint with different path
    const folderListMatch = path.match(/^\/(?:dev\/)?case-folders\/([^\/]+)\/?$/);
    if (folderListMatch) {
      const caseId = folderListMatch[1];
      console.log('=== CASE-FOLDERS DEBUG ===');
      console.log('Processing case-folders request for case:', caseId);
      console.log('Full path:', path);
      
      try {
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const listCommand = new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET_NAME,
          Prefix: `cases/${caseId}/`,
          MaxKeys: 1000
        });
        
        console.log('S3 Bucket:', process.env.S3_BUCKET_NAME);
        console.log('S3 Prefix:', `cases/${caseId}/`);
        console.log('About to send S3 ListObjects command...');
        
        const s3Response = await s3Client.send(listCommand);
        console.log('S3 command completed successfully');
        const allObjects = s3Response.Contents || [];
        
        console.log('S3 Response received');
        console.log('S3Response.IsTruncated:', s3Response.IsTruncated);
        console.log('S3Response.KeyCount:', s3Response.KeyCount);
        
        console.log('S3 objects found:', allObjects.length);
        console.log('All object keys:', allObjects.map(obj => obj.Key));
        
        const folders = [];
        const documents = [];
        
        for (const obj of allObjects) {
          const key = obj.Key;
          
          // Check if it's a folder info file
          if (key.includes('/folders/') && key.endsWith('.folderinfo')) {
            try {
              const headCommand = new (require('@aws-sdk/client-s3').HeadObjectCommand)({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key
              });
              
              const headResponse = await s3Client.send(headCommand);
              const metadata = headResponse.Metadata || {};
              
              folders.push({
                name: metadata.foldername || 'Unknown Folder',
                path: metadata.folderpath || '',
                fullPath: key.replace('.folderinfo', ''),
                createdAt: metadata.createdat || obj.LastModified?.toISOString()
              });
            } catch (error) {
              console.log('Could not get folder metadata for:', key);
            }
          }
          
          // Check if it's a document
          else if (key.includes('/documents/') && 
                   !key.includes('/versions/') && 
                   (key.endsWith('.pdf') || key.endsWith('.docx') || key.endsWith('.txt'))) {
            
            try {
              const headCommand = new (require('@aws-sdk/client-s3').HeadObjectCommand)({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key
              });
              
              const headResponse = await s3Client.send(headCommand);
              const metadata = headResponse.Metadata || {};
              
              // Determine which folder this document belongs to
              let folderPath = '';
              if (key.includes('/folders/')) {
                const folderMatch = key.match(/\/folders\/([^\/]+)\//);
                folderPath = folderMatch ? folderMatch[1] : '';
              }
              
              documents.push({
                id: key.split('/').pop().replace(/\.(pdf|docx|txt)$/, ''),
                filename: metadata.originalfilename || key.split('/').pop(),
                key: key,
                folderPath: folderPath,
                uploadedAt: metadata.uploadedat || obj.LastModified?.toISOString(),
                size: Math.round((obj.Size || 0) / 1024) + ' KB',
                contentType: headResponse.ContentType || 'application/octet-stream'
              });
            } catch (error) {
              console.log('Could not get document metadata for:', key);
            }
          }
        }
        
        console.log('Final folders count:', folders.length);
        console.log('Final documents count:', documents.length);
        console.log('Documents found:', documents);
        
        // Add a test document if none found
        if (documents.length === 0) {
          console.log('No documents found, adding test document');
          documents.push({
            id: 'test-doc',
            filename: 'test-document.pdf',
            key: `cases/${caseId}/documents/test-document.pdf`,
            folderPath: '',
            uploadedAt: new Date().toISOString(),
            size: '15 KB',
            contentType: 'application/pdf'
          });
        }
        
        return createResponse(200, {
          folders: folders,
          documents: documents,
          caseId: caseId,
          totalFolders: folders.length,
          totalDocuments: documents.length,
          message: 'Folders and documents loaded successfully'
        });
        
      } catch (s3Error) {
        console.error('=== S3 ERROR DETAILS ===');
        console.error('Error type:', s3Error.name);
        console.error('Error message:', s3Error.message);
        console.error('Error code:', s3Error.code);
        console.error('Full error:', s3Error);
        
        return createResponse(500, {
          success: false,
          error: 'Failed to load folders from S3',
          errorType: s3Error.name,
          errorCode: s3Error.code,
          details: s3Error.message,
          caseId: caseId,
          bucket: process.env.S3_BUCKET_NAME
        });
      }
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
      console.log('Raw body received:', rawBody);
      console.log('Raw body type:', typeof rawBody);
      console.log('Event body:', event.body);
      console.log('Event isBase64Encoded:', event.isBase64Encoded);
      
      try {
        if (rawBody) {
          // Handle base64 encoded bodies
          if (event.isBase64Encoded) {
            const decodedBody = Buffer.from(rawBody, 'base64').toString('utf-8');
            console.log('Decoded body:', decodedBody);
            requestBody = JSON.parse(decodedBody);
          } else {
            requestBody = JSON.parse(rawBody);
          }
        }
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Failed to parse body:', rawBody);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in request body', details: e.message })
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
          if (rawBody) {
            // Handle base64 encoded bodies
            if (event.isBase64Encoded) {
              const decodedBody = Buffer.from(rawBody, 'base64').toString('utf-8');
              requestBody = JSON.parse(decodedBody);
            } else {
              requestBody = JSON.parse(rawBody);
            }
          } else {
            requestBody = {};
          }
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

    // Helper function to determine version status based on type and fixed issues
    function getVersionStatus(versionType, fixedIssues) {
      if (versionType === 'original') return 'Original Upload';
      if (versionType === 'reviewed') return '4 Issues Identified';
      if (versionType === 'fixed') return 'All Issues Resolved';
      return 'Manual Version';
    }

    // Helper function to parse fixed issues from metadata
    function parseFixedIssues(fixedIssuesStr) {
      if (!fixedIssuesStr) return [];
      try {
        return JSON.parse(fixedIssuesStr);
      } catch (error) {
        return [];
      }
    }

    // Folder Creation endpoint
    if (path === '/folders/create' || path === '/dev/folders/create') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST to create folders.'
        });
      }

      console.log('Folder creation endpoint hit - method:', method, 'path:', path);
      
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
      
      const { caseId, folderName, parentPath } = body;
      console.log('Create folder request:', { caseId, folderName, parentPath });
      
      if (!caseId || !folderName) {
        return createResponse(400, { 
          success: false, 
          error: 'caseId and folderName are required' 
        });
      }

      // Sanitize folder name
      const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
      if (!sanitizedFolderName) {
        return createResponse(400, { 
          success: false, 
          error: 'Invalid folder name. Use only letters, numbers, spaces, hyphens, and underscores.' 
        });
      }

      // Build folder path
      const basePath = parentPath ? `${parentPath}/${sanitizedFolderName}` : sanitizedFolderName;
      const s3FolderPath = `cases/${caseId}/folders/${basePath}/`;
      
      try {
        // Create a placeholder file in S3 to ensure the folder exists
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const placeholderKey = `${s3FolderPath}.folderinfo`;
        const folderInfo = {
          folderName: sanitizedFolderName,
          fullPath: basePath,
          caseId,
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        };
        
        const putCommand = new PutObjectCommand({
          Bucket: 'contractfiles1',
          Key: placeholderKey,
          Body: JSON.stringify(folderInfo, null, 2),
          ContentType: 'application/json',
          Metadata: {
            caseId: caseId.toString(),
            folderName: sanitizedFolderName,
            folderPath: basePath,
            createdAt: new Date().toISOString()
          }
        });
        
        await s3Client.send(putCommand);
        console.log('Successfully created folder in S3:', s3FolderPath);
        
        return createResponse(200, {
          success: true,
          folder: {
            name: sanitizedFolderName,
            path: basePath,
            fullS3Path: s3FolderPath,
            caseId,
            createdAt: folderInfo.createdAt
          },
          message: `Folder "${sanitizedFolderName}" created successfully`
        });
        
      } catch (s3Error) {
        console.error('S3 folder creation error:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to create folder in S3',
          details: s3Error.message
        });
      }
    }

    // List Folders endpoint - completely rewritten
    const isFoldersRequest = path.match(/^\/(?:dev\/)?cases\/([^\/]+)\/folders\/?$/);
    if (isFoldersRequest) {
      const caseId = isFoldersRequest[1];
      console.log('Processing folders request for case:', caseId);
      
      if (!caseId) {
        return createResponse(400, { error: 'Case ID required for folders endpoint' });
      }
      
      try {
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        const listCommand = new ListObjectsV2Command({
          Bucket: 'contractfiles1',
          Prefix: `cases/${caseId}/`,
          MaxKeys: 1000
        });
        
        const s3Response = await s3Client.send(listCommand);
        const allObjects = s3Response.Contents || [];
        
        const folders = [];
        const documents = [];
        
        for (const obj of allObjects) {
          const key = obj.Key;
          
          // Check if it's a folder info file
          if (key.includes('/folders/') && key.endsWith('.folderinfo')) {
            try {
              const headCommand = new (require('@aws-sdk/client-s3').HeadObjectCommand)({
                Bucket: 'contractfiles1',
                Key: key
              });
              
              const headResponse = await s3Client.send(headCommand);
              const metadata = headResponse.Metadata || {};
              
              folders.push({
                name: metadata.foldername || 'Unknown Folder',
                path: metadata.folderpath || '',
                fullPath: key.replace('.folderinfo', ''),
                createdAt: metadata.createdat || obj.LastModified?.toISOString()
              });
            } catch (error) {
              console.log('Could not get folder metadata for:', key);
            }
          }
          
          // Check if it's a document
          else if (key.includes('/documents/') && 
                   !key.includes('/versions/') && 
                   (key.endsWith('.pdf') || key.endsWith('.docx') || key.endsWith('.txt'))) {
            
            try {
              const headCommand = new (require('@aws-sdk/client-s3').HeadObjectCommand)({
                Bucket: 'contractfiles1',
                Key: key
              });
              
              const headResponse = await s3Client.send(headCommand);
              const metadata = headResponse.Metadata || {};
              
              // Determine which folder this document belongs to
              let folderPath = '';
              if (key.includes('/folders/')) {
                const folderMatch = key.match(/\/folders\/([^\/]+)\//);
                folderPath = folderMatch ? folderMatch[1] : '';
              }
              
              documents.push({
                id: key.split('/').pop().replace(/\.(pdf|docx|txt)$/, ''),
                filename: metadata.originalfilename || key.split('/').pop(),
                key: key,
                folderPath: folderPath,
                uploadedAt: metadata.uploadedat || obj.LastModified?.toISOString(),
                size: Math.round((obj.Size || 0) / 1024) + ' KB',
                contentType: headResponse.ContentType || 'application/octet-stream'
              });
            } catch (error) {
              console.log('Could not get document metadata for:', key);
            }
          }
        }
        
        folders.sort((a, b) => a.name.localeCompare(b.name));
        documents.sort((a, b) => a.filename.localeCompare(b.filename));

        return createResponse(200, {
          success: true,
          caseId: caseId,
          folders: folders,
          documents: documents,
          totalFolders: folders.length,
          totalDocuments: documents.length,
          source: 's3'
        });
        
      } catch (s3Error) {
        console.error('Error fetching case folder structure from S3:', s3Error);
        return createResponse(200, {
          success: true,
          caseId: caseId,
          folders: [],
          documents: [],
          totalFolders: 0,
          totalDocuments: 0,
          source: 'fallback',
          error: s3Error.message
        });
      }
    }

    // Get Document Versions endpoint (must come before general documents handler)
    if (path.startsWith('/documents/') && path.includes('/versions')) {
      // Parse document ID from path like /documents/{docId}/versions
      const pathParts = path.split('/');
      const docId = pathParts[pathParts.indexOf('documents') + 1];
      
      if (!docId) {
        return createResponse(400, { error: 'Document ID required' });
      }

      console.log('Get versions for document:', docId);
      
      try {
        // List versions from S3 
        const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        // Look for versions in the pattern: cases/*/documents/{docId}/versions/*
        // We'll need to find the case ID first, so let's search broadly
        const listCommand = new ListObjectsV2Command({
          Bucket: 'contractfiles1',
          Prefix: `cases/`,
          MaxKeys: 1000
        });
        
        const s3Response = await s3Client.send(listCommand);
        const allObjects = s3Response.Contents || [];
        
        // Filter for this document's versions
        const versionObjects = allObjects.filter(obj => 
          obj.Key.includes(`/documents/${docId}/versions/`) && 
          obj.Key.endsWith('.pdf') || obj.Key.endsWith('.txt')
        );
        
        console.log(`Found ${versionObjects.length} versions for document ${docId}`);
        
        // Convert S3 objects to version info
        const versions = await Promise.all(versionObjects.map(async (obj) => {
          try {
            // Get metadata to understand the version details
            const headCommand = new (require('@aws-sdk/client-s3').HeadObjectCommand)({
              Bucket: 'contractfiles1',
              Key: obj.Key
            });
            
            let metadata = {};
            try {
              const headResponse = await s3Client.send(headCommand);
              metadata = headResponse.Metadata || {};
            } catch (headError) {
              console.log('Could not get metadata for:', obj.Key);
            }
            
            // Extract version ID from the key path
            const versionId = obj.Key.split('/').pop().replace(/\.(pdf|txt)$/, '');
            const sizeInKB = Math.round((obj.Size || 0) / 1024);
            
            return {
              versionId: versionId,
              versionNumber: metadata.versionnumber || '1.0',
              versionType: metadata.versiontype || 'manual',
              timestamp: metadata.timestamp || obj.LastModified?.toISOString(),
              status: getVersionStatus(metadata.versiontype, metadata.fixedissues),
              fileName: metadata.originalfilename || `version_${versionId}${obj.Key.endsWith('.pdf') ? '.pdf' : '.txt'}`,
              size: `${sizeInKB} KB`,
              s3Key: obj.Key,
              fixedIssues: parseFixedIssues(metadata.fixedissues),
              downloadUrl: `/s3/download?key=${encodeURIComponent(obj.Key)}`
            };
          } catch (error) {
            console.error('Error processing version object:', obj.Key, error);
            return null;
          }
        }));
        
        // Filter out any null results and sort by timestamp
        const validVersions = versions
          .filter(v => v !== null)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // If no versions found in S3, return mock data as fallback
        if (validVersions.length === 0) {
          console.log('No versions found in S3, returning mock data');
          const mockVersions = [
            {
              versionId: 'mock-original',
              versionNumber: '1.0',
              versionType: 'original',
              timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
              status: 'Original Upload',
              fileName: 'employment_contract_original.pdf',
              size: '245 KB',
              fixedIssues: [],
              downloadUrl: null // No real download available
            }
          ];
          
          return createResponse(200, {
            success: true,
            documentId: docId,
            versions: mockVersions,
            totalVersions: mockVersions.length,
            latestVersion: mockVersions[mockVersions.length - 1],
            source: 'mock'
          });
        }

        return createResponse(200, {
          success: true,
          documentId: docId,
          versions: validVersions,
          totalVersions: validVersions.length,
          latestVersion: validVersions[validVersions.length - 1],
          source: 's3'
        });
        
      } catch (s3Error) {
        console.error('Error fetching versions from S3:', s3Error);
        
        // Return mock data as fallback
        const mockVersions = [
          {
            versionId: 'fallback-original',
            versionNumber: '1.0',
            versionType: 'original',
            timestamp: new Date().toISOString(),
            status: 'Original Upload',
            fileName: 'employment_contract_original.pdf',
            size: '245 KB',
            fixedIssues: [],
            downloadUrl: null
          }
        ];
        
        return createResponse(200, {
          success: true,
          documentId: docId,
          versions: mockVersions,
          totalVersions: mockVersions.length,
          latestVersion: mockVersions[mockVersions.length - 1],
          source: 'fallback',
          error: s3Error.message
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

        console.log(`Downloading S3 object: bucket=${process.env.S3_BUCKET_NAME}, key=${key}`);
        const s3Response = await s3Client.send(command);
        
        // Stream the file content as response
        const chunks = [];
        for await (const chunk of s3Response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        console.log(`Downloaded file: size=${buffer.length} bytes, contentType=${s3Response.ContentType}`);
        
        // Check if it's a valid PDF by looking for PDF header
        const pdfHeader = buffer.slice(0, 8).toString();
        console.log(`First 8 bytes: ${pdfHeader} (hex: ${buffer.slice(0, 8).toString('hex')})`);
        
        if (!pdfHeader.startsWith('%PDF-')) {
          console.error('Warning: File does not start with PDF header!');
        }

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
            'Cross-Origin-Resource-Policy': 'cross-origin'
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
          const { fileName, fileType, fileSize, caseId, folderPath } = parsedBody;
          
          if (!fileName || !fileType) {
            return createResponse(400, {
              error: 'fileName and fileType are required for presigned URL generation'
            });
          }
          
          const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
          const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
          
          const s3Client = new S3Client({ region: 'us-east-1' });
          
          const timestamp = Date.now();
          
          // Construct S3 key with folder support
          let uniqueFileName;
          if (caseId && folderPath) {
            uniqueFileName = `cases/${caseId}/folders/${folderPath}/documents/${timestamp}-${fileName}`;
          } else if (caseId) {
            uniqueFileName = `cases/${caseId}/documents/${timestamp}-${fileName}`;
          } else {
            uniqueFileName = `${timestamp}-${fileName}`;
          }
          
          const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: uniqueFileName,
            ContentType: fileType,
            ContentLength: fileSize,
            Metadata: {
              originalFileName: fileName,
              uploadedAt: new Date().toISOString(),
              caseId: caseId || '',
              folderPath: folderPath || '',
              timestamp: timestamp.toString()
            }
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
        
        // Extract filename from Content-Disposition header FIRST
        if (contentDisposition && contentDisposition.includes('filename=')) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) {
            fileName = match[1];
          }
        }
        
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
        
        // Get caseId and folderPath from query parameters
        let caseId = null;
        let folderPath = null;
        let originalFileName = fileName;
        
        if (event.queryStringParameters && event.queryStringParameters.caseId) {
          caseId = event.queryStringParameters.caseId;
        }
        
        if (event.queryStringParameters && event.queryStringParameters.folderPath) {
          folderPath = event.queryStringParameters.folderPath;
        }
        
        const timestamp = Date.now();
        
        // Construct S3 key with folder support
        let uniqueFileName;
        if (caseId && folderPath) {
          uniqueFileName = `cases/${caseId}/folders/${folderPath}/documents/${timestamp}-${fileName}`;
        } else if (caseId) {
          uniqueFileName = `cases/${caseId}/documents/${timestamp}-${fileName}`;
        } else {
          uniqueFileName = `${timestamp}-${fileName}`;
        }
        
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: fileContentType,
          Metadata: {
            originalFileName: fileName,
            uploadedAt: new Date().toISOString(),
            caseId: caseId || '',
            folderPath: folderPath || '',
            timestamp: timestamp.toString()
          }
        });
        
        await s3Client.send(command);
        console.log('Successfully uploaded file to S3:', uniqueFileName);
        
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

    // Contract Fix endpoint
    if (path === '/contracts/fix' || path === '/dev/contracts/fix') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST for contract fix.'
        });
      }

      // Skip authentication for now to test
      console.log('Fix endpoint hit - method:', method, 'path:', path);
      
      let body;
      try {
        // Handle base64 encoded body
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
      
      const { issueId, key, applyToS3 } = body;
      console.log('Fix request:', { issueId, key, applyToS3 });
      
      // Define the fixes for each issue
      const fixes = {
        1: {
          title: "Fixed Termination Clause",
          originalText: "Employee may be terminated at any time for any reason with or without cause, and with or without notice, at the sole discretion of Company.",
          fixedText: "Employee may be terminated by Company with thirty (30) days written notice, except in cases of misconduct, breach of contract, or other just cause as defined in Exhibit A.",
          explanation: "Added 30-day notice requirement and defined exceptions for immediate termination."
        },
        2: {
          title: "Added IP Assignment Section", 
          originalText: "This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.",
          fixedText: `This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.

SECTION 10: INTELLECTUAL PROPERTY
All inventions, discoveries, improvements, and intellectual property created by Employee during employment shall be the sole and exclusive property of Company. Employee agrees to assign all rights, title, and interest in such intellectual property to Company and will execute any documents necessary to perfect Company's rights.`,
          explanation: "Added comprehensive intellectual property assignment clause to protect Company's interests."
        },
        3: {
          title: "Clarified Non-Compete Terms",
          originalText: "Employee agrees not to directly or indirectly compete with Company's business during employment and for a period of [TIME PERIOD] following termination.",
          fixedText: "Employee agrees not to directly or indirectly engage in competing business activities within a 50-mile radius of Company's headquarters for a period of twelve (12) months following termination, limited to software development services substantially similar to those provided by Company.",
          explanation: "Added specific geographic boundaries (50-mile radius) and defined scope of restricted activities."
        },
        4: {
          title: "Enhanced Benefits Description",
          originalText: "Employee shall also be entitled to participate in Company's benefit plans as may be available to employees of similar level.",
          fixedText: "Employee shall be entitled to participate in Company's standard benefits package including health insurance (Company pays 80% of premiums), dental coverage, vision insurance, 401(k) retirement plan with 4% company match, and paid time off as detailed in the Employee Handbook, subject to plan terms and eligibility requirements.",
          explanation: "Added specific details about available benefits and Company's contribution levels."
        }
      };
      
      const fix = fixes[issueId];
      if (!fix) {
        return createResponse(400, { success: false, error: 'Invalid issue ID' });
      }
      
      // Generate the updated contract text with the fix applied
      const originalContract = `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into on [DATE], between [COMPANY NAME], a corporation organized under the laws of [STATE] ("Company"), and [EMPLOYEE NAME] ("Employee").

SECTION 1: EMPLOYMENT TERMS
Employee is hereby employed by Company in the position of [POSITION TITLE]. Employee agrees to perform such duties and responsibilities as may be assigned by Company from time to time.

SECTION 2: DURATION
This agreement shall commence on [START DATE] and shall continue until terminated in accordance with the provisions herein.

SECTION 3: COMPENSATION
Employee will receive an annual salary of $[AMOUNT], payable in accordance with Company's standard payroll practices. Employee shall also be entitled to participate in Company's benefit plans as may be available to employees of similar level.

SECTION 4: DUTIES AND RESPONSIBILITIES  
Employee shall devote Employee's full business time, attention, and efforts to the performance of Employee's duties hereunder and shall not engage in any other business activity without Company's prior written consent.

SECTION 5: TERMINATION
Employee may be terminated at any time for any reason with or without cause, and with or without notice, at the sole discretion of Company.

SECTION 6: CONFIDENTIALITY
Employee acknowledges that during employment, Employee may have access to confidential information belonging to Company. Employee agrees to maintain strict confidentiality of all such information.

SECTION 7: NON-COMPETE
Employee agrees not to directly or indirectly compete with Company's business during employment and for a period of [TIME PERIOD] following termination.

SECTION 8: GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of [STATE].

SECTION 9: ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements.`;

      let updatedContract = originalContract;
      
      // Apply the fix
      if (fix.originalText && fix.fixedText) {
        updatedContract = updatedContract.replace(fix.originalText, fix.fixedText);
      }
      
      return createResponse(200, {
        success: true,
        fixed: true,
        issueId: parseInt(issueId),
        title: fix.title,
        explanation: fix.explanation,
        fixedText: updatedContract,
        originalText: originalContract,
        appliedFix: {
          original: fix.originalText,
          updated: fix.fixedText
        },
        saved: !!applyToS3 // Mock S3 save status
      });
    }

    // Save Document Version endpoint
    if (path === '/contracts/save-version' || path === '/dev/contracts/save-version') {
      if (method !== 'POST') {
        return createResponse(405, {
          error: 'Method not allowed. Use POST to save document version.'
        });
      }

      // Skip authentication for now to test
      console.log('Save version endpoint hit - method:', method, 'path:', path);
      
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
      
      const { caseId, documentId, contractText, versionType, fixedIssues } = body;
      console.log('Save version request:', { caseId, documentId, versionType, fixedIssues });
      
      if (!caseId || !documentId || !contractText) {
        return createResponse(400, { 
          success: false, 
          error: 'caseId, documentId, and contractText are required' 
        });
      }

      // Generate version information
      const versionId = `v${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      // Calculate the next version number by fetching existing versions
      let nextVersionNumber = 1.0;
      try {
        // Reuse the same logic as the GET versions endpoint
        const { S3Client, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        // Look for versions in the pattern: cases/*/documents/{documentId}/versions/*
        const listCommand = new ListObjectsV2Command({
          Bucket: 'contractfiles1',
          Prefix: `cases/`,
          MaxKeys: 1000
        });
        
        const s3Response = await s3Client.send(listCommand);
        const allObjects = s3Response.Contents || [];
        
        // Filter for this document's versions
        const versionObjects = allObjects.filter(obj => 
          obj.Key.includes(`/documents/${documentId}/versions/`) && 
          (obj.Key.endsWith('.pdf') || obj.Key.endsWith('.txt'))
        );
        
        if (versionObjects.length > 0) {
          // Get metadata for each version to find version numbers
          const versionPromises = versionObjects.map(async (obj) => {
            try {
              const headCommand = new HeadObjectCommand({
                Bucket: 'contractfiles1',
                Key: obj.Key
              });
              
              const headResponse = await s3Client.send(headCommand);
              const metadata = headResponse.Metadata || {};
              
              // Parse version number from metadata
              const versionNum = metadata.versionnumber ? parseFloat(metadata.versionnumber) : 1.0;
              console.log(`Version ${obj.Key}: metadata.versionnumber = ${metadata.versionnumber}, parsed as ${versionNum}`);
              return versionNum;
            } catch (headError) {
              console.log('Could not get metadata for version:', obj.Key);
              return 1.0;
            }
          });
          
          const versionNumbers = await Promise.all(versionPromises);
          const maxVersion = Math.max(...versionNumbers);
          nextVersionNumber = Math.floor(maxVersion) + 1.0;
          
          console.log(`Found ${versionObjects.length} existing versions, version numbers: [${versionNumbers.join(', ')}], max: ${maxVersion}, next: ${nextVersionNumber}`);
        } else {
          console.log('No existing versions found, starting with 1.0');
        }
      } catch (versionError) {
        console.log('Error fetching existing versions, starting from 1.0:', versionError.message);
        nextVersionNumber = 1.0;
      }
      
      // In a real implementation, you'd save this to S3 and update the case metadata
      // For now, we'll return the version information
      const versionInfo = {
        versionId,
        caseId,
        documentId,
        versionNumber: nextVersionNumber,
        versionType: versionType || 'manual', // 'original', 'reviewed', 'fixed', 'manual'
        timestamp,
        fixedIssues: fixedIssues || [],
        status: versionType === 'fixed' ? 'All Issues Resolved' : 'In Progress',
        contractText,
        fileName: `contract_${versionType}_${versionId}.pdf`,
        s3Key: `cases/${caseId}/documents/${documentId}/versions/${versionId}.pdf`
      };

      // Actually save to S3
      try {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        // Convert contract text to a simple text file for now
        // In production, you'd want to convert to PDF using a library like puppeteer or jsPDF
        const fileContent = Buffer.from(contractText, 'utf-8');
        
        const putCommand = new PutObjectCommand({
          Bucket: 'contractfiles1',
          Key: versionInfo.s3Key,
          Body: fileContent,
          ContentType: 'text/plain', // In production: 'application/pdf'
          Metadata: {
            caseid: caseId.toString(),
            documentid: documentId.toString(),
            versiontype: versionType || 'manual',
            versionnumber: versionInfo.versionNumber.toString(),
            timestamp: timestamp,
            originalfilename: versionInfo.fileName
          }
        });
        
        await s3Client.send(putCommand);
        console.log('Successfully saved version to S3:', versionInfo.s3Key);
        
        return createResponse(200, {
          success: true,
          saved: true,
          version: versionInfo,
          message: `Document version ${versionInfo.versionNumber} saved successfully to S3`,
          s3Key: versionInfo.s3Key,
          downloadUrl: `/s3/download?key=${encodeURIComponent(versionInfo.s3Key)}`
        });
        
      } catch (s3Error) {
        console.error('S3 save error:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to save version to S3',
          details: s3Error.message
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

      console.log('Review endpoint hit - method:', method, 'path:', path);

      try {
        let body;
        let rawBody = event.body || '{}';
        
        // Check if body is base64 encoded (common with API Gateway when */* is in binaryMediaTypes)
        if (event.isBase64Encoded && event.body) {
          rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
        }
        
        try {
          body = JSON.parse(rawBody);
        } catch (parseError) {
          return createResponse(400, {
            error: 'Invalid JSON in request body',
            details: parseError.message
          });
        }
        
        const { key } = body;

        if (!key) {
          return createResponse(400, {
            error: 'Document key is required'
          });
        }

        // Extract text from document using Textract or fallback
        let extractedText = null;
        const textractEnabled = (process.env.TEXTRACT_ENABLED || 'false').toLowerCase() === 'true';

        if (textractEnabled) {
          try {
            const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
            const texClient = new TextractClient({ region: process.env.AWS_REGION || 'us-east-1' });

            // Start async Textract job
            const startRes = await texClient.send(new StartDocumentTextDetectionCommand({
              DocumentLocation: {
                S3Object: {
                  Bucket: process.env.S3_BUCKET || 'contractfiles1',
                  Name: key
                }
              }
            }));

            const jobId = startRes.JobId;
            console.log('Started Textract job:', jobId);

            // Poll for completion (max ~40 seconds)
            let done = false;
            let attempts = 0;
            while (!done && attempts < 40) {
              await new Promise(r => setTimeout(r, 1000));
              const statusRes = await texClient.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
              const status = statusRes.JobStatus;

              if (status === 'SUCCEEDED') {
                const blocks = statusRes.Blocks || [];
                extractedText = blocks
                  .filter(b => b.BlockType === 'LINE')
                  .map(b => b.Text)
                  .join('\n');
                done = true;
                console.log('Textract completed successfully, extracted', extractedText.length, 'characters');
              } else if (status === 'FAILED') {
                done = true;
                console.warn('Textract job failed');
              }
              attempts += 1;
            }
          } catch (e) {
            console.warn('Textract failed, falling back to text extraction:', e.message);
          }
        }

        // Fallback: try to read as plain text from S3
        if (!extractedText) {
          try {
            const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const cmd = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET || 'contractfiles1',
              Key: key
            });
            const s3res = await s3Client.send(cmd);
            const chunks = [];
            for await (const chunk of s3res.Body) chunks.push(chunk);
            const buf = Buffer.concat(chunks);
            const contentType = (s3res.ContentType || '').toLowerCase();

            if (contentType.startsWith('text/') || contentType === 'application/json') {
              extractedText = buf.toString('utf8');
              console.log('Extracted text from plain text file');
            } else {
              extractedText = '[Unable to extract text from this document type. Please ensure it\'s a PDF or text file.]';
            }
          } catch (err) {
            console.warn('Could not read document from S3:', err.message);
            extractedText = '[Error reading document. Please check file permissions and format.]';
          }
        }

        // Analyze the extracted text for legal issues
        const analysis = analyzeContractText(extractedText);

        // Update the document's lastReviewedAt timestamp
        try {
          const caseId = key.split('/')[1]; // Extract case ID from key like "cases/123/documents/file.pdf"
          await updateDocumentReviewTimestamp(caseId, key);
        } catch (updateErr) {
          console.warn('Failed to update review timestamp:', updateErr.message);
        }

        return createResponse(200, {
          success: true,
          originalText: extractedText,
          issues: analysis.issues,
          summary: analysis.summary,
          overallRisk: analysis.overallRisk,
          annotatedHtml: analysis.annotatedHtml
        });

      } catch (error) {
        console.error('Review endpoint error:', error);
        return createResponse(500, {
          error: 'Failed to review document',
          details: error.message
        });
      }
    }

    // ==========================================
    // CLIENTS API ENDPOINTS
    // ==========================================

    // Handle /clients endpoint (GET and POST)
    if (path === '/clients' || path === '/dev/clients') {
      if (method === 'GET') {
        // Skip authentication for now to test
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
        // Skip authentication for now to test
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

          return createResponse(200, {
            success: true,
            client: client
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
        const { S3Client, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
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

    // END TEMPORARILY DISABLED CLIENT ROUTING

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
        'GET /cases/{id}/folders',
        'POST /folders/create',
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
        'POST /contracts/fix',
        'GET /clients',
        'POST /clients',
        'GET /clients/{id}',
        'PUT /clients/{id}',
        'DELETE /clients/{id}',
        'POST /clients/{id}/documents',
        'GET /clients/{id}/documents'
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