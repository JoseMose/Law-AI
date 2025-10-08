const { Client } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
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

// Create OpenSearch client with proper AWS authentication for serverless
async function createOpenSearchClient() {
    console.log('Creating OpenSearch Serverless client with AWS Signature v4');
    
    try {
        // Use AWS SDK v3 credential provider
        const credentialsProvider = defaultProvider({
            region: 'us-east-1'
        });
        
        // Get the endpoint without https://
        const endpoint = process.env.OPENSEARCH_ENDPOINT.replace('https://', '');
        
        return new Client({
            ...AwsSigv4Signer({
                credentials: credentialsProvider,
                region: 'us-east-1',
                service: 'aoss'
            }),
            node: `https://${endpoint}`,
            requestTimeout: 120000,
            pingTimeout: 60000
        });
    } catch (error) {
        console.error('Failed to create OpenSearch client:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    console.log('Starting embeddings Lambda for OpenSearch Serverless');
    console.log('Event:', JSON.stringify(event));
    console.log('Environment endpoint:', process.env.OPENSEARCH_ENDPOINT);
    
    try {
        // Load Georgia Code data
        const dataPath = path.join(__dirname, 'data', 'georgia-code.json');
        const georgiaCodeData = fs.readFileSync(dataPath, 'utf8');
        const georgiaCode = JSON.parse(georgiaCodeData);
        
        console.log(`Loaded ${georgiaCode.length} statutes from embedded data`);
        
        // For testing, let's just return success without OpenSearch operations
        if (event.testMode) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Test mode - data loaded successfully',
                    statutes: georgiaCode.length,
                    endpoint: process.env.OPENSEARCH_ENDPOINT
                })
            };
        }
        
        // Initialize OpenSearch client with proper AWS authentication
        console.log('Creating OpenSearch client...');
        const client = await createOpenSearchClient();
        console.log('OpenSearch client created successfully');
        
        // Test basic connectivity first
        console.log('Testing basic connectivity...');
        try {
            const clusterInfo = await client.info();
            console.log('Successfully connected to OpenSearch Serverless:', clusterInfo.body);
        } catch (connError) {
            console.error('Connection test failed:', connError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    error: 'Connection test failed: ' + connError.message,
                    details: connError.toString()
                })
            };
        }
        
        const indexName = 'georgia-statutes';
        
        // If we want to recreate, delete first
        if (event.recreateIndex) {
            try {
                console.log('Checking if index exists for deletion...');
                const indexExists = await client.indices.exists({ index: indexName });
                if (indexExists.body) {
                    console.log('Deleting existing index...');
                    await client.indices.delete({ index: indexName });
                    console.log('Index deleted successfully');
                }
            } catch (deleteError) {
                console.log('Delete failed (probably doesn\'t exist):', deleteError.message);
            }
        }
        
        // Create index with serverless-compatible mapping
        console.log('Creating index with serverless mapping...');
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
        
        try {
            await client.indices.create(indexConfig);
            console.log('Index created successfully');
        } catch (createError) {
            if (createError.body && createError.body.error && createError.body.error.type === 'resource_already_exists_exception') {
                console.log('Index already exists, continuing...');
            } else {
                console.error('Index creation failed:', createError);
                throw createError;
            }
        }
        
        // Process and index Georgia statutes
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
        try {
            await client.indices.refresh({ index: indexName });
            console.log('Index refreshed - documents are now searchable');
        } catch (refreshError) {
            console.log('Index refresh failed:', refreshError.message);
        }
        
        console.log(`Processing complete: ${successCount} successful, ${failCount} failed`);
        
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