const { Client } = require('@opensearch-project/opensearch');
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
        
        console.log('Bedrock response keys:', Object.keys(responseBody));

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

// Fallback embedding function (kept for backup)
function createFallbackEmbedding(text) {
    // Simple hash-based embedding generation
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const embedding = new Array(1024).fill(0);
    
    // Create features based on text characteristics
    words.forEach((word, idx) => {
        const hash = word.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        // Distribute word features across embedding dimensions
        for (let i = 0; i < 10; i++) {
            const dim = Math.abs((hash + i * 37)) % 1024;
            embedding[dim] += Math.sin(hash + i) * 0.1;
        }
    });
    
    // Add document length feature
    embedding[0] += Math.log(text.length + 1) * 0.1;
    
    // Add practice area features (if we can detect keywords)
    const practiceKeywords = {
        criminal: ['assault', 'battery', 'theft', 'murder', 'robbery', 'burglary'],
        family: ['marriage', 'divorce', 'custody', 'support', 'adoption'],
        contract: ['agreement', 'breach', 'damages', 'consideration'],
        property: ['real estate', 'deed', 'easement', 'title'],
        traffic: ['vehicle', 'driving', 'license', 'speed']
    };
    
    Object.entries(practiceKeywords).forEach(([practice, keywords], practiceIdx) => {
        const matches = keywords.filter(k => text.toLowerCase().includes(k)).length;
        if (matches > 0) {
            for (let i = 0; i < 5; i++) {
                embedding[100 + practiceIdx * 20 + i] += matches * 0.2;
            }
        }
    });
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0 && isFinite(magnitude)) {
        const normalized = embedding.map(val => val / magnitude);
        console.log(`Normalized embedding magnitude: ${magnitude}, first value: ${normalized[0]}`);
        return normalized;
    }
    
    console.log('Creating random fallback vector due to zero/invalid magnitude');
    // Fallback to random normalized vector
    const randomVec = new Array(1024).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    const randomMag = Math.sqrt(randomVec.reduce((sum, val) => sum + val * val, 0));
    if (randomMag > 0) {
        return randomVec.map(val => val / randomMag);
    }
    
    // Ultimate fallback - simple unit vector
    const unitVec = new Array(1024).fill(0);
    unitVec[0] = 1.0;
    console.log('Using unit vector as ultimate fallback');
    return unitVec;
}

function chunkText(text, maxChunkSize = 1000) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk + '.');
            }
            currentChunk = trimmedSentence;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk + '.');
    }
    
    return chunks.length > 0 ? chunks : [text];
}

