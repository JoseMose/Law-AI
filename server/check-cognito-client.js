const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

async function check() {
  const client = new CognitoIdentityProvider({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  try {
    console.log('Listing clients for user pool:', userPoolId);
    const list = await client.listUserPoolClients({ UserPoolId: userPoolId, MaxResults: 60 });
    console.log('User pool clients count:', list.UserPoolClients?.length || 0);
    const found = list.UserPoolClients?.find(c => c.ClientId === clientId);
    console.log('ClientId present in list:', !!found);

    console.log('\nDescribing client:', clientId);
    const desc = await client.describeUserPoolClient({ UserPoolId: userPoolId, ClientId: clientId });
    const c = desc.UserPoolClient || {};
    console.log('Client name:', c.ClientName);
    console.log('Client secret exists:', !!c.ClientSecret);
    console.log('Allowed OAuth flows:', c.AllowedOAuthFlows);
    console.log('Allowed auth flows (explicit):', c.ExplicitAuthFlows);
    console.log('Allowed OAuth scopes:', c.AllowedOAuthScopes);
    console.log('Callback URLs:', c.CallbackURLs);
    console.log('Logout URLs:', c.LogoutURLs);
  } catch (err) {
    console.error('Cognito API error:');
    console.error(err.name || err.Code, err.message || err);
    console.error('AWS $metadata:', err.$metadata || {});
    process.exit(2);
  }
}

check();