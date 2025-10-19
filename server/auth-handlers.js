// Authentication handlers
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

const cognitoClient = new CognitoIdentityProvider({ region: 'us-east-1' });

const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

function getSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac('sha256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

async function handleSignIn(body) {
  const { username, password } = body;
  
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

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
    return {
      challenge: response.ChallengeName,
      session: response.Session,
      challengeParameters: response.ChallengeParameters
    };
  }

  return {
    success: true,
    accessToken: response.AuthenticationResult.AccessToken,
    idToken: response.AuthenticationResult.IdToken,
    refreshToken: response.AuthenticationResult.RefreshToken
  };
}

async function handleSignUp(body) {
  const { username, password, email } = body;
  
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

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

  return {
    message: 'User created successfully. Please check your email for verification.'
  };
}

module.exports = {
  handleSignIn,
  handleSignUp
};