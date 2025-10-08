// Updated search function for OpenSearch Serverless with nmslib + dot product

const searchStatutes = async (queryEmbedding, client, filters = {}) => {
  const searchBody = {
    query: {
      bool: {
        must: [
          {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: 10,
                // For nmslib with dot product, higher scores are better
                // No need for score transformation since dot product works directly
              }
            }
          }
        ],
        filter: []
      }
    },
    size: 10,
    _source: ["title", "citation", "fullText", "practiceArea", "sourceUrl", "effectiveDate"]
  };

  // Add practice area filter if specified
  if (filters.practiceArea && filters.practiceArea !== 'all') {
    searchBody.query.bool.filter.push({
      term: { practiceArea: filters.practiceArea }
    });
  }

  try {
    const response = await client.search({
      index: 'georgia-statutes',
      body: searchBody
    });

    return response.body.hits.hits.map((hit, index) => {
      // For dot product with normalized embeddings, score is already good
      const relevanceScore = Math.min(hit._score, 1.0); // Cap at 1.0 for display
      
      return {
        id: hit._id,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        citation: hit._source.citation,
        title: hit._source.title,
        summary: hit._source.fullText.substring(0, 200) + (hit._source.fullText.length > 200 ? '...' : ''),
        fullText: hit._source.fullText,
        sourceUrl: hit._source.sourceUrl,
        effectiveDate: hit._source.effectiveDate,
        practiceArea: hit._source.practiceArea,
        keyProvisions: extractKeyProvisions(hit._source.fullText)
      };
    });
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

module.exports = { searchStatutes };