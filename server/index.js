const express = require('express');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configure CORS with specific options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow Amplify domains
    if (origin.includes('amplifyapp.com')) return callback(null, true);
    
    // Allow your custom domain if any
    return callback(null, true); // For now, allow all origins in serverless
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Simple request logger for debugging (prints method and path)
app.use((req, res, next) => {
  try {
    console.log(`Incoming request: ${req.method} ${req.path}`);
  } catch (e) {}
  next();
});

// Use environment variables for sensitive data
const cognitoClient = new CognitoIdentityProvider({ 
  region: 'us-east-1'
  // In Lambda, credentials are automatically provided by IAM role
});

// S3 client for presigning uploads
const S3_REGION = 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
const s3Client = new S3Client({ 
  region: S3_REGION
  // In Lambda, credentials are automatically provided by IAM role
});

// Multer setup for parsing multipart/form-data (single file)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// Validate configuration to catch placeholder values early
function validateConfig() {
  const placeholderPatterns = ['<', 'YOUR_', 'REPLACE_ME'];
  if (!CLIENT_ID || placeholderPatterns.some(p => CLIENT_ID.includes(p))) {
    console.error('Invalid COGNITO_CLIENT_ID detected:', CLIENT_ID);
    console.error('Please set a valid COGNITO_CLIENT_ID in server/.env or the environment and restart the server.');
    console.error('Example (macOS zsh):');
    console.error("  export COGNITO_CLIENT_ID=1p3ks3hsp9a9p2jogk8h9km9");
    process.exit(1);
  }

  // Warn if secret looks missing or too short (but don't exit)
  if (!CLIENT_SECRET || CLIENT_SECRET.length < 8) {
    console.warn('COGNITO_CLIENT_SECRET is missing or looks too short. If your app client has a secret, set COGNITO_CLIENT_SECRET in server/.env');
  }
}

// Run configuration validation at startup
validateConfig();

// Function to update Cognito client settings
async function updateCognitoClientSettings() {
  try {
    console.log('Updating Cognito client settings...');
    const updateParams = {
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AccessTokenValidity: 1,
      IdTokenValidity: 1,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_SRP_AUTH',
        // Allow server-side admin flow
        'ALLOW_ADMIN_USER_PASSWORD_AUTH'
      ],
      SupportedIdentityProviders: ['COGNITO'],
      AllowedOAuthFlows: ['code'],
      AllowedOAuthScopes: ['email', 'openid', 'profile'],
      CallbackURLs: ['http://localhost:3000'],
      LogoutURLs: ['http://localhost:3000'],
      PreventUserExistenceErrors: 'ENABLED'
    };

    await cognitoClient.updateUserPoolClient(updateParams);
    console.log('Successfully updated Cognito client settings');
  } catch (error) {
    console.error('Error updating Cognito client settings:', error);
    // Continue running the server even if update fails
  }
}

// Auto-update client settings if explicitly enabled (opt-in)
const AUTO_UPDATE_CLIENT = (process.env.COGNITO_AUTO_UPDATE_CLIENT || 'false').toLowerCase() === 'true';

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      type: err.name || 'ServerError'
    }
  });
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Accept token from Authorization header or fallback to query param `t` (useful for iframe downloads)
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.query && typeof req.query.t === 'string' && req.query.t.trim()) {
      token = req.query.t.trim();
    }
    if (!token) {
      throw { status: 401, message: 'No token provided' };
    }

    const params = {
      AccessToken: token
    };
      const userData = await cognitoClient.getUser(params);
      // Attach user info to the request for downstream checks
      req.user = {
        token,
        username: userData?.Username || null,
        attributes: userData?.UserAttributes || []
      };
    next();
  } catch (error) {
    next({ status: 401, message: 'Invalid token', name: 'AuthenticationError' });
  }
};

// Helper function to calculate secret hash
const crypto = require('crypto');
function calculateSecretHash(username, clientId, clientSecret) {
  return crypto.createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

// Sign up endpoint
app.post('/auth/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const params = {
      ClientId: CLIENT_ID,
      Username: username,
      Password: password,
      SecretHash: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET),
      UserAttributes: [{ Name: 'email', Value: email }]
    };

    const result = await cognitoClient.signUp(params);
    res.json({ success: true, userSub: result.UserSub });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sign in endpoint
