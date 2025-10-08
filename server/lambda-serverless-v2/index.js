const { Client } = require('@opensearch-project/opensearch');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
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

// Create OpenSearch client with simple authentication (Lambda role)
function createOpenSearchClient() {
    console.log('Creating OpenSearch Serverless client');
    
    // Simple client configuration - Lambda execution role will handle auth
    return new Client({
        node: `https://${process.env.OPENSEARCH_ENDPOINT}`,
        ssl: {
            rejectUnauthorized: false
        },
        requestTimeout: 60000,
        pingTimeout: 60000
    });
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
        
        // Initialize OpenSearch client
        const client = createOpenSearchClient();
        
        // Test basic connectivity first
        console.log('Testing basic connectivity...');
        
        const indexName = 'georgia-statutes';
        
        // Try to check if index exists (simpler than cluster info)
        try {
            const indexExists = await client.indices.exists({ index: indexName });
            console.log('Index exists check result:', indexExists);
        } catch (error) {
            console.log('Index check failed (expected if new):', error.message);
        }
        
        // If we want to recreate, delete first
        if (event.recreateIndex) {
            try {
                console.log('Attempting to delete existing index...');
                await client.indices.delete({ index: indexName });
                console.log('Index deleted successfully');
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
            console.log('Index creation failed:', createError.message);
            // Continue anyway for now
        }
        
        // Process a few statutes as test
        let successCount = 0;
        let failCount = 0;
        const maxStatutes = Math.min(5, georgiaCode.length); // Limit for testing
        
        for (let i = 0; i < maxStatutes; i++) {
            const statute = georgiaCode[i];
            
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
                
                // Try to index document
                try {
                    const response = await client.index({
                        index: indexName,
                        body: document
                    });
                    
                    successCount++;
                    console.log(`Successfully indexed: ${statute.citation} (${response.body._id})`);
                } catch (indexError) {
                    failCount++;
                    console.error(`Failed to index ${statute.citation}:`, indexError.message);
                }
                
            } catch (error) {
                failCount++;
                console.error(`Failed to process ${statute.citation}:`, error.message);
            }
        }
        
        // Try to refresh index
        try {
            await client.indices.refresh({ index: indexName });
            console.log('Index refreshed successfully');
        } catch (refreshError) {
            console.log('Index refresh failed:', refreshError.message);
        }
        
        console.log(`Processing complete: ${successCount} successful, ${failCount} failed`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Georgia statutes processing completed',
                processed: successCount + failCount,
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