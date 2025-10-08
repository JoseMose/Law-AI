exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    // Get origin from headers for better CORS support
    const origin = event.headers?.origin || event.headers?.Origin || '*';
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,Accept,Origin,Referer,User-Agent',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH',
        'Access-Control-Allow-Credentials': 'false',
        'Access-Control-Max-Age': '86400'
    };

    try {
        const { httpMethod, path } = event;

        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        if (httpMethod === 'GET' && path.includes('/test')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Auth service is working!',
                    timestamp: new Date().toISOString(),
                    environment: {
                        cognito_client_id: process.env.COGNITO_CLIENT_ID ? 'Set' : 'Missing',
                        cognito_user_pool_id: process.env.COGNITO_USER_POOL_ID ? 'Set' : 'Missing'
                    }
                })
            };
        }

        if (httpMethod === 'POST' && path.includes('/signin')) {
            const AWS = require('aws-sdk');
            const crypto = require('crypto');
            
            const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'us-east-1' });
            
            const body = JSON.parse(event.body || '{}');
            const { username, password } = body;
            
            if (!username || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Username and password required'
                    })
                };
            }
            
            const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
            const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
            const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
            
            function calculateSecretHash(username, clientId, clientSecret) {
                const message = username + clientId;
                const hmac = crypto.createHmac('sha256', clientSecret);
                hmac.update(message);
                return hmac.digest('base64');
            }
            
            try {
                const params = {
                    AuthFlow: 'ADMIN_NO_SRP_AUTH',
                    ClientId: CLIENT_ID,
                    UserPoolId: USER_POOL_ID,
                    AuthParameters: {
                        USERNAME: username,
                        PASSWORD: password,
                    }
                };

                if (CLIENT_SECRET) {
                    params.AuthParameters.SECRET_HASH = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
                }

                const response = await cognito.adminInitiateAuth(params).promise();
                
                if (response.ChallengeName) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            challenge: response.ChallengeName,
                            session: response.Session,
                            challengeParameters: response.ChallengeParameters
                        })
                    };
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        accessToken: response.AuthenticationResult.AccessToken,
                        idToken: response.AuthenticationResult.IdToken,
                        refreshToken: response.AuthenticationResult.RefreshToken
                    })
                };
                
            } catch (cognitoError) {
                console.error('Cognito authentication error:', cognitoError);
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Authentication failed',
                        message: cognitoError.message || 'Invalid credentials'
                    })
                };
            }
        }

        if (httpMethod === 'POST' && path.includes('/signup')) {
            const AWS = require('aws-sdk');
            const crypto = require('crypto');
            
            const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'us-east-1' });
            
            const body = JSON.parse(event.body || '{}');
            const { username, password, email } = body;
            
            if (!username || !password) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Username and password are required'
                    })
                };
            }
            
            const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
            const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
            
            function calculateSecretHash(username, clientId, clientSecret) {
                const message = username + clientId;
                const hmac = crypto.createHmac('sha256', clientSecret);
                hmac.update(message);
                return hmac.digest('base64');
            }
            
            try {
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
                    params.SecretHash = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
                }

                await cognito.signUp(params).promise();
                
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        message: 'User created successfully. Please check your email for verification.'
                    })
                };
                
            } catch (cognitoError) {
                console.error('Cognito signup error:', cognitoError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Signup failed',
                        message: cognitoError.message || 'Unable to create user'
                    })
                };
            }
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                error: 'Endpoint not found',
                path: path,
                method: httpMethod
            })
        };

    } catch (error) {
        console.error('Error:', error);
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