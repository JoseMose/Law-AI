# Georgia Law Research Feature

## Overview

The Georgia Law Research feature provides AI-powered semantic search and analysis of Georgia statutes (O.C.G.A.) using advanced natural language processing and vector embeddings.

## Architecture

### Backend Components
- **Amazon OpenSearch Service**: Vector database for semantic statute search
- **Amazon Bedrock**: AI models for embeddings (Titan) and analysis (Claude)
- **AWS Lambda Functions**:
  - `createLawEmbeddingsLambda`: Processes statute text and creates vector embeddings
  - `searchLawLambda`: Performs semantic search using vector similarity
  - `summarizeLawLambda`: Provides AI-powered statute analysis and summarization
- **Amazon S3**: Storage for statute datasets and processed data

### Frontend Components
- React-based search interface integrated into the Legal Research page
- Real-time search with practice area filtering
- AI-powered statute analysis and summarization
- Expandable statute text with key provisions highlighting

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# OpenSearch Configuration
OPENSEARCH_ENDPOINT=your-opensearch-domain-endpoint
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-secure-password

# Existing variables should already be set
S3_BUCKET_NAME=contractfiles1
BEDROCK_ENABLED=true
```

### 2. Deploy OpenSearch Domain

Use the provided CloudFormation template:

```bash
aws cloudformation deploy \
  --template-file opensearch-template.yaml \
  --stack-name georgia-law-opensearch \
  --parameter-overrides DomainName=georgia-law-vectors
```

### 3. Deploy the System

Run the deployment script:

```bash
./deploy-georgia-law.sh
```

This will:
- Install dependencies
- Upload Georgia Code dataset to S3
- Deploy all Lambda functions
- Configure API Gateway endpoints

### 4. Initialize Embeddings

After deployment, manually trigger the embeddings Lambda to process the statute data:

1. Go to AWS Lambda console
2. Find `lawai-serverless-dev-createLawEmbeddings`
3. Click "Test" to create embeddings and populate OpenSearch

## Usage

### Frontend Interface

1. Navigate to **Legal Research > Georgia Law Research**
2. Enter a natural language query (e.g., "punishment for aggravated assault")
3. Select a practice area filter (optional)
4. Click "Search Georgia Code"

### Search Examples

- **Criminal Law**: "What is the punishment for aggravated assault in Georgia?"
- **Contract Law**: "What are the remedies for breach of contract?"
- **Traffic Law**: "DUI penalties and license suspension"
- **Employment Law**: "Wrongful termination requirements"
- **Family Law**: "Child custody factors"

### AI Analysis Features

For each search result, click "Analyze with AI" to get:

- **Summary**: Concise explanation of the statute
- **Key Points**: Important provisions and requirements
- **Penalties**: Fines, imprisonment terms, and sanctions
- **Definitions**: Key terms and their legal meanings
- **Exceptions**: Limitations and defenses
- **Related Statutes**: Cross-references to other relevant laws
- **Practical Notes**: Real-world application guidance

## API Endpoints

### POST /laws/search
Search for statutes using semantic similarity.

**Request Body:**
```json
{
  "query": "aggravated assault punishment",
  "practiceArea": "criminal",
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "query": "aggravated assault punishment",
  "results": [
    {
      "citation": "O.C.G.A. § 16-5-21",
      "title": "Aggravated assault",
      "summary": "Defines aggravated assault...",
      "relevanceScore": 95,
      "fullText": "...",
      "keyProvisions": ["Penalty provisions", "Definition of assault"],
      "practiceArea": "criminal"
    }
  ]
}
```

### POST /laws/summarize
Get AI-powered analysis of a specific statute.

**Request Body:**
```json
{
  "statuteData": {
    "title_number": "16",
    "chapter_number": "5",
    "section_number": "21",
    "section_name": "Aggravated assault",
    "full_text": "...",
    "practice_area": "criminal"
  },
  "userQuery": "punishment for aggravated assault"
}
```

## Data Structure

### Statute Document Format
```json
{
  "title_number": "16",
  "chapter_number": "5",
  "section_number": "21",
  "section_name": "Aggravated assault",
  "full_text": "Full statute text...",
  "source_url": "https://law.justia.com/...",
  "effective_date": "2012-07-01",
  "practice_area": "criminal"
}
```

### OpenSearch Index Mapping
```json
{
  "mappings": {
    "properties": {
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosine"
        }
      },
      "title_number": { "type": "text" },
      "chapter_number": { "type": "text" },
      "section_number": { "type": "text" },
      "section_name": { "type": "text" },
      "full_text": { "type": "text" },
      "practice_area": { "type": "keyword" },
      "relevance_score": { "type": "float" }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **OpenSearch Connection Failed**
   - Verify OPENSEARCH_ENDPOINT is correct
   - Check security group allows Lambda access
   - Ensure OpenSearch domain is in the same VPC/subnet

2. **Bedrock Model Not Available**
   - Verify Bedrock is enabled in your AWS account
   - Check IAM permissions for Bedrock access
   - Ensure you're using supported model IDs

3. **Search Returns No Results**
   - Confirm embeddings Lambda has been run
   - Check OpenSearch index exists and has data
   - Verify query is properly formatted

4. **Lambda Timeout**
   - Increase timeout in serverless.yml
   - Optimize embedding creation for large datasets
   - Consider processing statutes in batches

### Monitoring

- **CloudWatch Logs**: Check Lambda function logs for errors
- **OpenSearch Dashboard**: Monitor index health and query performance
- **API Gateway**: Track request/response metrics

## Performance Optimization

### Indexing Strategies
- Process statutes in batches to avoid Lambda timeouts
- Use multiple embedding calls for long statutes
- Implement retry logic for failed API calls

### Search Optimization
- Adjust k-NN parameters based on dataset size
- Use practice area filtering to reduce search space
- Implement result caching for frequent queries

### Cost Optimization
- Use reserved instances for OpenSearch
- Implement query result caching
- Monitor Bedrock API usage and costs

## Security Considerations

- All endpoints require Cognito authentication
- OpenSearch domain uses HTTPS encryption
- Data is encrypted at rest and in transit
- IAM roles follow principle of least privilege

## Future Enhancements

- **Real-time Updates**: Automated statute update detection
- **Cross-jurisdictional Search**: Compare Georgia law with other states
- **Case Law Integration**: Link statutes to relevant case precedents
- **Document Analysis**: Extract statute references from legal documents
- **Collaborative Features**: Share statute analyses with team members