const { Client: OpenSearchClient } = require('@opensearch-project/opensearch');
const { InvokeModelCommand, BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

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
    const requestBody = {
      inputText: text,
      dimensions: 1024,
      normalize: true
    };
    
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
      throw new Error('Invalid embedding response from Titan V2');
    }
    
    return embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

async function searchStatutes(queryEmbedding, practiceArea = null, limit = 10) {
  const client = getOpenSearchClient();

  const searchQuery = {
    size: limit,
    query: {
      knn: {
        embedding: {
          vector: queryEmbedding,
          k: limit * 2 // Get more results for better ranking
        }
      }
    },
    _source: [
      'title_number',
      'chapter_number',
      'section_number',
      'section_name',
      'full_text',
      'source_url',
      'effective_date',
      'practice_area',
      'metadata'
    ]
  };

  // Add practice area filter if specified
  if (practiceArea) {
    searchQuery.query = {
      bool: {
        must: [
          {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: limit * 2
              }
            }
          }
        ],
        filter: [
          {
            term: {
              practice_area: practiceArea
            }
          }
        ]
      }
    };
  }

  const response = await client.search({
    index: 'georgia-law-vectors',
    body: searchQuery
  });

  return response.body.hits.hits.map(hit => ({
    id: hit._id,
    score: hit._score,
    statute: {
      title_number: hit._source.title_number,
      chapter_number: hit._source.chapter_number,
      section_number: hit._source.section_number,
      section_name: hit._source.section_name,
      full_text: hit._source.full_text,
      source_url: hit._source.source_url,
      effective_date: hit._source.effective_date,
      practice_area: hit._source.practice_area
    },
    metadata: hit._source.metadata
  }));
}

function formatCitation(statute) {
  return `O.C.G.A. § ${statute.title_number}-${statute.chapter_number}-${statute.section_number}`;
}

function extractKeyProvisions(text) {
  // Extract penalties, definitions, and key requirements
  const provisions = [];

  // Look for penalty information
  const penaltyMatch = text.match(/(?:punished|penalty|fine|imprisonment)[^.!?]*/i);
  if (penaltyMatch) {
    provisions.push(`Penalty: ${penaltyMatch[0].trim()}`);
  }

  // Look for definitions
  const definitionMatch = text.match(/(?:means|defined as|shall mean)[^.!?]*/i);
  if (definitionMatch) {
    provisions.push(`Definition: ${definitionMatch[0].trim()}`);
  }

  // Look for requirements or prohibitions
  const requirementMatch = text.match(/(?:shall|must|may not|prohibited)[^.!?]*/i);
  if (requirementMatch) {
    provisions.push(`Requirement: ${requirementMatch[0].trim()}`);
  }

  return provisions;
}

exports.handler = async (event) => {
  console.log('Search Law Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    // Handle both API Gateway and direct invocation
    let requestBody;
    if (event.body) {
      requestBody = JSON.parse(event.body);
    } else {
      requestBody = event;
    }

    const { query, practiceArea, limit = 5 } = requestBody;

    // Use default test query if none provided
    const searchQuery = query || 'assault penalties in Georgia';
    
    if (!searchQuery) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Query parameter is required'
        })
      };
    }

    console.log(`Searching for: "${searchQuery}"${practiceArea ? ` in ${practiceArea}` : ''}`);

    // Create embedding for the search query
    const queryEmbedding = await createEmbedding(searchQuery);

    // Search for similar statutes
    const searchResults = await searchStatutes(queryEmbedding, practiceArea, limit);

    // Format results
    const formattedResults = searchResults.map(result => ({
      id: result.id,
      relevanceScore: Math.round(result.score * 100) / 100,
      citation: formatCitation(result.statute),
      title: result.statute.section_name,
      summary: result.statute.full_text.substring(0, 200) + (result.statute.full_text.length > 200 ? '...' : ''),
      fullText: result.statute.full_text,
      sourceUrl: result.statute.source_url,
      effectiveDate: result.statute.effective_date,
      practiceArea: result.statute.practice_area,
      keyProvisions: extractKeyProvisions(result.statute.full_text),
      metadata: result.metadata
    }));

    console.log(`Found ${formattedResults.length} relevant statutes`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        query: query,
        results: formattedResults,
        total: formattedResults.length,
        filters: {
          practiceArea: practiceArea || 'all'
        }
      })
    };

  } catch (error) {
    console.error('Error in searchLawLambda:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};