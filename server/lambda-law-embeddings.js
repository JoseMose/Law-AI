const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { InvokeModelCommand, BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

const s3Client = new S3Client({ region: 'us-west-2' });
const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });

// Initialize OpenSearch client
let osClient = null;

function getOpenSearchClient() {
  if (!osClient) {
    const domainEndpoint = process.env.OPENSEARCH_ENDPOINT;
    if (!domainEndpoint) {
      throw new Error('OPENSEARCH_ENDPOINT environment variable is required');
    }

    osClient = new OpenSearchClient({
      node: `https://${domainEndpoint}`,
      auth: {
        username: process.env.OPENSEARCH_USERNAME || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'TempPass123!'
      },
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return osClient;
}

async function createEmbedding(text) {
  try {
    // Titan V2 request format
    const requestBody = {
      inputText: text,
      dimensions: 1024,
      normalize: true
    };
    
    console.log('Creating embedding for text length:', text.length);
    
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('Bedrock response keys:', Object.keys(responseBody));

    // Titan V2 returns embedding in 'embedding' field
    const embedding = responseBody.embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      console.error('Invalid embedding in response:', JSON.stringify(responseBody).substring(0, 500));
      throw new Error('Failed to get valid embedding from Bedrock response');
    }
    
    console.log('Got embedding with dimension:', embedding.length);
    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

async function chunkText(text, maxChunkSize = 1000) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

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

async function indexStatuteChunk(client, indexName, statuteData, chunkText, chunkIndex, embedding) {
  const document = {
    title_number: statuteData.title_number,
    chapter_number: statuteData.chapter_number,
    section_number: statuteData.section_number,
    section_name: statuteData.section_name,
    full_text: chunkText,
    source_url: statuteData.source_url,
    effective_date: statuteData.effective_date,
    practice_area: statuteData.practice_area,
    embedding: embedding,
    chunk_index: chunkIndex,
    total_chunks: 1, // Will be updated after all chunks are processed
    metadata: {
      original_section: `${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}`,
      chunk_id: `${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}-${chunkIndex}`
    }
  };

  const response = await client.index({
    index: indexName,
    body: document,
    refresh: true
  });

  return response;
}

exports.handler = async (event) => {
  console.log('Create Law Embeddings Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    const bucketName = process.env.S3_BUCKET_NAME || 'contractfiles1';
    const indexName = 'georgia-law-vectors';

    // Get Georgia Code data from local file (included in deployment package)
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, 'data', 'georgia-code.json');

    if (!fs.existsSync(dataPath)) {
      throw new Error('Georgia Code data file not found: ' + dataPath);
    }

    const data = fs.readFileSync(dataPath, 'utf8');
    const georgiaCode = JSON.parse(data);

    console.log(`Processing ${georgiaCode.length} statutes...`);

    const client = getOpenSearchClient();

    // Check if index exists, create if not
    const indexExists = await client.indices.exists({ index: indexName });
    if (!indexExists.body) {
      console.log('Creating OpenSearch index...');
      await client.indices.create({
        index: indexName,
        body: {
          settings: {
            index: {
              knn: true,
              'knn.algo_param.ef_search': 512
            }
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
                    m: 24
                  }
                }
              },
              title_number: { type: 'text' },
              chapter_number: { type: 'text' },
              section_number: { type: 'text' },
              section_name: { type: 'text' },
              full_text: { type: 'text' },
              source_url: { type: 'text' },
              effective_date: { type: 'date' },
              practice_area: { type: 'keyword' },
              chunk_index: { type: 'integer' },
              total_chunks: { type: 'integer' },
              metadata: { type: 'object' }
            }
          }
        }
      });
      console.log('Index created successfully');
    }

    let totalChunks = 0;

    // Process each statute (georgiaCode is already an array)
    for (const statute of georgiaCode) {
      console.log(`Processing statute: O.C.G.A. § ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`);

      // Chunk the text
      const textChunks = await chunkText(statute.full_text);

      // Process each chunk
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];

        // Create embedding for the chunk
        const embedding = await createEmbedding(chunk);

        // Index the chunk
        await indexStatuteChunk(client, indexName, statute, chunk, i, embedding);

        totalChunks++;
        console.log(`Indexed chunk ${i + 1}/${textChunks.length} for statute ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`);
      }
    }

    console.log(`Successfully processed and indexed ${totalChunks} statute chunks`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Successfully processed and indexed ${totalChunks} statute chunks`,
        totalStatutes: georgiaCode.length,
        totalChunks: totalChunks
      })
    };

  } catch (error) {
    console.error('Error in createLawEmbeddingsLambda:', error);

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