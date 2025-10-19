// AWS Client Dependencies for Lambda Auth
// Extracted from lambda-auth.js to reduce main file size

const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

// Initialize clients
const cognitoClient = new CognitoIdentityProvider({ 
  region: 'us-east-1'
});

const bedrockClient = new BedrockRuntimeClient({
  region: 'us-east-1'
});

// Environment variables
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

module.exports = {
  CognitoIdentityProvider,
  BedrockRuntimeClient,
  InvokeModelCommand,
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  getSignedUrl,
  crypto,
  cognitoClient,
  bedrockClient,
  CLIENT_ID,
  CLIENT_SECRET,
  USER_POOL_ID
};