app.post('/auth/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: "Username and password are required"
      });
    }

    // Log attempt (without sensitive data)
    console.log(`Signin attempt for user: ${username}`);

    // Verify environment variables
    if (!USER_POOL_ID || !CLIENT_ID) {
      console.error('Missing required environment variables');
      return res.status(500).json({ 
        error: "Server configuration error"
      });
    }

    const params = {
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET)
      }
    };

    console.log('Initiating admin auth with Cognito...');
    console.log('Auth params:', {
      AuthFlow: params.AuthFlow,
      UserPoolId: params.UserPoolId,
      ClientId: params.ClientId,
      USERNAME: params.AuthParameters.USERNAME,
      SECRET_HASH_LENGTH: params.AuthParameters.SECRET_HASH?.length
    });
    let result;
    try {
      result = await cognitoClient.adminInitiateAuth(params);
    } catch (awsErr) {
      // Structured logging for AWS errors
      console.error('Cognito adminInitiateAuth error details:', {
        name: awsErr.name,
        code: awsErr.Code,
        message: awsErr.message,
        type: awsErr.__type,
        statusCode: awsErr.$metadata?.httpStatusCode,
        requestId: awsErr.$metadata?.requestId
      });

      // If admin flow is not enabled for the client, try non-admin flow as a fallback
      const isAuthFlowNotEnabled = awsErr.name === 'InvalidParameterException' && awsErr.message && awsErr.message.includes('Auth flow not enabled');
      const isAccessDenied = awsErr.name === 'AccessDeniedException';
      if (isAuthFlowNotEnabled || isAccessDenied) {
        console.warn('Falling back to USER_PASSWORD_AUTH (non-admin) because admin flow is not available or access denied');
        try {
          const initParams = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: {
              USERNAME: username,
              PASSWORD: password
            }
          };
          if (CLIENT_SECRET) {
            initParams.AuthParameters.SECRET_HASH = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
          }

          const initResult = await cognitoClient.initiateAuth(initParams);
          // If tokens returned
          if (initResult.AuthenticationResult) {
            return res.json({
              success: true,
              accessToken: initResult.AuthenticationResult.AccessToken,
              idToken: initResult.AuthenticationResult.IdToken,
              refreshToken: initResult.AuthenticationResult.RefreshToken
            });
          }

          // Forward challenge if present
          return res.status(200).json({
            success: false,
            challenge: initResult.ChallengeName || null,
            session: initResult.Session || null,
            message: 'Auth challenge returned - additional steps required (non-admin flow)'
          });
        } catch (initErr) {
          console.error('Cognito initiateAuth fallback error:', {
            name: initErr.name,
            message: initErr.message,
            $metadata: initErr.$metadata
          });
          return res.status(400).json({ error: initErr.message || 'Authentication failed (fallback)' });
        }
      }

      return res.status(400).json({ error: awsErr.message || 'Authentication failed' });
    }

    if (!result.AuthenticationResult) {
      console.error('Auth successful but no AuthenticationResult:', result);
      // If Cognito returned a challenge (e.g., NEW_PASSWORD_REQUIRED), forward it to the client
      const challenge = result.ChallengeName || null;
      const session = result.Session || null;
      return res.status(200).json({
        success: false,
        challenge,
        session,
        message: 'Auth challenge returned - additional steps required'
      });
    }

    console.log('Auth successful with tokens');
    res.json({
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken
    });
  } catch (error) {
    // Log full error for diagnostics (do not expose secrets in logs)
    console.error('Sign in error (stack):', error.stack || error);
    // If this was an expected auth error, return 401, otherwise return a structured 500
    const isAuthError = error && (error.name === 'NotAuthorizedException' || error.status === 401);
    if (isAuthError) {
      return res.status(401).json({ error: error.message || 'Unauthorized' });
    }
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        code: 'ServerError'
      }
    });
  }
});

// Confirm signup endpoint
app.post('/auth/confirm', async (req, res) => {
  try {
    const { username, code } = req.body;
    const params = {
      ClientId: CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      SecretHash: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET)
    };

    await cognitoClient.confirmSignUp(params);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: get user (useful for debugging existence & status)
app.post('/auth/admin-get-user', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });

    const params = {
      UserPoolId: USER_POOL_ID,
      Username: username
    };

    const user = await cognitoClient.adminGetUser(params);
    return res.json({ success: true, user });
  } catch (err) {
    console.error('adminGetUser error:', err?.message || err);
    // Return 404 for not found-like errors, otherwise 400
    if (err && (err.name === 'UserNotFoundException' || err.message && err.message.includes('User does not exist'))) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(400).json({ error: err.message || 'Failed to get user' });
  }
});

// Forgot password endpoint
app.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { username } = req.body;
    const params = {
      ClientId: CLIENT_ID,
      Username: username,
      SecretHash: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET)
    };

    await cognitoClient.forgotPassword(params);
    res.json({ 
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    next(error);
  }
});

// Reset password endpoint
app.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { username, code, newPassword } = req.body;
    const params = {
      ClientId: CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      Password: newPassword,
      SecretHash: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET)
    };

    await cognitoClient.confirmForgotPassword(params);
    res.json({ 
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token endpoint
app.post('/auth/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken, username } = req.body;
    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET)
      }
    };

    const result = await cognitoClient.initiateAuth(params);
    res.json({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn
    });
  } catch (error) {
    next(error);
  }
});

// Verify token endpoint
app.get('/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true,
    message: 'Token is valid'
  });
});

