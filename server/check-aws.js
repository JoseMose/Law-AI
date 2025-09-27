const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
require('dotenv').config();

async function check() {
  const client = new STSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    const res = await client.send(new GetCallerIdentityCommand({}));
    console.log('STS GetCallerIdentity success:');
    console.log({ Account: res.Account, Arn: res.Arn, UserId: res.UserId });
  } catch (err) {
    console.error('STS call error:');
    console.error(err);
    process.exit(2);
  }
}

check();