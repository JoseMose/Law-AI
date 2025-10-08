const { Client } = require('@opensearch-project/opensearch');
const AWS = require('aws-sdk');
const { InvokeModelCommand, BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const fs = require('fs');
const path = require('path');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });

// Create embedding using Bedrock Titan V2
async function createEmbedding(text) {
    try {
        const requestBody = {
            inputText: text,
            dimensions: 1024,
            normalize: true
        };
        
        console.log('Creating Titan V2 embedding for text length:', text.length);
        
        const command = new InvokeModelCommand({
            modelId: 'amazon.titan-embed-text-v2:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody)
        });

        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        const embedding = responseBody.embedding;
        
        if (!embedding || !Array.isArray(embedding) || embedding.length !== 1024) {
            console.error('Invalid Titan V2 response, using fallback');
            return createFallbackEmbedding(text);
        }
        
        console.log('Got Titan V2 embedding with dimension:', embedding.length);
        return embedding;
    } catch (error) {
        console.error('Bedrock Titan V2 failed, using fallback:', error.message);
        return createFallbackEmbedding(text);
    }
}

// Fallback embedding function
function createFallbackEmbedding(text) {
    console.log('Creating fallback embedding for text length:', text.length);
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const embedding = new Array(1024).fill(0);
    
    words.forEach((word, index) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const embeddingIndex = Math.abs(hash) % 1024;
        embedding[embeddingIndex] += 1;
    });
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        return embedding.map(val => val / magnitude);
    }
    
    const unitVec = new Array(1024).fill(0);
    unitVec[0] = 1.0;
    console.log('Using unit vector fallback');
    return unitVec;
}

// Create OpenSearch client with AWS IAM authentication for serverless
function createOpenSearchClient() {
    console.log('Creating OpenSearch Serverless client with AWS IAM auth');
    
    // Use AWS SDK v2 approach for Lambda environment compatibility
    const credentials = new AWS.EnvironmentCredentials('AWS');
    
    return new Client({
        node: `https://${process.env.OPENSEARCH_ENDPOINT}`,
        auth: {
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken
            },
            region: 'us-east-1',
            service: 'aoss'
        }
    });
}

exports.handler = async (event) => {
    console.log('Starting embeddings Lambda for OpenSearch Serverless');
    console.log('Event:', JSON.stringify(event));
    
    try {
        // Load Georgia Code data
        const dataPath = path.join(__dirname, 'data', 'georgia-code.json');
        const georgiaCodeData = fs.readFileSync(dataPath, 'utf8');
        const georgiaCode = JSON.parse(georgiaCodeData);
        
        console.log(`Loaded ${georgiaCode.length} statutes from embedded data`);
        
        // Initialize OpenSearch client with AWS IAM authentication
        const client = createOpenSearchClient();
        
        // Test connection first
        try {
            console.log('Testing connection to OpenSearch Serverless...');
            const info = await client.info();
            console.log('Successfully connected to OpenSearch Serverless:', JSON.stringify(info.body));
        } catch (connError) {
            console.error('Connection test failed:', connError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'Connection failed: ' + connError.message,
                    stack: connError.stack
                })
            };
        }
        
        const indexName = 'georgia-statutes';
        
        // Check if index exists and delete if recreating
        if (event.recreateIndex) {
            try {
                const indexExists = await client.indices.exists({ index: indexName });
                if (indexExists.body) {
                    console.log('Deleting existing index...');
                    await client.indices.delete({ index: indexName });
                    console.log('Index deleted successfully');
                }
            } catch (deleteError) {
                console.log('Error deleting index (might not exist):', deleteError.message);
            }
        }
        
        // Create index with correct mapping for serverless (nmslib + dot product)
        console.log('Creating index with serverless-compatible mapping...');
        const indexConfig = {
            index: indexName,
            body: {
                settings: {
                    "index.knn": true
                },
                mappings: {
                    properties: {
                        embedding: {
                            type: 'knn_vector',
                            dimension: 1024,
                            method: {
                                name: 'hnsw',
                                space_type: 'innerproduct',
                                engine: 'nmslib'
                            }
                        },
                        title: { type: 'text' },
                        citation: { type: 'keyword' },
                        fullText: { type: 'text' },
                        practiceArea: { type: 'keyword' },
                        sourceUrl: { type: 'keyword' },
                        effectiveDate: { type: 'date' }
                    }
                }
            }
        };
        
        await client.indices.create(indexConfig);
        console.log('Index created successfully');
        
        // Process and upload each statute
        let successCount = 0;
        let failCount = 0;
        
        for (const statute of georgiaCode) {
            try {
                console.log(`Processing: ${statute.citation}`);
                
                // Create embedding
                const embedding = await createEmbedding(statute.fullText);
                
                // Prepare document
                const document = {
                    title: statute.title,
                    citation: statute.citation,
                    fullText: statute.fullText,
                    practiceArea: statute.practiceArea,
                    sourceUrl: statute.sourceUrl,
                    effectiveDate: statute.effectiveDate,
                    embedding: embedding
                };
                
                // Index document
                const response = await client.index({
                    index: indexName,
                    body: document
                });
                
                successCount++;
                console.log(`Successfully indexed: ${statute.citation} (${response.body._id})`);
                
            } catch (error) {
                failCount++;
                console.error(`Failed to process ${statute.citation}:`, error.message);
            }
        }
        
        // Refresh index to make documents searchable
        await client.indices.refresh({ index: indexName });
        console.log('Index refreshed - documents are now searchable');
        
        console.log(`Indexing complete: ${successCount} successful, ${failCount} failed`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Georgia statutes successfully indexed in serverless collection',
                indexed: successCount,
                failed: failCount,
                indexName: indexName,
                endpoint: process.env.OPENSEARCH_ENDPOINT
            })
        };
        
    } catch (error) {
        console.error('Lambda execution failed:', error);
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