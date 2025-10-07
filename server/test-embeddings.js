require('dotenv').config();
const { handler } = require('./lambda-law-embeddings');

// Test the embeddings Lambda locally
async function testEmbeddings() {
  console.log('🧪 Testing Georgia Law Embeddings Lambda...');
  console.log('📋 Environment check:');
  console.log('   OPENSEARCH_ENDPOINT:', process.env.OPENSEARCH_ENDPOINT ? '✅ Set' : '❌ Missing');
  console.log('   OPENSEARCH_USERNAME:', process.env.OPENSEARCH_USERNAME ? '✅ Set' : '❌ Missing');
  console.log('   OPENSEARCH_PASSWORD:', process.env.OPENSEARCH_PASSWORD ? '✅ Set' : '❌ Missing');

  try {
    const event = {}; // Empty event for testing
    const result = await handler(event);

    console.log('✅ Lambda executed successfully');
    console.log('📊 Result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Lambda test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testEmbeddings();