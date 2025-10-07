// Test embeddings Lambda locally
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import the Lambda handler
const handler = require('./lambda-law-embeddings');

async function testEmbeddings() {
  console.log('🚀 Testing embeddings Lambda locally...\n');
  console.log('OpenSearch Endpoint:', process.env.OPENSEARCH_ENDPOINT);
  console.log('Processing 20 Georgia statutes...\n');

  try {
    const result = await handler.handler({}, {});
    console.log('\n✅ Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testEmbeddings();
