// Use AWS SDK v2 which is available in Lambda runtime by default
const AWS = require('aws-sdk');
const crypto = require('crypto');

AWS.config.update({ region: 'us-east-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

function calculateSecretHash(username, clientId, clientSecret) {
  const message = username + clientId;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'false'
    };

    try {
        const { httpMethod, path, body } = event;
        
        console.log('Full event:', JSON.stringify(event, null, 2));
        console.log('Environment variables:', {
            CLIENT_ID: CLIENT_ID ? 'Set' : 'Missing',
            CLIENT_SECRET: CLIENT_SECRET ? 'Set' : 'Missing', 
            USER_POOL_ID: USER_POOL_ID ? 'Set' : 'Missing'
        });

        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const pathParts = path.split('/');
        const endpoint = pathParts[pathParts.length - 1];
        
        console.log('Path:', path, 'Method:', httpMethod, 'Endpoint:', endpoint);

        if (httpMethod === 'POST' && (endpoint === 'signin' || path.includes('/signin'))) {
            console.log('Processing signin request');
            const { username, password } = JSON.parse(body);
            console.log('Username:', username);

            if (!CLIENT_ID || !USER_POOL_ID) {
                console.error('Missing Cognito configuration');
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Server configuration error' })
                };
            }

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

            console.log('Calling Cognito with params:', JSON.stringify(params, null, 2));
            
            try {
                const response = await cognito.adminInitiateAuth(params).promise();
                console.log('Cognito response:', JSON.stringify(response, null, 2));

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
                        accessToken: response.AuthenticationResult.AccessToken,
                        idToken: response.AuthenticationResult.IdToken,
                        refreshToken: response.AuthenticationResult.RefreshToken
                    })
                };
            } catch (cognitoError) {
                console.error('Cognito error:', cognitoError);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: cognitoError.message })
                };
            }
        }

        if (httpMethod === 'POST' && (endpoint === 'signup' || path.includes('/signup'))) {
            const { username, password, email } = JSON.parse(body);

            const params = {
                ClientId: CLIENT_ID,
                Username: username,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
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
                body: JSON.stringify({ message: 'User created successfully' })
            };
        }

        if (httpMethod === 'POST' && (endpoint === 'confirm' || path.includes('/confirm'))) {
            const { username, code } = JSON.parse(body);

            const params = {
                ClientId: CLIENT_ID,
                Username: username,
                ConfirmationCode: code
            };

            if (CLIENT_SECRET) {
                params.SecretHash = calculateSecretHash(username, CLIENT_ID, CLIENT_SECRET);
            }

            await cognito.confirmSignUp(params).promise();

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'User confirmed successfully' })
            };
        }

        // Test endpoint
        if (httpMethod === 'GET' && (path.includes('/auth/test') || endpoint === 'test')) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Auth service is working!',
                    path: path,
                    method: httpMethod,
                    endpoint: endpoint
                })
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                error: 'Endpoint not found',
                path: path,
                method: httpMethod,
                availableEndpoints: ['/auth/signin', '/auth/signup', '/auth/confirm', '/auth/test']
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};