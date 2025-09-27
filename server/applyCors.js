// applyCors.js
// Loads server/.env, reads server/s3-cors.json and applies it to the given bucket using AWS SDK v3.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function main() {
  try {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      console.error('S3_BUCKET_NAME is not set in server/.env');
      process.exit(2);
    }

    const corsPath = path.resolve(__dirname, 's3-cors.json');
    if (!fs.existsSync(corsPath)) {
      console.error('CORS file not found at', corsPath);
      process.exit(3);
    }

    const raw = fs.readFileSync(corsPath, 'utf8');
    let corsJson;
    try {
      corsJson = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse JSON in', corsPath, e.message);
      process.exit(4);
    }

    if (!Array.isArray(corsJson.CORSRules)) {
      console.error('CORSRules must be an array in', corsPath);
      console.error('Found:', typeof corsJson.CORSRules);
      process.exit(5);
    }

    const region = process.env.AWS_REGION || 'us-east-1';
    const client = new S3Client({ region, credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }});

    const params = {
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: corsJson.CORSRules
      }
    };

    console.log('Applying CORS to bucket:', bucket);
    const cmd = new PutBucketCorsCommand(params);
    const res = await client.send(cmd);
    console.log('Successfully applied CORS. Response:', res || '(empty)');
  } catch (err) {
    console.error('Error applying CORS:', err);
    process.exit(10);
  }
}

main();
