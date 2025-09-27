require('dotenv').config();
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProvider({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function run() {
  const username = process.argv[2] || 'test';
  const newPassword = process.argv[3] || 'NewP@ssw0rd123';
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    console.error('Missing COGNITO_USER_POOL_ID in .env');
    process.exit(1);
  }

  try {
    console.log(`Setting permanent password for user ${username} in pool ${userPoolId}`);
    const params = {
      UserPoolId: userPoolId,
      Username: username,
      Password: newPassword,
      Permanent: true
    };

    await cognitoClient.adminSetUserPassword(params);
    console.log('Password set successfully.');
  } catch (err) {
    console.error('adminSetUserPassword error:');
    console.error(err);
    process.exit(2);
  }
}

run();
