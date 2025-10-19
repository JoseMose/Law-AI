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

    // Auth Sign In endpoint
    if ((path === '/auth/signin' || path === '/dev/auth/signin') && method === 'POST') {
      console.log('Sign in endpoint hit');
      
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

      const { username, password } = body;
      
      if (!username || !password) {
        return createResponse(400, {
          success: false,
          error: 'Username and password are required'
        });
      }

      try {
        const { AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
        
        const params = {
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          ClientId: CLIENT_ID,
          UserPoolId: USER_POOL_ID,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        };

        if (CLIENT_SECRET) {
          params.AuthParameters.SECRET_HASH = getSecretHash(username, CLIENT_ID, CLIENT_SECRET);
        }

        const command = new AdminInitiateAuthCommand(params);
        const response = await cognitoClient.send(command);

        if (response.ChallengeName) {
          return createResponse(200, {
            success: false,
            challenge: response.ChallengeName,
            session: response.Session,
            challengeParameters: response.ChallengeParameters,
            message: 'Challenge required'
          });
        }

        return createResponse(200, {
          success: true,
          accessToken: response.AuthenticationResult.AccessToken,
          idToken: response.AuthenticationResult.IdToken,
          refreshToken: response.AuthenticationResult.RefreshToken
        });
      } catch (authError) {
        console.error('Auth error:', authError);
        
        if (authError.name === 'NotAuthorizedException' || authError.name === 'UserNotFoundException') {
          return createResponse(401, {
            success: false,
            error: 'Invalid username or password'
          });
        }
        
        return createResponse(500, {
          success: false,
          error: 'Authentication failed',
          details: authError.message
        });
      }
    }

    // Auth Sign Up endpoint
    if ((path === '/auth/signup' || path === '/dev/auth/signup') && method === 'POST') {
      console.log('Sign up endpoint hit');
      
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

      const { username, password, email } = body;
      
      if (!username || !password) {
        return createResponse(400, {
          success: false,
          error: 'Username and password are required'
        });
      }

      try {
        const { SignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
        
        const params = {
          ClientId: CLIENT_ID,
          Username: username,
          Password: password,
          UserAttributes: [
            {
              Name: 'email',
              Value: email || `${username}@example.com`
            }
          ]
        };

        if (CLIENT_SECRET) {
          params.SecretHash = getSecretHash(username, CLIENT_ID, CLIENT_SECRET);
        }

        const command = new SignUpCommand(params);
        await cognitoClient.send(command);

        return createResponse(200, {
          success: true,
          message: 'User created successfully. Please check your email for verification.'
        });
      } catch (signUpError) {
        console.error('Sign up error:', signUpError);
        
        if (signUpError.name === 'UsernameExistsException') {
          return createResponse(400, {
            success: false,
            error: 'Username already exists'
          });
        }
        
        return createResponse(500, {
          success: false,
          error: 'Sign up failed',
          details: signUpError.message
        });
      }
    }

    // Case Events endpoint - timeline of case activities (MUST come before /cases/:id)
    if ((path.match(/^\/cases\/[^\/]+\/events$/) || path.match(/^\/dev\/cases\/[^\/]+\/events$/)) && method === 'GET') {
      const caseId = path.match(/^\/(?:dev\/)?cases\/([^\/]+)\/events$/)[1];
      console.log('Get case events endpoint hit for:', caseId);
      
      // Return empty events for now - can populate from S3 later
      const events = [];

      return createResponse(200, {
        success: true,
        events: events
      });
    }

    // Cases GET by ID endpoint
    if ((path.match(/^\/cases\/[^\/]+$/) || path.match(/^\/dev\/cases\/[^\/]+$/)) && method === 'GET') {
      const caseId = path.match(/^\/(?:dev\/)?cases\/([^\/]+)$/)[1];
      console.log('Get case by ID endpoint hit for:', caseId);
      
      const s3Cases = await loadCasesFromS3();
      const foundCase = s3Cases.find(c => c.id === caseId);

      if (foundCase) {
        return createResponse(200, {
          success: true,
          case: foundCase
        });
      } else {
        return createResponse(404, {
          success: false,
          error: 'Case not found',
          caseId: caseId
        });
      }
    }

    // Cases GET all endpoint
    if ((path === '/cases' || path === '/dev/cases' || path === '/auth/cases' || path === '/dev/auth/cases') && method === 'GET') {
      console.log('Get cases endpoint hit');
      const s3Cases = await loadCasesFromS3();

      return createResponse(200, {
        success: true,
        cases: s3Cases,
        total: s3Cases.length
      });
    }

    // Cases POST endpoint
    if ((path === '/cases' || path === '/dev/cases' || path === '/auth/cases' || path === '/dev/auth/cases') && method === 'POST') {
      console.log('Create case endpoint hit');

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

      const caseId = `case-${Date.now()}`;
      const now = new Date().toISOString();

      const newCase = {
        id: caseId,
        ...body,
        created_at: now,
        updated_at: now
      };

      const existingCases = await loadCasesFromS3();
      existingCases.push(newCase);
      await saveCasesToS3(existingCases);

      // If case has a client or clientId, link it to the client
      const clientId = newCase.clientId || newCase.client_id || newCase.client;
      if (clientId) {
        try {
          const clients = await loadClientsFromS3();
          const clientIndex = clients.findIndex(c => c.id === clientId);
          
          if (clientIndex !== -1) {
            // Initialize linked_cases if it doesn't exist
            if (!clients[clientIndex].linked_cases) {
              clients[clientIndex].linked_cases = [];
            }
            
            // Add case to client's linked_cases if not already there
            if (!clients[clientIndex].linked_cases.includes(caseId)) {
              clients[clientIndex].linked_cases.push(caseId);
              clients[clientIndex].activeCases = (clients[clientIndex].activeCases || 0) + 1;
              await saveClientsToS3(clients);
            }
          }
        } catch (error) {
          console.error('Error linking case to client:', error);
          // Continue even if client update fails
        }
      }

      return createResponse(201, {
        success: true,
        case: newCase
      });
    }

    // Cases PUT endpoint - Update a case
    if ((path.match(/^\/cases\/[^\/]+$/) || path.match(/^\/dev\/cases\/[^\/]+$/)) && method === 'PUT') {
      const caseId = path.match(/^\/(?:dev\/)?cases\/([^\/]+)$/)[1];
      console.log('Update case endpoint hit for:', caseId);

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

      try {
        const existingCases = await loadCasesFromS3();
        const caseIndex = existingCases.findIndex(c => c.id === caseId);

        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: 'Case not found'
          });
        }

        // Update the case, preserving id and created_at
        const updatedCase = {
          ...existingCases[caseIndex],
          ...body,
          id: caseId, // Ensure ID doesn't change
          created_at: existingCases[caseIndex].created_at || existingCases[caseIndex].createdAt,
          updated_at: new Date().toISOString()
        };

        existingCases[caseIndex] = updatedCase;
        await saveCasesToS3(existingCases);

        return createResponse(200, {
          success: true,
          case: updatedCase
        });
      } catch (error) {
        console.error('Error updating case:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to update case',
          details: error.message
        });
      }
    }

    // Clients GET endpoint
    if ((path === '/clients' || path === '/dev/clients' || path === '/auth/clients' || path === '/dev/auth/clients') && method === 'GET') {
      console.log('Get clients endpoint hit');
      const s3Clients = await loadClientsFromS3();
      const allClients = [...s3Clients, ...createdClients];

      return createResponse(200, {
        success: true,
        clients: allClients,
        total: allClients.length
      });
    }

    // Clients GET by ID endpoint
    if ((path.match(/^\/clients\/[^\/]+$/) || path.match(/^\/dev\/clients\/[^\/]+$/) || path.match(/^\/auth\/clients\/[^\/]+$/) || path.match(/^\/dev\/auth\/clients\/[^\/]+$/)) && method === 'GET') {
      const clientId = path.match(/^\/(?:dev\/)?(?:auth\/)?clients\/([^\/]+)$/)[1];
      console.log('Get client by ID endpoint hit for:', clientId);

      try {
        const s3Clients = await loadClientsFromS3();
        const allClients = [...s3Clients, ...createdClients];
        const client = allClients.find(c => c.id === clientId);

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

    // Clients POST endpoint
    if ((path === '/clients' || path === '/dev/clients' || path === '/auth/clients' || path === '/dev/auth/clients') && method === 'POST') {
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

      const { first_name, last_name, name, email, phone, company_name, notes, address } = body;
      
      // Accept either name or first_name/last_name
      const clientName = (name && name.trim()) || (first_name && last_name ? `${first_name} ${last_name}` : '');
      
      if (!clientName && !first_name) {
        return createResponse(400, {
          success: false,
          error: 'name (or first_name and last_name) and email are required'
        });
      }

      if (!email) {
        return createResponse(400, {
          success: false,
          error: 'email is required'
        });
      }

      const clientId = `client-${Date.now()}`;
      const now = new Date().toISOString();

      const newClient = {
        id: clientId,
        name: clientName,
        first_name: first_name || clientName.split(' ')[0] || '',
        last_name: last_name || clientName.split(' ').slice(1).join(' ') || '',
        email,
        phone: phone || '',
        company_name: company_name || '',
        notes: notes || '',
        address: address || {},
        status: 'active',
        createdAt: now,
        created_at: now,
        updated_at: now,
        activeCases: 0,
        totalBilled: 0,
        payments: []
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

    // Clients PUT endpoint - Update a client
    if ((path.match(/^\/clients\/[^\/]+$/) || path.match(/^\/dev\/clients\/[^\/]+$/) || path.match(/^\/auth\/clients\/[^\/]+$/) || path.match(/^\/dev\/auth\/clients\/[^\/]+$/)) && method === 'PUT') {
      const clientId = path.match(/^\/(?:dev\/)?(?:auth\/)?clients\/([^\/]+)$/)[1];
      console.log('Update client endpoint hit for:', clientId);

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

      try {
        const existingClients = await loadClientsFromS3();
        const clientIndex = existingClients.findIndex(c => c.id === clientId);

        if (clientIndex === -1) {
          return createResponse(404, {
            success: false,
            error: 'Client not found'
          });
        }

        // Update the client, preserving id and created_at
        const updatedClient = {
          ...existingClients[clientIndex],
          ...body,
          id: clientId, // Ensure ID doesn't change
          created_at: existingClients[clientIndex].created_at || existingClients[clientIndex].createdAt,
          updated_at: new Date().toISOString()
        };

        existingClients[clientIndex] = updatedClient;
        await saveClientsToS3(existingClients);

        return createResponse(200, {
          success: true,
          client: updatedClient
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

    // Clients GET documents endpoint
    if ((path.match(/^\/clients\/[^\/]+\/documents$/) || path.match(/^\/dev\/clients\/[^\/]+\/documents$/) || path.match(/^\/auth\/clients\/[^\/]+\/documents$/) || path.match(/^\/dev\/auth\/clients\/[^\/]+\/documents$/)) && method === 'GET') {
      const clientId = path.match(/^\/(?:dev\/)?(?:auth\/)?clients\/([^\/]+)\/documents$/)[1];
      console.log('Get client documents endpoint hit for:', clientId);

      try {
        const existingClients = await loadClientsFromS3();
        const client = existingClients.find(c => c.id === clientId);

        if (!client) {
          return createResponse(404, {
            success: false,
            error: 'Client not found'
          });
        }

        return createResponse(200, {
          success: true,
          documents: client.documents || []
        });
      } catch (error) {
        console.error('Error fetching client documents:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to fetch documents',
          details: error.message
        });
      }
    }

    // Case Folders - Get documents for a case
    if ((path.match(/^\/case-folders\/(.+)$/) || path.match(/^\/dev\/case-folders\/(.+)$/)) && method === 'GET') {
      const caseId = path.match(/^\/(?:dev\/)?case-folders\/(.+)$/)[1];
      console.log('Get case folders endpoint hit for case:', caseId);

      try {
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const caseKey = `cases/${caseId}/case-folders.json`;
        
        try {
          const getCommand = new GetObjectCommand({ 
            Bucket: process.env.S3_BUCKET_NAME || 'contractfiles1', 
            Key: caseKey 
          });
          const response = await s3Client.send(getCommand);
          const data = await response.Body.transformToString();
          const caseData = JSON.parse(data);

          return createResponse(200, {
            success: true,
            folders: caseData.folders || [],
            documents: caseData.documents || []
          });
        } catch (s3Error) {
          if (s3Error.name === 'NoSuchKey') {
            // Case folder file doesn't exist yet, return empty
            return createResponse(200, {
              success: true,
              folders: [],
              documents: []
            });
          }
          throw s3Error;
        }
      } catch (error) {
        console.error('Error loading case folders:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to load case folders',
          message: error.message
        });
      }
    }

    // Billing - Create Payment Session (Stripe)
    // NOTE: This is for LAWYER → CLIENT payments (lawyer charges their client)
    // NOT for platform subscription fees (that's a separate future feature)
    if ((path === '/billing/create-payment-session' || path === '/dev/billing/create-payment-session') && method === 'POST') {
      console.log('Create payment session endpoint hit');

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

      try {
        // Initialize Stripe with the LAWYER's API key
        // This allows the lawyer to charge their clients through their own Stripe account
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Convert amount to cents for Stripe
        const amountInCents = Math.round(body.amount * 100);
        
        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: body.currency || 'usd',
                product_data: {
                  name: body.description || 'Legal Services Invoice',
                  description: `Case: ${body.metadata?.case_id} | Client: ${body.metadata?.client_id}`,
                },
                unit_amount: amountInCents,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          customer_email: body.clientEmail,
          metadata: {
            ...body.metadata,
            billing_id: body.billingId,
            payment_type: body.paymentType, // 'trust' or 'operating'
            lawyer_payment: 'true', // Flag to indicate this is lawyer→client, not platform subscription
          },
          success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`,
        });

        console.log('Stripe session created:', session.id);

        return createResponse(200, {
          success: true,
          sessionId: session.id,
          sessionUrl: session.url,
          message: 'Payment session created successfully'
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return createResponse(500, {
          success: false,
          error: 'Failed to create payment session',
          details: stripeError.message
        });
      }
    }

    // Billing - Process Payment Success
    if ((path === '/billing/process-payment' || path === '/dev/billing/process-payment') && method === 'POST') {
      console.log('Process payment endpoint hit');

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

      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        // Retrieve the session from Stripe to verify payment
        const session = await stripe.checkout.sessions.retrieve(body.sessionId);
        
        if (session.payment_status !== 'paid') {
          return createResponse(400, {
            success: false,
            error: 'Payment not completed'
          });
        }

        const metadata = session.metadata;
        const amountPaid = session.amount_total / 100; // Convert from cents
        const now = new Date().toISOString();

        // Load cases and clients from S3
        const [cases, clients] = await Promise.all([
          loadCasesFromS3(),
          loadClientsFromS3()
        ]);

        // Find the case and client
        const caseIndex = cases.findIndex(c => c.id === metadata.case_id);
        const clientIndex = clients.findIndex(c => c.id === metadata.client_id);

        const paymentRecord = {
          id: `payment-${Date.now()}`,
          sessionId: session.id,
          amount: amountPaid,
          status: 'paid',
          paymentType: metadata.payment_type,
          caseId: metadata.case_id,
          clientId: metadata.client_id,
          billingId: metadata.billing_id,
          paidAt: now,
          createdAt: now
        };

        // 1. Add payment to the case's payment history
        if (caseIndex !== -1) {
          if (!cases[caseIndex].payments) {
            cases[caseIndex].payments = [];
          }
          cases[caseIndex].payments.push(paymentRecord);
          cases[caseIndex].updated_at = now;
        }

        // 2. Add payment to the client's payment history
        if (clientIndex !== -1) {
          if (!clients[clientIndex].payments) {
            clients[clientIndex].payments = [];
          }
          clients[clientIndex].payments.push(paymentRecord);
          clients[clientIndex].updated_at = now;
        }

        // Save updated cases and clients back to S3
        await Promise.all([
          saveCasesToS3(cases),
          saveClientsToS3(clients)
        ]);

        // 3. Payment is also recorded in billing records (handled separately)
        // The billing service would handle this in a production system

        return createResponse(200, {
          success: true,
          payment: paymentRecord,
          amount: amountPaid,
          caseTitle: caseIndex !== -1 ? cases[caseIndex].title : null,
          clientName: clientIndex !== -1 ? `${clients[clientIndex].first_name} ${clients[clientIndex].last_name}` : null,
          message: 'Payment processed and recorded successfully'
        });
      } catch (error) {
        console.error('Error processing payment:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to process payment',
          details: error.message
        });
      }
    }

    // Billing - Get Billing Records
    if ((path === '/billing' || path === '/dev/billing') && method === 'GET') {
      console.log('Get billing records endpoint hit');
      
      // Mock billing data for now
      const billingRecords = [];

      return createResponse(200, {
        success: true,
        billing: billingRecords,
        total: billingRecords.length
      });
    }

    // Billing - Create Billing Record
    if ((path === '/billing' || path === '/dev/billing') && method === 'POST') {
      console.log('Create billing record endpoint hit');

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

      const billingId = `billing-${Date.now()}`;
      const now = new Date().toISOString();

      const billingRecord = {
        billing_id: billingId,
        case_id: body.caseId,
        client_id: body.clientId,
        payment_type: body.paymentType,
        base_amount: body.baseAmount,
        processing_fee: body.paymentType === 'trust' ? Math.round(body.baseAmount * 0.04 * 100) / 100 : 0,
        total_amount: body.paymentType === 'trust' 
          ? body.baseAmount + Math.round(body.baseAmount * 0.04 * 100) / 100
          : body.baseAmount,
        due_date: body.dueDate,
        description: body.description || '',
        status: 'pending',
        created_at: now,
        updated_at: now
      };

      return createResponse(201, {
        success: true,
        billing: billingRecord
      });
    }

    // Ledger - Get Trust Ledger
    if ((path === '/ledger/trust' || path === '/dev/ledger/trust') && method === 'GET') {
      console.log('Get trust ledger endpoint hit');
      
      // Mock trust ledger data
      const trustLedger = [];

      return createResponse(200, {
        success: true,
        ledger: trustLedger
      });
    }

    // Ledger - Get Operating Ledger
    if ((path === '/ledger/operating' || path === '/dev/ledger/operating') && method === 'GET') {
      console.log('Get operating ledger endpoint hit');
      
      // Mock operating ledger data
      const operatingLedger = [];

      return createResponse(200, {
        success: true,
        ledger: operatingLedger
      });
    }

    // S3 Upload - Handle file upload via multipart form data
    if ((path === '/s3/upload' || path === '/dev/s3/upload' || path === '/auth/s3/upload' || path === '/dev/auth/s3/upload') && method === 'POST') {
      console.log('S3 upload endpoint hit');
      
      const queryParams = event.queryStringParameters || {};
      const caseId = queryParams.caseId;
      const folderPath = queryParams.folderPath || '';

      if (!caseId) {
        return createResponse(400, {
          success: false,
          error: 'Missing caseId parameter'
        });
      }

      try {
        // Parse multipart form data
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
          return createResponse(400, {
            success: false,
            error: 'Content-Type must be multipart/form-data'
          });
        }

        // Extract boundary from content-type
        const boundaryMatch = contentType.match(/boundary=(.+)$/);
        if (!boundaryMatch) {
          return createResponse(400, {
            success: false,
            error: 'Missing boundary in Content-Type'
          });
        }

        const boundary = boundaryMatch[1];
        const bodyBuffer = event.isBase64Encoded 
          ? Buffer.from(event.body, 'base64')
          : Buffer.from(event.body);

        // Simple multipart parser
        const parts = bodyBuffer.toString('binary').split('--' + boundary);
        let fileBuffer = null;
        let fileName = 'document.pdf';

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="file"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            
            if (nameMatch && filenameMatch) {
              fileName = filenameMatch[1];
              const dataStart = part.indexOf('\r\n\r\n') + 4;
              const dataEnd = part.lastIndexOf('\r\n');
              const fileData = part.substring(dataStart, dataEnd);
              fileBuffer = Buffer.from(fileData, 'binary');
              break;
            }
          }
        }

        if (!fileBuffer) {
          return createResponse(400, {
            success: false,
            error: 'No file found in request'
          });
        }

        const s3Client = new S3Client({ region: 'us-east-1' });
        const documentId = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const key = folderPath 
          ? `cases/${caseId}/${folderPath}/${documentId}`
          : `cases/${caseId}/documents/${documentId}`;

        // Upload to S3
        const putCommand = new PutObjectCommand({
          Bucket: 'contractfiles1',
          Key: key,
          Body: fileBuffer,
          ContentType: 'application/pdf'
        });

        await s3Client.send(putCommand);

        // Create document record in case
        const cases = await loadCasesFromS3();
        const caseIndex = cases.findIndex(c => c.id === caseId);

        if (caseIndex !== -1) {
          const newDocument = {
            id: documentId,
            name: fileName,
            key: key,
            uploadedAt: new Date().toISOString(),
            type: 'application/pdf',
            size: fileBuffer.length
          };

          if (!cases[caseIndex].documents) {
            cases[caseIndex].documents = [];
          }

          cases[caseIndex].documents.push(newDocument);
          await saveCasesToS3(cases);

          return createResponse(200, {
            success: true,
            key: key,
            documentId: documentId,
            message: 'File uploaded successfully'
          });
        } else {
          return createResponse(404, {
            success: false,
            error: 'Case not found'
          });
        }
      } catch (error) {
        console.error('S3 upload error:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to upload file: ' + error.message
        });
      }
    }

    // S3 Download endpoint - for document preview/download (supports GET and HEAD)
    if ((path.startsWith('/s3/download') || path.startsWith('/dev/s3/download')) && (method === 'GET' || method === 'HEAD')) {
      console.log(`S3 download endpoint hit (${method})`);
      
      const queryParams = event.queryStringParameters || {};
      const key = queryParams.key;

      if (!key) {
        return createResponse(400, {
          success: false,
          error: 'Missing key parameter'
        });
      }

      try {
        const s3Client = new S3Client({ region: 'us-east-1' });
        const command = new GetObjectCommand({
          Bucket: 'contractfiles1',
          Key: key
        });

        const response = await s3Client.send(command);
        
        // For HEAD requests, just return headers
        if (method === 'HEAD') {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': response.ContentType || 'application/pdf',
              'Content-Length': response.ContentLength?.toString() || '0',
              'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
            },
            body: ''
          };
        }
        
        // For GET requests, convert stream to buffer and return file
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': response.ContentType || 'application/pdf',
            'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true
        };
      } catch (s3Error) {
        console.error('S3 download error:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to download file',
          details: s3Error.message
        });
      }
    }

    // Case Law Reference endpoint - get details of a case law citation
    if ((path.match(/^\/case-law\/(.+)$/) || path.match(/^\/dev\/case-law\/(.+)$/)) && method === 'GET') {
      const caseLawId = path.match(/^\/(?:dev\/)?case-law\/(.+)$/)[1];
      console.log('Get case law endpoint hit for:', caseLawId);
      
      // Mock case law data - can enhance with real legal database later
      const caseLaw = {
        id: caseLawId,
        title: 'Sample Case Law Citation',
        court: 'Supreme Court',
        year: '2023',
        citation: 'Sample Citation',
        summary: 'This is a sample case law reference.',
        relevance: 'Relevant to contract disputes'
      };

      return createResponse(200, {
        success: true,
        caseLaw: caseLaw
      });
    }

    // Delete Document - DELETE /documents/:documentId
    if ((path.match(/^\/documents\/(.+)$/) || path.match(/^\/dev\/documents\/(.+)$/) || path.match(/^\/auth\/documents\/(.+)$/) || path.match(/^\/dev\/auth\/documents\/(.+)$/)) && method === 'DELETE') {
      const matches = path.match(/^\/(?:dev\/)?(?:auth\/)?documents\/(.+)$/);
      const documentId = matches[1];
      console.log('Delete document endpoint hit for document:', documentId);
      
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        const cases = await loadCasesFromS3();
        
        // Find the case that contains this document
        let foundCase = null;
        let foundDocument = null;
        let caseIndex = -1;
        
        for (let i = 0; i < cases.length; i++) {
          if (cases[i].documents && Array.isArray(cases[i].documents)) {
            const docIndex = cases[i].documents.findIndex(d => 
              d.id === documentId || d.name === documentId || (d.key && d.key.includes(documentId))
            );
            
            if (docIndex !== -1) {
              foundCase = cases[i];
              foundDocument = cases[i].documents[docIndex];
              caseIndex = i;
              break;
            }
          }
        }
        
        if (!foundCase || !foundDocument) {
          return createResponse(404, {
            success: false,
            error: 'Document not found'
          });
        }
        
        // Delete from S3 if key exists
        if (foundDocument.key) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: 'contractfiles1',
              Key: foundDocument.key
            });
            await s3Client.send(deleteCommand);
          } catch (s3Error) {
            console.error('Error deleting from S3:', s3Error);
            // Continue even if S3 delete fails - remove from metadata anyway
          }
        }
        
        // Remove document from case's documents array
        cases[caseIndex].documents = cases[caseIndex].documents.filter(d => 
          d.id !== documentId && d.name !== documentId && (!d.key || !d.key.includes(documentId))
        );
        
        // Save updated cases back to S3
        await saveCasesToS3(cases);
        
        return createResponse(200, {
          success: true,
          message: 'Document deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting document:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to delete document: ' + error.message
        });
      }
    }

    // Delete Case - DELETE /cases/:caseId
    if ((path.match(/^\/cases\/([^\/]+)$/) || path.match(/^\/dev\/cases\/([^\/]+)$/) || path.match(/^\/auth\/cases\/([^\/]+)$/) || path.match(/^\/dev\/auth\/cases\/([^\/]+)$/)) && method === 'DELETE') {
      const matches = path.match(/^\/(?:dev\/)?(?:auth\/)?cases\/([^\/]+)$/);
      const caseId = matches[1];
      console.log('Delete case endpoint hit for case:', caseId);
      
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        const cases = await loadCasesFromS3();
        
        const caseIndex = cases.findIndex(c => c.id === caseId);
        
        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: 'Case not found'
          });
        }
        
        const targetCase = cases[caseIndex];
        
        // Delete all documents associated with this case from S3
        if (targetCase.documents && Array.isArray(targetCase.documents)) {
          for (const doc of targetCase.documents) {
            if (doc.key) {
              try {
                const deleteCommand = new DeleteObjectCommand({
                  Bucket: 'contractfiles1',
                  Key: doc.key
                });
                await s3Client.send(deleteCommand);
              } catch (s3Error) {
                console.error('Error deleting document from S3:', s3Error);
                // Continue even if S3 delete fails
              }
            }
          }
        }
        
        // Remove case from array
        cases.splice(caseIndex, 1);
        
        // Save updated cases back to S3
        await saveCasesToS3(cases);
        
        return createResponse(200, {
          success: true,
          message: 'Case deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting case:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to delete case: ' + error.message
        });
      }
    }

    // Delete Client - DELETE /clients/:clientId
    if ((path.match(/^\/clients\/([^\/]+)$/) || path.match(/^\/dev\/clients\/([^\/]+)$/) || path.match(/^\/auth\/clients\/([^\/]+)$/) || path.match(/^\/dev\/auth\/clients\/([^\/]+)$/)) && method === 'DELETE') {
      const matches = path.match(/^\/(?:dev\/)?(?:auth\/)?clients\/([^\/]+)$/);
      const clientId = matches[1];
      console.log('Delete client endpoint hit for client:', clientId);
      
      try {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client({ region: 'us-east-1' });
        const clients = await loadClientsFromS3();
        
        const clientIndex = clients.findIndex(c => c.id === clientId);
        
        if (clientIndex === -1) {
          return createResponse(404, {
            success: false,
            error: 'Client not found'
          });
        }
        
        const targetClient = clients[clientIndex];
        
        // Delete all documents associated with this client from S3
        if (targetClient.documents && Array.isArray(targetClient.documents)) {
          for (const doc of targetClient.documents) {
            if (doc.key) {
              try {
                const deleteCommand = new DeleteObjectCommand({
                  Bucket: 'contractfiles1',
                  Key: doc.key
                });
                await s3Client.send(deleteCommand);
              } catch (s3Error) {
                console.error('Error deleting document from S3:', s3Error);
                // Continue even if S3 delete fails
              }
            }
          }
        }
        
        // Optionally: Unlink client from all cases
        const cases = await loadCasesFromS3();
        let casesUpdated = false;
        for (let i = 0; i < cases.length; i++) {
          if (cases[i].clientId === clientId || cases[i].client_id === clientId || cases[i].client === clientId) {
            cases[i].clientId = null;
            cases[i].client_id = null;
            cases[i].client = null;
            casesUpdated = true;
          }
        }
        if (casesUpdated) {
          await saveCasesToS3(cases);
        }
        
        // Remove client from array
        clients.splice(clientIndex, 1);
        
        // Save updated clients back to S3
        await saveClientsToS3(clients);
        
        return createResponse(200, {
          success: true,
          message: 'Client deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting client:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to delete client: ' + error.message
        });
      }
    }

    // Remove Case Law Reference from Case - DELETE /cases/:caseId/case-law/:caseLawId
    if ((path.match(/^\/cases\/([^\/]+)\/case-law\/(.+)$/) || path.match(/^\/dev\/cases\/([^\/]+)\/case-law\/(.+)$/)) && method === 'DELETE') {
      const matches = path.match(/^\/(?:dev\/)?cases\/([^\/]+)\/case-law\/(.+)$/);
      const caseId = matches[1];
      const caseLawId = matches[2];
      console.log('Remove case law reference endpoint hit for case:', caseId, 'caseLaw:', caseLawId);
      
      try {
        const s3Cases = await loadCasesFromS3();
        const caseIndex = s3Cases.findIndex(c => c.id === caseId);
        
        if (caseIndex === -1) {
          return createResponse(404, {
            success: false,
            error: 'Case not found'
          });
        }
        
        const targetCase = s3Cases[caseIndex];
        
        // Remove the case law reference
        if (targetCase.caseLawReferences && Array.isArray(targetCase.caseLawReferences)) {
          const initialLength = targetCase.caseLawReferences.length;
          targetCase.caseLawReferences = targetCase.caseLawReferences.filter(ref => ref.id !== caseLawId);
          
          if (targetCase.caseLawReferences.length === initialLength) {
            return createResponse(404, {
              success: false,
              error: 'Case law reference not found in this case'
            });
          }
          
          // Update the case in the array
          s3Cases[caseIndex] = targetCase;
          
          // Save back to S3
          await saveCasesToS3(s3Cases);
          
          return createResponse(200, {
            success: true,
            message: 'Case law reference removed successfully',
            case: targetCase
          });
        } else {
          return createResponse(404, {
            success: false,
            error: 'No case law references found for this case'
          });
        }
      } catch (error) {
        console.error('Error removing case law reference:', error);
        return createResponse(500, {
          success: false,
          error: 'Failed to remove case law reference',
          details: error.message
        });
      }
    }

    // Contract Review endpoint - AI analysis
    if ((path === '/contracts/review' || path === '/dev/contracts/review') && method === 'POST') {
      console.log('Contract review endpoint hit');

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

      const { key } = body;
      if (!key) {
        return createResponse(400, {
          success: false,
          error: 'key is required'
        });
      }

      try {
        // Get document from S3
        const s3Client = new S3Client({ region: 'us-east-1' });
        const getCommand = new GetObjectCommand({
          Bucket: 'contractfiles1',
          Key: key
        });

        const s3Response = await s3Client.send(getCommand);
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of s3Response.Body) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // For now, create a sample text (in production, use Textract for PDF extraction)
        let extractedText = null;
        const contentType = (s3Response.ContentType || '').toLowerCase();
        
        if (contentType.startsWith('text/') || contentType === 'application/json') {
          extractedText = buffer.toString('utf8');
        } else {
          // For PDFs, use sample text until Textract is integrated
          extractedText = `This is a contract document extracted from ${key}.

AGREEMENT FOR SERVICES

1. PARTIES
This agreement is entered into between Company A ("Client") and Company B ("Service Provider").

2. OBLIGATIONS
The Service Provider SHALL deliver all services as outlined in Exhibit A.
The Client SHALL pay all fees within 30 days of invoice.

3. LIABILITY
The Service Provider disclaims liability without limitation for any damages or losses.

4. TERM
This agreement has an indefinite term and may be terminated by either party.

5. CONFIDENTIALITY
All information exchanged is considered confidential and proprietary.

6. GOVERNING LAW
This agreement SHALL be governed by the laws of the State.`;
        }

        // Heuristic analysis (in production, use Bedrock for AI-powered analysis)
        const issues = [];
        const checks = [
          { 
            id: 'ambiguous-term', 
            pattern: /\bindefinite\b/ig, 
            suggestion: 'Clarify the term length or criteria (e.g., "Term: 12 months")',
            fixTemplate: (match) => 'twelve (12) months',
            severity: 'high' 
          },
          { 
            id: 'shall-passive', 
            pattern: /\bSHALL\b/g, 
            suggestion: 'Replace "SHALL" with active, clear obligations like "must" or "will".',
            fixTemplate: (match) => 'must',
            severity: 'medium' 
          },
          { 
            id: 'shall-passive-lower', 
            pattern: /\bshall\b/g, 
            suggestion: 'Replace "shall" with active, clear obligations like "must" or "will".',
            fixTemplate: (match) => 'must',
            severity: 'medium' 
          },
          { 
            id: 'no-liability-without', 
            pattern: /disclaims liability without limitation/ig, 
            suggestion: 'Limit liability or specify caps/exclusions to avoid unenforceable blanket disclaimers.',
            fixTemplate: (match) => 'disclaims liability only to the extent permitted by law and subject to a liability cap of $100,000',
            severity: 'high' 
          }
        ];

        checks.forEach((chk) => {
          let m;
          chk.pattern.lastIndex = 0; // Reset regex
          while ((m = chk.pattern.exec(extractedText)) !== null) {
            const idx = m.index;
            const matchedText = m[0];
            const snippet = extractedText.substr(Math.max(0, idx - 30), Math.min(160, extractedText.length - idx + 30));
            
            issues.push({ 
              id: `${chk.id}_${idx}`, 
              type: chk.id, 
              index: idx, 
              length: matchedText.length,
              originalText: matchedText,
              suggestedText: chk.fixTemplate ? chk.fixTemplate(matchedText) : matchedText,
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
            snippet: extractedText.substr(0, 200), 
            suggestion: 'No obvious issues found with quick heuristics. For a deeper review, AWS Bedrock integration is available.',
            severity: 'low'
          });
        }

        // Build annotated HTML with highlighted issues
        let annotatedHtml = null;
        try {
          const escapeHtml = (str) => {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          };

          const sorted = issues.filter(i => i.type !== 'info').slice().sort((a, b) => a.index - b.index);
          let out = '';
          let last = 0;
          
          for (const it of sorted) {
            const start = Math.max(0, it.index);
            const end = Math.min(extractedText.length, it.index + it.length);
            if (start > last) {
              out += escapeHtml(extractedText.slice(last, start));
            }
            const snippet = escapeHtml(extractedText.slice(start, end));
            const title = escapeHtml(it.suggestion || '');
            out += `<mark data-issue-id="${escapeHtml(it.id)}" title="${title}" style="background:#fff59d;padding:0 2px;border-radius:2px;">${snippet}</mark>`;
            last = end;
          }
          
          if (last < extractedText.length) {
            out += escapeHtml(extractedText.slice(last));
          }
          
          annotatedHtml = out.replace(/\n/g, '<br/>');
        } catch (htmlErr) {
          console.error('Failed to build annotated HTML:', htmlErr);
        }

        return createResponse(200, {
          success: true,
          issues: issues,
          sampleTextAvailable: true,
          originalText: extractedText,
          annotatedHtml: annotatedHtml
        });

      } catch (s3Error) {
        console.error('S3 error during contract review:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to retrieve document for review',
          details: s3Error.message
        });
      }
    }

    // Contract Save Version endpoint - save edited contract as new version
    if ((path === '/contracts/save-version' || path === '/dev/contracts/save-version') && method === 'POST') {
      console.log('Save version endpoint hit');

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

      const { caseId, documentId, contractText, versionType, fixedIssues } = body;
      
      if (!caseId || !documentId || !contractText) {
        return createResponse(400, {
          success: false,
          error: 'caseId, documentId, and contractText are required'
        });
      }

      try {
        const s3Client = new S3Client({ region: 'us-east-1' });
        
        // Load existing case to get document info
        const s3Cases = await loadCasesFromS3();
        const targetCase = s3Cases.find(c => c.id === caseId);
        
        if (!targetCase) {
          return createResponse(404, {
            success: false,
            error: 'Case not found'
          });
        }

        // Find the document
        const doc = targetCase.documents?.find(d => d.id == documentId);
        if (!doc) {
          return createResponse(404, {
            success: false,
            error: 'Document not found'
          });
        }

        // Create version number and filename
        const versionNumber = Date.now();
        const baseFilename = doc.name || doc.filename || `document-${documentId}`;
        const filenameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
        const versionKey = `cases/${caseId}/documents/${documentId}/versions/${versionNumber}-${versionType}.txt`;

        // Save to S3
        const putCommand = new PutObjectCommand({
          Bucket: 'contractfiles1',
          Key: versionKey,
          Body: Buffer.from(contractText, 'utf8'),
          ContentType: 'text/plain',
          Metadata: {
            documentId: String(documentId),
            caseId: caseId,
            versionType: versionType || 'fixed',
            fixedIssuesCount: String(fixedIssues?.length || 0),
            createdAt: new Date().toISOString()
          }
        });

        await s3Client.send(putCommand);

        const version = {
          id: versionNumber,
          versionNumber: versionNumber,
          fileName: `${filenameWithoutExt}_v${versionNumber}_${versionType}.txt`,
          key: versionKey,
          versionType: versionType || 'fixed',
          fixedIssues: fixedIssues || [],
          createdAt: new Date().toISOString(),
          content: contractText,
          note: `Fixed version with ${fixedIssues?.length || 0} issues resolved`
        };

        return createResponse(200, {
          success: true,
          message: 'Version saved successfully',
          version: version
        });

      } catch (s3Error) {
        console.error('S3 error during save version:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to save version',
          details: s3Error.message
        });
      }
    }

    // Document Versions endpoint - version history
    if ((path.match(/^\/documents\/(.+)\/versions$/) || path.match(/^\/dev\/documents\/(.+)\/versions$/)) && method === 'GET') {
      const documentId = path.match(/^\/(?:dev\/)?documents\/(.+)\/versions$/)[1];
      console.log('Get document versions endpoint hit for:', documentId);
      
      try {
        const s3Client = new S3Client({ region: 'us-east-1' });
        const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
        
        // Extract case ID from query params if provided, or search all cases
        const queryParams = event.queryStringParameters || {};
        const caseId = queryParams.caseId;
        
        let prefix;
        if (caseId) {
          prefix = `cases/${caseId}/documents/${documentId}/versions/`;
        } else {
          // Try to find in all cases (less efficient but works)
          // For now, return empty if no caseId provided
          return createResponse(200, {
            success: true,
            versions: []
          });
        }
        
        const listCommand = new ListObjectsV2Command({
          Bucket: 'contractfiles1',
          Prefix: prefix
        });
        
        const listResponse = await s3Client.send(listCommand);
        const versions = [];
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          for (const item of listResponse.Contents) {
            const keyParts = item.Key.split('/');
            const filename = keyParts[keyParts.length - 1];
            const versionMatch = filename.match(/^(\d+)-(\w+)\.txt$/);
            
            if (versionMatch) {
              versions.push({
                id: versionMatch[1],
                versionNumber: parseInt(versionMatch[1]),
                fileName: filename,
                key: item.Key,
                versionType: versionMatch[2],
                createdAt: item.LastModified?.toISOString() || new Date().toISOString(),
                size: item.Size
              });
            }
          }
        }
        
        // Sort by version number descending (newest first)
        versions.sort((a, b) => b.versionNumber - a.versionNumber);

        return createResponse(200, {
          success: true,
          versions: versions
        });
        
      } catch (s3Error) {
        console.error('S3 error fetching versions:', s3Error);
        return createResponse(500, {
          success: false,
          error: 'Failed to fetch versions',
          details: s3Error.message
        });
      }
    }

    // Root endpoint
    if (path === '/' || path === '/dev' || path === '/dev/') {
      return createResponse(200, {
        message: 'Law-AI API',
        timestamp: new Date().toISOString(),
        endpoints: ['/health', '/test', '/clients', '/auth/clients', '/cases', '/auth/cases', '/case-folders/:id', '/s3/download', '/case-law/:id', '/contracts/review', '/contracts/save-version', '/documents/:id/versions', '/billing', '/ledger/trust', '/ledger/operating']
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
