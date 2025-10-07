# Georgia Law Research - Complete Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 20.x** installed
4. **Serverless Framework** installed globally: `npm install -g serverless`

## Step 1: Configure AWS CLI

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

## Step 2: Set Environment Variables

Update your `.env` file with the correct values:

```bash
# Required environment variables
OPENSEARCH_ENDPOINT=https://search-georgia-law-vectors-YOUR_DOMAIN_ID.us-east-1.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=YourSecurePassword123!
S3_BUCKET_NAME=contractfiles1
BEDROCK_ENABLED=true

# Existing variables (should already be set)
COGNITO_CLIENT_ID=your_cognito_client_id
COGNITO_CLIENT_SECRET=your_cognito_client_secret
COGNITO_USER_POOL_ID=your_cognito_user_pool_id
```

## Step 3: Enable Bedrock Models (if not already done)

1. Go to AWS Console → Amazon Bedrock
2. Request access to:
   - Titan Embeddings (amazon.titan-embed-text-v1)
   - Claude (anthropic.claude-3-sonnet-20240229-v1:0)

## Step 4: Deploy OpenSearch Domain

### Option A: CloudFormation (Requires IAM Permissions)
```bash
cd server
aws cloudformation deploy \
  --template-file opensearch-template.yaml \
  --stack-name georgia-law-opensearch \
  --parameter-overrides DomainName=georgia-law-vectors \
  --capabilities CAPABILITY_IAM
```

### Option B: Manual Setup (Recommended if you have permission issues)
If CloudFormation fails due to IAM permissions, follow the manual setup guide in `MANUAL-OPENSEARCH-SETUP.md`.

**Why this happens**: Your IAM user needs OpenSearch permissions to create domains via CloudFormation. The manual console method works because you're using your account's admin privileges through the web interface.

Wait 15-20 minutes for the domain to be fully available.

## Step 5: Get OpenSearch Endpoint

After deployment, get the actual endpoint:

```bash
aws cloudformation describe-stacks \
  --stack-name georgia-law-opensearch \
  --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchDomainEndpoint`].OutputValue' \
  --output text
```

Update your `.env` file with the actual endpoint.

## Step 6: Upload Georgia Code Data

```bash
cd server
node upload-georgia-code.js
```

This uploads the statute data to S3.

## Step 7: Deploy Lambda Functions

```bash
cd server
serverless deploy
```

This deploys all Lambda functions including the new Georgia Law functions.

## Step 8: Initialize Embeddings

Manually trigger the embeddings Lambda to process statutes:

1. Go to AWS Lambda Console
2. Find function: `lawai-serverless-dev-createLawEmbeddings`
3. Click "Test" tab
4. Use default test event or create empty event: `{}`
5. Click "Test"

This will:
- Download Georgia Code from S3
- Create vector embeddings using Titan
- Index everything in OpenSearch

## Step 9: Test the System

### Test Search Endpoint
```bash
curl -X POST https://your-api-gateway-url/dev/laws/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "aggravated assault punishment",
    "practiceArea": "criminal",
    "limit": 3
  }'
```

### Test Summarize Endpoint
```bash
curl -X POST https://your-api-gateway-url/dev/laws/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "statuteData": {
      "title_number": "16",
      "chapter_number": "5",
      "section_number": "21",
      "section_name": "Aggravated assault",
      "full_text": "Full statute text here...",
      "practice_area": "criminal"
    },
    "userQuery": "punishment for aggravated assault"
  }'
```

## Step 10: Frontend Testing

1. Start the React app: `npm start`
2. Navigate to Legal Research → Georgia Law Research
3. Test search functionality
4. Test AI analysis feature

## Troubleshooting

### OpenSearch Issues

**Domain Creation Failed:**
- Check CloudFormation stack events for errors
- Ensure you're in us-east-1 region
- Verify account limits for OpenSearch domains

**Connection Failed:**
- Verify OPENSEARCH_ENDPOINT is correct
- Check security group allows Lambda access
- Ensure domain is in same VPC/subnet as Lambda

**Index Creation Failed:**
- Check Lambda logs for specific errors
- Verify Bedrock permissions
- Ensure OpenSearch domain is fully initialized

### Lambda Issues

**Timeout Errors:**
- Increase timeout in serverless.yml
- Check OpenSearch response times
- Optimize embedding batch processing

**Bedrock Errors:**
- Verify model access is approved
- Check IAM permissions for bedrock:InvokeModel
- Ensure correct model IDs

**Memory Issues:**
- Increase memorySize in serverless.yml
- Process data in smaller batches

### Frontend Issues

**API Calls Failing:**
- Check CORS configuration
- Verify API Gateway URL in .env
- Check browser network tab for errors

**Search Not Working:**
- Verify embeddings Lambda ran successfully
- Check OpenSearch index exists
- Test API endpoints directly

## Monitoring

### CloudWatch Logs
- Check Lambda function logs for errors
- Monitor API Gateway access logs
- Track OpenSearch slow query logs

### Metrics to Monitor
- Lambda duration and errors
- OpenSearch CPU and memory usage
- API Gateway latency and error rates
- Bedrock API usage and costs

## Cost Optimization

### OpenSearch
- Use t3.small instances for development
- Enable UltraWarm for cost savings
- Set up automated snapshots

### Lambda
- Optimize memory allocation
- Use provisioned concurrency for frequently called functions
- Monitor and adjust timeouts

### Bedrock
- Monitor API usage
- Consider reserved instances for high usage
- Use smaller models when possible

## Security Checklist

- [ ] OpenSearch domain uses HTTPS
- [ ] Data encrypted at rest and in transit
- [ ] IAM roles follow least privilege
- [ ] API Gateway has proper authentication
- [ ] Environment variables are secure
- [ ] No secrets in Lambda code

## Next Steps

1. **Performance Testing**: Load test with multiple concurrent users
2. **Data Expansion**: Add more Georgia statutes to the dataset
3. **Advanced Features**:
   - Case law integration
   - Cross-jurisdictional search
   - Document analysis
   - Citation linking

## Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify all environment variables
3. Test individual components
4. Check AWS service limits and quotas
5. Review IAM permissions

The system is now ready for production use!