// Respond to auth challenge endpoint
app.post('/auth/respond-to-challenge', async (req, res) => {
  try {
    const { username, session, challenge, newPassword } = req.body;

    if (!username || !session || !challenge) {
      return res.status(400).json({ error: 'username, session and challenge are required' });
    }

    const params = {
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
      ChallengeName: challenge,
      Session: session,
      ChallengeResponses: {
        USERNAME: username
      }
    };

    if (challenge === 'NEW_PASSWORD_REQUIRED') {
      if (!newPassword) {
        return res.status(400).json({ error: 'newPassword is required for NEW_PASSWORD_REQUIRED challenge' });
      }
      params.ChallengeResponses.NEW_PASSWORD = newPassword;
      // If client secret exists, include SecretHash
      if (CLIENT_SECRET) {
        params.ChallengeResponses.SECRET_HASH = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
      }
    }

    let result;
    try {
      // Try admin respond first (requires cognito-idp:AdminRespondToAuthChallenge)
      result = await cognitoClient.adminRespondToAuthChallenge(params);
    } catch (awsErr) {
      console.error('adminRespondToAuthChallenge error:', {
        name: awsErr.name,
        message: awsErr.message,
        $metadata: awsErr.$metadata
      });

      // If admin call is not allowed or the client uses user-based flow, try the non-admin RespondToAuthChallenge
      const shouldFallback = awsErr.name === 'AccessDeniedException' ||
        (awsErr.name === 'InvalidParameterException' && awsErr.message && awsErr.message.includes('Auth flow not enabled'));

      if (shouldFallback) {
        try {
          console.warn('Falling back to non-admin respondToAuthChallenge');
          const fallbackParams = {
            ClientId: CLIENT_ID,
            ChallengeName: challenge,
            Session: session,
            ChallengeResponses: {
              USERNAME: username
            }
          };

          if (challenge === 'NEW_PASSWORD_REQUIRED') {
            fallbackParams.ChallengeResponses.NEW_PASSWORD = newPassword;
            if (CLIENT_SECRET) {
              fallbackParams.ChallengeResponses.SECRET_HASH = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
            }
          }

          result = await cognitoClient.respondToAuthChallenge(fallbackParams);
        } catch (fallbackErr) {
          console.error('respondToAuthChallenge (fallback) error:', {
            name: fallbackErr.name,
            message: fallbackErr.message,
            $metadata: fallbackErr.$metadata
          });
          return res.status(400).json({ error: fallbackErr.message || 'Challenge response failed' });
        }
      } else {
        return res.status(400).json({ error: awsErr.message || 'Challenge response failed' });
      }
    }

    if (result.AuthenticationResult) {
      return res.json({ success: true, tokens: result.AuthenticationResult });
    }

    // If there is another challenge (e.g., MFA), forward it
    return res.json({ success: false, challenge: result.ChallengeName, session: result.Session });
  } catch (err) {
    console.error('respond-to-challenge error (stack):', err.stack || err);
    // Return structured error without leaking internal details
    res.status(500).json({
      error: {
        message: 'Internal Server Error',
        code: 'ServerError'
      }
    });
  }
});

// S3 presign endpoint: returns a PUT presigned URL and the object key
console.log('Registering route: POST /s3/presign');
app.post('/s3/presign', authenticateToken, async (req, res) => {
  try {
    const { filename, contentType, folder } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType are required' });
    }

    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'Server S3 bucket not configured. Set S3_BUCKET_NAME in server/.env' });
    }

    // Basic server-side check: ensure folder matches the authenticated user's username
    // Expect folder like `pdfs/<username>`
    if (folder && typeof folder === 'string' && req.user && req.user.username) {
      const parts = folder.split('/');
      const maybeUsername = parts.length > 1 ? parts[1] : null;
      if (maybeUsername && req.user.username && maybeUsername !== req.user.username) {
        return res.status(403).json({ error: 'Folder does not match authenticated user' });
      }
    }
    // Build a key: optional folder (e.g., user-specific), then filename
    const key = folder ? `${folder.replace(/\/$/, '')}/${filename}` : filename;

    // Create a presigned PUT URL using getSignedUrl and PutObjectCommand
    const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes

    return res.json({ url, key, bucket: S3_BUCKET });
  } catch (err) {
    console.error('s3 presign error:', err);
    return res.status(500).json({ error: 'Failed to create presigned URL' });
  }
});

