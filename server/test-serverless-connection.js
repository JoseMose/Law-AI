const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { InvokeModelCommand, BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

// Updated OpenSearch client configuration for Serverless
async function createOpenSearchClient() {
    return new Client({
        ...AwsSigv4Signer({
            region: 'us-east-1', // Serverless is in us-east-1
            service: 'aoss',     // Important: use 'aoss' for serverless
            getCredentials: () => {
                const credentialsProvider = defaultProvider();
                return credentialsProvider();
            },
        }),
        node: `https://${process.env.OPENSEARCH_ENDPOINT}`,
    });
}

// Test the connection
exports.handler = async (event) => {
    console.log('Testing serverless connection...');
    
    try {
        const client = await createOpenSearchClient();
        
        // Test connection with cluster info
        const info = await client.info();
        console.log('Successfully connected to OpenSearch Serverless:', info.body);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Connected to serverless collection',
                info: info.body
            })
        };
    } catch (error) {
        console.error('Connection failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            })
        };
    }
};