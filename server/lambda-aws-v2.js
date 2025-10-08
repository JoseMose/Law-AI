const { Client } = require('@opensearch-project/opensearch');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const AWS = require('aws-sdk');
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

// Create OpenSearch client with AWS SDK v2 for better Lambda compatibility
async function createOpenSearchClient() {
    console.log('Creating OpenSearch Serverless client with AWS SDK v2');
    
    try {
        // Use AWS SDK v2 - more reliable in Lambda environment
        // Use GEORGIA_LAW_REGION for OpenSearch, fallback to AWS_REGION, then us-west-2
        const region = process.env.GEORGIA_LAW_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-west-2';
        console.log('Detected region:', region);
        console.log('process.env.GEORGIA_LAW_REGION:', process.env.GEORGIA_LAW_REGION);
        console.log('process.env.AWS_REGION:', process.env.AWS_REGION);
        console.log('process.env.AWS_DEFAULT_REGION:', process.env.AWS_DEFAULT_REGION);
        
        AWS.config.update({
            region: region
        });
        
        // Get the endpoint - ensure proper format
        let endpoint = process.env.OPENSEARCH_ENDPOINT;
        if (!endpoint.startsWith('https://')) {
            endpoint = `https://${endpoint}`;
        }
        
        console.log('Connecting to endpoint:', endpoint);
        console.log('AWS Region:', region);
        console.log('Lambda execution context available:', !!process.env.AWS_LAMBDA_FUNCTION_NAME);
        
        const client = new Client({
            ...AwsSigv4Signer({
                credentials: AWS.config.credentials,
                region: region,
                service: 'aoss'
            }),
            node: endpoint,
            requestTimeout: 120000,
            pingTimeout: 60000
        });
        
        console.log('OpenSearch client created successfully');
        return client;
    } catch (error) {
        console.error('Failed to create OpenSearch client:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    console.log('Starting embeddings Lambda for OpenSearch Serverless');
    console.log('Event:', JSON.stringify(event));
    console.log('Environment endpoint:', process.env.OPENSEARCH_ENDPOINT);
    console.log('AWS_REGION from env:', process.env.AWS_REGION);
    console.log('AWS Lambda context:', {
        functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        logGroup: process.env.AWS_LAMBDA_LOG_GROUP_NAME
    });
    
    try {
        // Load Georgia Code data
        const dataPath = path.join(__dirname, 'georgia-code.json');
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
                    endpoint: process.env.OPENSEARCH_ENDPOINT,
                    awsRegion: process.env.AWS_REGION,
                    lambdaFunction: process.env.AWS_LAMBDA_FUNCTION_NAME
                })
            };
        }
        
        // Initialize OpenSearch client
        console.log('Creating OpenSearch client...');
        const client = await createOpenSearchClient();
        
        // Note: Skip client.info() test for OpenSearch Serverless as it returns 404 on root path
        // This is normal behavior for serverless collections
        console.log('✅ OpenSearch Serverless client created successfully');
        
        // Index name must match the data access policy pattern: index/georgia-law-serverless/*
        const indexName = 'georgia-law-serverless-statutes';
        
        // For OpenSearch Serverless, we can't use indices.exists() as it's not supported
        // Just try to create the index - it will fail if it already exists
        console.log('Attempting to create index (will skip if exists)...');
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
                // Build citation from the JSON structure
                const citation = `O.C.G.A. § ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`;
                console.log(`Processing: ${citation}`);
                
                // Create embedding from full_text
                const embedding = await createEmbedding(statute.full_text);
                
                // Prepare document with proper field mapping
                const document = {
                    title: statute.section_name,
                    citation: citation,
                    fullText: statute.full_text,
                    practiceArea: statute.practice_area,
                    sourceUrl: statute.source_url,
                    effectiveDate: statute.effective_date,
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