// Server-side upload proxy: receives a file and uploads it to S3 on behalf of the client
console.log('Registering route: POST /s3/upload');
app.post('/s3/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    // Basic validation: only allow PDFs
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'Server S3 bucket not configured. Set S3_BUCKET_NAME in server/.env' });
    }

    // Determine destination key, enforce user folder ownership
    const username = req.user?.username || 'anonymous';
    const safeFilename = (file.originalname || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `pdfs/${username}/${safeFilename}`;

    const putParams = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    await s3Client.send(new PutObjectCommand(putParams));

    // If a caseId was provided in the multipart/form-data, attach document metadata
    const caseId = req.body && req.body.caseId;
    if (caseId) {
      const cases = readCases();
      const csIndex = cases.findIndex(c => c.id === caseId && c.owner === req.user.username);
      if (csIndex !== -1) {
        const docMeta = {
          id: `doc_${Date.now()}`,
          key,
          bucket: S3_BUCKET,
          filename: file.originalname,
          contentType: file.mimetype,
          uploadedAt: new Date().toISOString()
        };
        cases[csIndex].documents.push(docMeta);
        writeCases(cases);
      }
    }

    return res.json({ success: true, key, bucket: S3_BUCKET, urlPath: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(key)}` });
  } catch (err) {
    console.error('s3 upload proxy error:', err);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

// S3 presign GET endpoint: returns a short-lived presigned GET URL for private downloads
console.log('Registering route: GET /s3/presign-get');
app.get('/s3/presign-get', authenticateToken, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'key query parameter is required' });
    if (!S3_BUCKET) return res.status(500).json({ error: 'Server S3 bucket not configured' });

    const username = req.user?.username;
    let allowed = false;

    // Allow if the object is inside the user's own folder (pdfs/<username>/...)
    if (username && key.startsWith(`pdfs/${username}/`)) {
      allowed = true;
    }

    // Otherwise, check cases metadata to see if the requesting user owns the case/document
    if (!allowed) {
      try {
        const cases = readCases();
        for (const c of cases) {
          if (c.owner !== username) continue;
          if (!Array.isArray(c.documents)) continue;
          const found = c.documents.find(d => d.key === key);
          if (found) { allowed = true; break; }
        }
      } catch (e) {
        console.warn('Error while checking cases for presign-get ownership:', e);
      }
    }

    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3Client, cmd, { expiresIn: 300 }); // 5 minutes
    return res.json({ url });
  } catch (err) {
    console.error('s3 presign-get error:', err);
    return res.status(500).json({ error: 'Failed to create presigned GET URL' });
  }
});

// S3 download proxy: stream object through server when presign or direct access fails
console.log('Registering route: GET /s3/download');
app.get('/s3/download', authenticateToken, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'key query parameter is required' });
    if (!S3_BUCKET) return res.status(500).json({ error: 'Server S3 bucket not configured' });

    const username = req.user?.username;
    let allowed = false;
    if (username && key.startsWith(`pdfs/${username}/`)) allowed = true;
    if (!allowed) {
      // Allow if key is within a user-owned case path
      const m = /^cases\/([^/]+)\//.exec(key);
      if (m && m[1]) {
        const caseIdFromKey = m[1];
        const cases = readCases();
        const cs = cases.find(c => c.id === caseIdFromKey);
        if (cs && cs.owner === username) {
          allowed = true;
        }
      }
    }
    if (!allowed) {
      const cases = readCases();
      for (const c of cases) {
        if (c.owner !== username) continue;
        if (!Array.isArray(c.documents)) continue;
        const found = c.documents.find(d => d.key === key);
        if (found) { allowed = true; break; }
      }
    }
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const s3res = await s3Client.send(cmd);

    // Set headers from S3 response where available
    if (s3res.ContentType) res.setHeader('Content-Type', s3res.ContentType);
    if (s3res.ContentLength) res.setHeader('Content-Length', s3res.ContentLength);
    if (s3res.ETag) res.setHeader('ETag', s3res.ETag);
    
    // Set Content-Disposition to inline for PDFs to enable browser preview
    if (s3res.ContentType === 'application/pdf') {
      res.setHeader('Content-Disposition', 'inline');
    }

    // s3res.Body is a stream
    s3res.Body.pipe(res);
  } catch (err) {
    console.error('s3 download proxy error:', err && err.message ? err.message : err);
    if (err && err.name) console.error('S3 error name:', err.name);
    if (err && err.$metadata) console.error('S3 $metadata:', JSON.stringify(err.$metadata));
    // If it's an S3 access error, surface 403
    if (err && err.$metadata && err.$metadata.httpStatusCode === 403) {
      return res.status(403).json({ error: 'Access denied when fetching from S3' });
    }
    return res.status(500).json({ error: 'Failed to download file' });
  }
});

// DELETE endpoint to remove an object and its metadata from a case
console.log('Registering route: DELETE /s3/object');
app.delete('/s3/object', authenticateToken, express.json(), async (req, res) => {
  try {
    // accept key either in body or query string
    const body = req.body || {};
    const key = body.key || req.query.key;
    const caseId = body.caseId || req.query.caseId;
    console.log('Delete request body/query:', { bodyLogged: { ...body, key: undefined }, query: req.query });
    if (!key) return res.status(400).json({ error: 'key is required' });
    const username = req.user?.username;

    // Ownership check (must belong to user or be in their case)
    let allowed = false;
    if (username && key.startsWith(`pdfs/${username}/`)) allowed = true;
    const cases = readCases();
    if (!allowed && caseId) {
      const cs = cases.find(c => c.id === caseId && c.owner === username);
      if (cs && Array.isArray(cs.documents) && cs.documents.find(d => d.key === key)) allowed = true;
    }
    if (!allowed) return res.status(403).json({ error: 'forbidden' });

    // Delete from S3
    const { DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
    // Verify object exists first (if not, return 404 so UI can reflect it)
    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      // If HeadObject succeeds, proceed to delete
      await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    } catch (headErr) {
      // If object doesn't exist, remove metadata and return success (idempotent delete)
      console.warn('HeadObject/DeleteObject error:', headErr && headErr.message ? headErr.message : headErr);
      if (headErr && headErr.$metadata && headErr.$metadata.httpStatusCode === 404) {
        console.warn('S3 object not found; will remove metadata only');
        // Remove metadata from any cases that reference it
        let modified = false;
        for (const c of cases) {
          const before = c.documents ? c.documents.length : 0;
          c.documents = (c.documents || []).filter(d => d.key !== key);
          if (c.documents.length !== before) modified = true;
        }
        if (modified) writeCases(cases);
        return res.json({ success: true, note: 'object-not-found-metadata-removed' });
      }
      if (headErr && headErr.$metadata && headErr.$metadata.httpStatusCode === 403) {
        return res.status(403).json({ error: 'access denied to object' });
      }
      throw headErr;
    }

    // Remove metadata from any cases that reference it
    let modified = false;
    for (const c of cases) {
      const before = c.documents ? c.documents.length : 0;
      c.documents = (c.documents || []).filter(d => d.key !== key);
      if (c.documents.length !== before) modified = true;
    }
    if (modified) writeCases(cases);

    return res.json({ success: true });
  } catch (err) {
    console.error('s3 delete error:', err);
    return res.status(500).json({ error: 'Failed to delete object' });
  }
});

// Contract review endpoint (lightweight/demo heuristic + optional AWS AI integration)
console.log('Registering route: POST /contracts/review');
app.post('/contracts/review', authenticateToken, express.json(), async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key is required' });

    // Try to fetch object metadata and (optionally) content
    if (!S3_BUCKET) return res.status(500).json({ error: 'Server S3 bucket not configured' });
    // Attempt real extraction via Textract when enabled; otherwise fall back to reading text or heuristics
    let extractedText = null;
    const textractEnabled = (process.env.TEXTRACT_ENABLED || 'false').toLowerCase() === 'true';
    if (textractEnabled) {
      try {
        const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');
        const texClient = new TextractClient({ region: S3_REGION });
        // Start async job (works for PDFs in S3)
        const startRes = await texClient.send(new StartDocumentTextDetectionCommand({ DocumentLocation: { S3Object: { Bucket: S3_BUCKET, Name: key } } }));
        const jobId = startRes.JobId;
        // Poll for completion (max ~40s)
        let done = false;
        let attempts = 0;
        while (!done && attempts < 40) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 1000));
          // eslint-disable-next-line no-await-in-loop
          const statusRes = await texClient.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
          const status = statusRes.JobStatus;
          if (status === 'SUCCEEDED') {
            // collect text blocks
            const blocks = statusRes && statusRes.Blocks ? statusRes.Blocks : [];
            extractedText = (blocks.filter(b => b.BlockType === 'LINE').map(b => b.Text)).join('\n');
            done = true;
            break;
          }
          if (status === 'FAILED') {
            done = true; break;
          }
          attempts += 1;
        }
      } catch (e) {
        console.warn('Textract call failed, falling back to heuristics:', e && e.message ? e.message : e);
        extractedText = null;
      }
    }

    // If textract did not run or produced nothing, attempt to read plain text from S3
    if (!extractedText) {
      try {
        const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
        const s3res = await s3Client.send(cmd);
        const chunks = [];
        for await (const chunk of s3res.Body) chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        const ct = (s3res.ContentType || '').toLowerCase();
        if (ct.startsWith('text/') || ct === 'application/json') {
          extractedText = buf.toString('utf8');
        }
      } catch (err) {
        console.warn('Could not read object for review (will use heuristic):', err && err.message ? err.message : err);
      }
    }

    // Simple heuristic analyzer if no extraction available (or as quick demo)
    const sampleText = extractedText || `This is a demo contract extracted from ${key}.
It contains several clauses. The parties SHALL be responsible for any loss.
The company disclaims liability without limitation. The term is indefinite and ambiguous.`;

    // If Bedrock is enabled, ask the LLM to analyze and produce structured issues
    const bedrockEnabled = (process.env.BEDROCK_ENABLED || 'false').toLowerCase() === 'true';
    if (bedrockEnabled && extractedText) {
      try {
        // dynamic import so server doesn't crash if package missing
        const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        const br = new BedrockRuntimeClient({ region: S3_REGION });
        const modelId = process.env.BEDROCK_MODEL || 'anthropic.claude-3-opus-20240229-v1:0';
        const prompt = `Analyze the following contract and return a JSON array of issues with keys: id, type, snippet, suggestion.\n\n${extractedText}`;
        const invokeCmd = new InvokeModelCommand({ modelId, body: Buffer.from(prompt), contentType: 'text/plain' });
        const out = await br.send(invokeCmd);
        // attempt to parse output body (may be a stream)
        let bodyText = '';
        for await (const chunk of out.body) bodyText += chunk.toString('utf8');
        try {
          const parsed = JSON.parse(bodyText);
          // Also include originalText and annotatedHtml if possible so frontend can render highlights
          let annotatedHtmlFromBedrock = null;
          try {
            // Build a simple annotated HTML if issues include index/length or snippet
            const issuesForAnnot = Array.isArray(parsed) ? parsed : [];
            if (extractedText && issuesForAnnot.length > 0) {
              const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              const sorted = issuesForAnnot.filter(i => typeof i.index === 'number' && typeof i.length === 'number').slice().sort((a, b) => a.index - b.index);
              if (sorted.length > 0) {
                let out = '';
                let last = 0;
                for (const it of sorted) {
                  const start = Math.max(0, it.index);
                  const end = Math.min(extractedText.length, it.index + it.length);
                  if (start > last) out += escapeHtml(extractedText.slice(last, start));
                  const snippet = escapeHtml(extractedText.slice(start, end));
                  const title = escapeHtml(it.suggestion || '');
                  out += `<mark data-issue-id="${escapeHtml(it.id || '')}" title="${title}" style="background:#fff59d;padding:0 2px;border-radius:2px;">${snippet}</mark>`;
                  last = end;
                }
                if (last < extractedText.length) out += escapeHtml(extractedText.slice(last));
                annotatedHtmlFromBedrock = out.replace(/\n/g, '<br/>');
              }
            }
          } catch (e) {
            console.warn('Failed to build annotatedHtml from Bedrock parse:', e && e.message ? e.message : e);
            annotatedHtmlFromBedrock = null;
          }

          return res.json({ success: true, issues: parsed, sampleTextAvailable: true, originalText: extractedText || null, annotatedHtml: annotatedHtmlFromBedrock });
        } catch (parseErr) {
          console.warn('Bedrock returned non-JSON response, falling back to heuristics');
        }
      } catch (e) {
        console.warn('Bedrock analysis failed, falling back to heuristics:', e && e.message ? e.message : e);
      }
    }

  // Heuristic fallback: simple pattern checks with severity levels
  const issues = [];
    const checks = [
      { id: 'ambiguous-term', pattern: /indefinite|ambiguous|unclear/ig, suggestion: 'Clarify the term length or criteria (e.g., "Term: 12 months")', severity: 'high' },
      { id: 'shall-passive', pattern: /\bSHALL\b|\bshall\b/ig, suggestion: 'Replace "shall" with active, clear obligations like "must" or "will" and specify who is responsible.', severity: 'medium' },
      { id: 'no-liability', pattern: /disclaims liability|without limitation/ig, suggestion: 'Limit liability or specify caps/exclusions to avoid unenforceable blanket disclaimers.', severity: 'high' }
    ];

    checks.forEach((chk) => {
      let m;
      const hay = sampleText;
      while ((m = chk.pattern.exec(hay)) !== null) {
        const idx = m.index;
        const snippet = hay.substr(Math.max(0, idx - 30), Math.min(160, hay.length - idx + 30));
        issues.push({ 
          id: `${chk.id}_${idx}`, 
          type: chk.id, 
          index: idx, 
          length: m[0].length, 
          snippet: snippet.trim(), 
          suggestion: chk.suggestion,
          severity: chk.severity
        });
      }
    });

    if (issues.length === 0) {
      issues.push({ 
        id: 'none', 
        type: 'info', 
        snippet: sampleText.substr(0, 200), 
        suggestion: 'No obvious issues found with quick heuristics. For a deeper review enable Textract/Bedrock.',
        severity: 'low'
      });
    }

    // Try to produce annotated HTML of the document with highlighted snippets
    let annotatedHtml = null;
    try {
      if (sampleText && issues && issues.length > 0 && issues.every(i => typeof i.index === 'number' && typeof i.length === 'number')) {
        // Escape HTML helper
        const escapeHtml = (str) => {
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

        const sorted = issues.filter(i => i.type !== 'info').slice().sort((a, b) => a.index - b.index);
        let out = '';
        let last = 0;
        for (const it of sorted) {
          const start = Math.max(0, it.index);
          const end = Math.min(sampleText.length, it.index + it.length);
          if (start > last) {
            out += escapeHtml(sampleText.slice(last, start));
          }
          const snippet = escapeHtml(sampleText.slice(start, end));
          const title = escapeHtml(it.suggestion || '');
          out += `<mark data-issue-id="${escapeHtml(it.id)}" title="${title}" style="background:#fff59d;padding:0 2px;border-radius:2px;">${snippet}</mark>`;
          last = end;
        }
        if (last < sampleText.length) out += escapeHtml(sampleText.slice(last));
        // Preserve line breaks
        annotatedHtml = out.replace(/\n/g, '<br/>');
      }
    } catch (e) {
      console.warn('Failed to build annotatedHtml:', e && e.message ? e.message : e);
      annotatedHtml = null;
    }

    // Update document's lastReviewedAt timestamp
    try {
      // Extract case ID and document ID from the key
      const keyParts = key.split('/');
      if (keyParts.length >= 4 && keyParts[0] === 'cases' && keyParts[2] === 'documents') {
        const caseId = keyParts[1];
        const documentId = keyParts[3].split('.')[0]; // Remove file extension
        
        // Read cases and update the document's lastReviewedAt
        const cases = readCases();
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex !== -1) {
          const docIndex = cases[caseIndex].documents?.findIndex(d => d.id === documentId || d.filename === documentId + '.pdf');
          if (docIndex !== -1 && cases[caseIndex].documents[docIndex]) {
            cases[caseIndex].documents[docIndex].lastReviewedAt = new Date().toISOString();
            writeCases(cases);
            console.log(`Updated lastReviewedAt for document ${documentId} in case ${caseId}`);
          }
        }
      }
    } catch (updateErr) {
      console.warn('Failed to update lastReviewedAt:', updateErr);
    }

    return res.json({ success: true, issues, sampleTextAvailable: !!extractedText, originalText: sampleText, annotatedHtml });
  } catch (err) {
    console.error('contracts review error:', err);
    return res.status(500).json({ error: 'Failed to analyze contract' });
  }
});

// Contract fix endpoint - returns proposed fixed text and can optionally save a .txt copy to S3
console.log('Registering route: POST /contracts/fix');
app.post('/contracts/fix', authenticateToken, express.json(), async (req, res) => {
  try {
    const { key, issueId, applyToS3 } = req.body || {};
    if (!key) return res.status(400).json({ error: 'key is required' });

    // Fetch content if possible (same approach as review)
    let originalText = null;
    try {
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
      const s3res = await s3Client.send(cmd);
      const chunks = [];
      for await (const chunk of s3res.Body) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      const ct = (s3res.ContentType || '').toLowerCase();
      if (ct.startsWith('text/') || ct === 'application/json') {
        originalText = buf.toString('utf8');
      }
    } catch (e) {
      console.warn('Could not read object for fix:', e && e.message ? e.message : e);
    }

    // If no original text, create a demo base
    const base = originalText || `Demo contract text for ${key}. The parties SHALL do things. The company disclaims liability without limitation.`;

    // If Bedrock enabled, ask the model to produce a corrected version
    const bedrockEnabled = (process.env.BEDROCK_ENABLED || 'false').toLowerCase() === 'true';
    let fixed = null;
    if (bedrockEnabled && base) {
      try {
        const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        const br = new BedrockRuntimeClient({ region: S3_REGION });
        const modelId = process.env.BEDROCK_MODEL || 'anthropic.claude-3-opus-20240229-v1:0';
        const prompt = `Produce a corrected version of the following contract text. Keep legal meaning but make suggestions to fix issues. Return only the corrected text.\n\n${base}`;
        const invokeCmd = new InvokeModelCommand({ modelId, body: Buffer.from(prompt), contentType: 'text/plain' });
        const out = await br.send(invokeCmd);
        let bodyText = '';
        for await (const chunk of out.body) bodyText += chunk.toString('utf8');
        fixed = bodyText || null;
      } catch (e) {
        console.warn('Bedrock fix failed, falling back to heuristic replacements:', e && e.message ? e.message : e);
        fixed = null;
      }
    }

    // Heuristic fallback fixer
    if (!fixed) {
      fixed = base.replace(/\bSHALL\b|\bshall\b/g, 'must');
      fixed = fixed.replace(/disclaims liability without limitation/ig, 'disclaims liability only to the extent permitted by law and subject to a liability cap of $100,000');
      fixed = fixed.replace(/indefinite|ambiguous|unclear/ig, 'please specify a definite term, e.g. 12 months');
    }

    // Optionally save to S3 as a text file
    let saved = null;
    if (applyToS3) {
      try {
        const path = require('path');
        const newKey = key.replace(/\.[^/.]+$/, '') + '_fixed.txt';
        const put = new PutObjectCommand({ Bucket: S3_BUCKET, Key: newKey, Body: Buffer.from(fixed, 'utf8'), ContentType: 'text/plain' });
        await s3Client.send(put);
        const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(newKey)}`;
        // Attach metadata to the case if possible
        const cases = readCases();
        for (const c of cases) {
          if (!Array.isArray(c.documents)) continue;
          const found = c.documents.find(d => d.key === key);
          if (found) {
            const docMeta = { id: `doc_${Date.now()}`, key: newKey, bucket: S3_BUCKET, filename: path.basename(newKey), contentType: 'text/plain', uploadedAt: new Date().toISOString() };
            c.documents.push(docMeta);
            saved = { key: newKey, url };
            break;
          }
        }
        writeCases(cases);
      } catch (e) {
        console.warn('Failed to save fixed text to S3:', e && e.message ? e.message : e);
      }
    }

    return res.json({ success: true, fixedText: fixed, saved });
  } catch (err) {
    console.error('contracts fix error:', err);
    return res.status(500).json({ error: 'Failed to produce fix' });
  }
});