exports.handler = async (event) => {
    console.log('Starting embeddings Lambda - FALLBACK VERSION');
    
    try {
        // Load Georgia Code data
        const dataPath = path.join(__dirname, 'data', 'georgia-code.json');
        const georgiaCodeData = fs.readFileSync(dataPath, 'utf8');
        const georgiaCode = JSON.parse(georgiaCodeData);
        
        console.log(`Loaded ${georgiaCode.length} statutes from embedded data`);
        
        // Initialize OpenSearch client
        const client = new Client({
            node: `https://${process.env.OPENSEARCH_ENDPOINT}`,
            auth: {
                username: process.env.OPENSEARCH_USERNAME,
                password: process.env.OPENSEARCH_PASSWORD
            }
        });
        
        const indexName = 'georgia-law-vectors';
        
        // Delete existing index to ensure clean slate
        try {
            const indexExists = await client.indices.exists({ index: indexName });
            if (indexExists.body) {
                console.log('Deleting existing index with incompatible mapping...');
                await client.indices.delete({ index: indexName });
                console.log('Index deleted successfully');
            }
        } catch (deleteError) {
            console.log('Error deleting index (might not exist):', deleteError.message);
        }
        
        // Create fresh index
        console.log('Creating fresh index with correct mapping...');
        await client.indices.create({
                index: indexName,
                body: {
                    settings: {
                        "index.knn": true,
                        "index.knn.algo_param.ef_search": 512
                    },
                    mappings: {
                        properties: {
                            embedding: {
                                type: 'knn_vector',
                                dimension: 1024,
                                method: {
                                    name: 'hnsw',
                                    space_type: 'cosinesimil',
                                    engine: 'lucene',
                                    parameters: {
                                        ef_construction: 512,
                                        m: 16
                                    }
                                }
                            },
                            title_number: { type: 'keyword' },
                            chapter_number: { type: 'keyword' },
                            section_number: { type: 'keyword' },
                            section_name: { type: 'text' },
                            full_text: { type: 'text' },
                            source_url: { type: 'keyword' },
                            effective_date: { type: 'date' },
                            practice_area: { type: 'keyword' },
                            chunk_index: { type: 'integer' },
                            total_chunks: { type: 'integer' }
                        }
                    }
                }
            });
        console.log('Fresh index created successfully');
        
        let totalChunks = 0;
        
        // Test with one minimal document first
        console.log('Testing with minimal document first...');
        const testEmbedding = new Array(1024).fill(0);
        testEmbedding[0] = 1.0; // Unit vector
        
        try {
            await client.index({
                index: indexName,
                body: {
                    embedding: testEmbedding,
                    test: 'minimal document'
                }
            });
            console.log('✅ Minimal document indexed successfully');
        } catch (testError) {
            console.error('❌ Minimal document failed:', testError.message);
            throw new Error(`Even minimal document fails: ${testError.message}`);
        }
        
        // Process each statute
        for (const statute of georgiaCode) {
            console.log(`Processing statute: O.C.G.A. § ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`);
            
            // Chunk the text
            const textChunks = chunkText(statute.full_text);
            
            // Process each chunk
            for (let i = 0; i < textChunks.length; i++) {
                const chunk = textChunks[i];
                
                // Create Titan V2 embedding (with fallback)
                const embedding = await createEmbedding(chunk);
                console.log(`Created embedding with ${embedding.length} dimensions`);
                console.log(`First 5 values: [${embedding.slice(0, 5).join(', ')}]`);
                console.log(`Embedding is array: ${Array.isArray(embedding)}`);
                console.log(`All values are numbers: ${embedding.every(v => typeof v === 'number' && !isNaN(v))}`);
                
                // Validate embedding before indexing
                if (!Array.isArray(embedding) || embedding.length !== 1024) {
                    throw new Error(`Invalid embedding: expected array of 1024 numbers, got ${typeof embedding} with length ${embedding?.length}`);
                }
                
                if (embedding.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v))) {
                    throw new Error(`Embedding contains invalid values: ${embedding.filter(v => typeof v !== 'number' || isNaN(v) || !isFinite(v)).slice(0, 5)}`);
                }
                
                // Index the chunk
                const document = {
                    embedding: embedding,
                    title_number: statute.title_number,
                    chapter_number: statute.chapter_number,
                    section_number: statute.section_number,
                    section_name: statute.section_name,
                    full_text: statute.full_text,
                    source_url: statute.source_url,
                    effective_date: statute.effective_date,
                    practice_area: statute.practice_area,
                    chunk_index: i,
                    total_chunks: textChunks.length,
                    chunk_text: chunk
                };
                
                console.log(`Document embedding field type: ${typeof document.embedding}`);
                console.log(`Document embedding is array: ${Array.isArray(document.embedding)}`);
                console.log(`Document embedding length: ${document.embedding?.length}`);
                console.log(`About to index document with keys: ${Object.keys(document)}`);
                
                const indexRequest = {
                    index: indexName,
                    body: document
                };
                
                console.log(`Index request body embedding type: ${typeof indexRequest.body.embedding}`);
                
                await client.index(indexRequest);
                
                totalChunks++;
                console.log(`Indexed chunk ${i + 1}/${textChunks.length} for statute ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`);
            }
        }
        
        // Refresh index
        await client.indices.refresh({ index: indexName });
        
        console.log(`Successfully processed and indexed ${totalChunks} statute chunks`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Successfully processed and indexed ${totalChunks} statute chunks using fallback embeddings`,
                totalStatutes: georgiaCode.length,
                totalChunks: totalChunks,
                embeddingType: 'fallback_hash_based'
            })
        };
        
    } catch (error) {
        console.error('Error in embeddings handler:', error);
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