// Simple case folders/documents listing (maps from cases store and optionally S3)
console.log('Registering route: GET /case-folders/:id');
app.get('/case-folders/:id', authenticateToken, async (req, res) => {
  try {
    const caseId = req.params.id;
    const username = req.user?.username;
    
    // Try to list S3 objects under cases/<caseId>/documents first
    let s3Docs = [];
    if (S3_BUCKET) {
      try {
        const prefix = `cases/${caseId}/documents/`;
        console.log(`Listing S3 objects with prefix: ${prefix}`);
        const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix }));
        s3Docs = (listRes && listRes.Contents) ? listRes.Contents.map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified })) : [];
        console.log(`Found ${s3Docs.length} S3 objects:`, s3Docs.map(d => d.key));
      } catch (e) {
        console.warn('ListObjects failed for case documents:', e && e.message ? e.message : e);
      }
    }
    
    // If we found S3 documents, create documents from them directly
    if (s3Docs.length > 0) {
      const path = require('path');
      const documents = s3Docs.map((s3Doc, index) => {
        const filename = path.basename(s3Doc.key);
        return {
          id: `s3_doc_${index}`,
          filename,
          key: s3Doc.key,
          folderPath: '',
          uploadedAt: s3Doc.lastModified ? s3Doc.lastModified.toISOString() : new Date().toISOString(),
          lastReviewedAt: null, // Will be set when document is reviewed
          size: s3Doc.size,
          contentType: filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
        };
      });
      console.log(`Returning ${documents.length} documents from S3`);
      return res.json({ folders: [], documents });
    }

    // Fallback to local case metadata if no S3 documents found
    const cases = readCases();
    const cs = cases.find(c => c.id === caseId);
    if (!cs) return res.status(404).json({ error: 'case not found' });
    if (cs.owner !== username) return res.status(403).json({ error: 'forbidden' });

    const path = require('path');
    const findKeyForFilename = (name) => {
      if (!name || !s3Docs.length) return null;
      const lower = String(name).toLowerCase();
      // Direct suffix match under the documents/ folder
      const direct = s3Docs.find(d => d.key && d.key.toLowerCase().endsWith('/' + lower));
      if (direct) return direct.key;
      // Match just the basename, accounting for possible timestamp prefixes like 12345-<filename>
      const byBase = s3Docs.find(d => {
        const base = require('path').basename(d.key || '').toLowerCase();
        if (!base) return false;
        if (base === lower) return true;
        // Allow "<digits>-filename.ext"
        return /^\d+-/.test(base) && base.endsWith('-' + lower);
      });
      return byBase ? byBase.key : null;
    };

    const documents = (cs.documents || []).map((d) => {
      const filename = d.filename || d.name || (d.key ? path.basename(d.key) : (d.urlPath || d.url ? path.basename((d.urlPath || d.url).split('?')[0]) : null)) || 'document.pdf';
      let key = d.key || d.s3Key || null;
      if (!key && filename) {
        const guessed = findKeyForFilename(filename);
        if (guessed) key = guessed;
      }
      return {
        id: d.id || d.documentId || `doc_${Date.now()}`,
        filename,
        key,
        folderPath: d.folderPath || '',
        uploadedAt: d.uploadedAt || new Date().toISOString(),
        lastReviewedAt: d.lastReviewedAt || null,
        size: d.size || undefined,
        contentType: d.contentType || d.mimetype || undefined
      };
    });

    return res.json({ folders: [], documents });
  } catch (err) {
    console.error('case-folders error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Failed to load folders/documents' });
  }
});

// Debug: inspect app._router immediately after route registration
try {
  console.log('Post-registration router stack length:', (app._router && app._router.stack && app._router.stack.length) || 0);
} catch (e) {
  console.warn('Could not inspect router after registration:', e.message || e);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, 'data');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');

function readCases() {
  try {
    const raw = fs.readFileSync(CASES_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function writeCases(cases) {
  try {
    fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write cases file:', e);
    return false;
  }
}

// Cases endpoints
console.log('Registering route: GET /cases');
app.get('/cases', authenticateToken, (req, res) => {
  const username = req.user?.username;
  const cases = readCases().filter(c => c.owner === username);
  res.json(cases);
});

console.log('Registering route: POST /cases');
app.post('/cases', authenticateToken, express.json(), (req, res) => {
  const username = req.user?.username;
  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title is required' });
  const cases = readCases();
  const id = `case_${Date.now()}`;
  const newCase = { id, title, description: description || '', owner: username, documents: [] };
  cases.push(newCase);
  if (!writeCases(cases)) return res.status(500).json({ error: 'failed to save case' });
  res.status(201).json(newCase);
});

console.log('Registering route: GET /cases/:id');
app.get('/cases/:id', authenticateToken, (req, res) => {
  const username = req.user?.username;
  const cases = readCases();
  const cs = cases.find(c => c.id === req.params.id);
  if (!cs) return res.status(404).json({ error: 'case not found' });
  if (cs.owner !== username) return res.status(403).json({ error: 'forbidden' });
  res.json(cs);
});

// DELETE a case and its associated S3 objects (best-effort)
console.log('Registering route: DELETE /cases/:id');
app.delete('/cases/:id', authenticateToken, async (req, res) => {
  try {
    const username = req.user?.username;
    const cases = readCases();
    const idx = cases.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'case not found' });
    const cs = cases[idx];
    if (cs.owner !== username) return res.status(403).json({ error: 'forbidden' });

    // Attempt to delete associated S3 objects (best-effort)
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      for (const doc of cs.documents || []) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: doc.key }));
        } catch (e) {
          // Log and continue - don't fail the whole case deletion if S3 delete fails
          console.warn('Failed to delete S3 object during case deletion:', doc.key, e && e.message ? e.message : e);
        }
      }
    } catch (e) {
      console.warn('Error while attempting S3 deletions for case:', e && e.message ? e.message : e);
    }

    // Remove case from store
    cases.splice(idx, 1);
    if (!writeCases(cases)) return res.status(500).json({ error: 'failed to save cases' });
    return res.json({ success: true });
  } catch (err) {
    console.error('delete case error:', err);
    return res.status(500).json({ error: 'Failed to delete case' });
  }
});

// Use error handling middleware (register after all routes)
app.use(errorHandler);

// Export the Express app for Lambda use
module.exports = app;

// Start server only when not running in Lambda environment
if (require.main === module) {
  // Start server
  async function startServer() {
    try {
      console.log('Environment Check:');
      console.log('AWS_REGION:', process.env.AWS_REGION);
      console.log('AWS_ACCESS_KEY_ID (length):', process.env.AWS_ACCESS_KEY_ID?.length || 0);
      console.log('AWS_SECRET_ACCESS_KEY (length):', process.env.AWS_SECRET_ACCESS_KEY?.length || 0);
      console.log('COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID);
      console.log('COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID);

      // Start the server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Server URL: http://localhost:${PORT}`);
        console.log('Available endpoints:');
        console.log('- POST /auth/signin');
        console.log('- POST /auth/signup');
        console.log('- POST /auth/confirm');
        console.log('- GET /health');
        // Print registered routes for debugging (stack length and kinds)
        try {
          const stack = (app._router && app._router.stack) || [];
          console.log('Router stack length:', stack.length);
          const details = stack.map((s, i) => {
            return {
              index: i,
              name: s.name || (s.handle && s.handle.name) || null,
              routePath: s.route && s.route.path,
              methods: s.route && s.route.methods
            };
          });
          console.log('Router stack details:', JSON.stringify(details, null, 2));
        } catch (e) {
          console.warn('Could not enumerate routes:', e.message || e);
        }
      });
      // Optionally update client settings if enabled
      if (AUTO_UPDATE_CLIENT) {
        try {
          await updateCognitoClientSettings();
        } catch (err) {
          console.error('Failed to auto-update Cognito client settings:', err);
        }
      }
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }

  startServer();
}