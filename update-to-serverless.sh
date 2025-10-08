#!/bin/bash

# Update Lambda functions to use OpenSearch Serverless
# Replace YOUR_SERVERLESS_ENDPOINT with the actual endpoint from AWS Console

echo "Updating Lambda functions to use OpenSearch Serverless..."

# You'll get this endpoint from AWS Console after serverless collection is created
SERVERLESS_ENDPOINT="YOUR_SERVERLESS_ENDPOINT"

# Update georgia-law-embeddings function
echo "Updating georgia-law-embeddings..."
aws lambda update-function-configuration --region us-west-2 \
  --function-name georgia-law-embeddings \
  --environment Variables="{
    OPENSEARCH_ENDPOINT=\"$SERVERLESS_ENDPOINT\",
    OPENSEARCH_USERNAME=\"\",
    OPENSEARCH_PASSWORD=\"\"
  }"

# Update georgia-law-search function  
echo "Updating georgia-law-search..."
aws lambda update-function-configuration --region us-west-2 \
  --function-name georgia-law-search \
  --environment Variables="{
    OPENSEARCH_ENDPOINT=\"$SERVERLESS_ENDPOINT\",
    OPENSEARCH_USERNAME=\"\",
    OPENSEARCH_PASSWORD=\"\"
  }"

# Update georgia-law-summarize function
echo "Updating georgia-law-summarize..."
aws lambda update-function-configuration --region us-west-2 \
  --function-name georgia-law-summarize \
  --environment Variables="{
    OPENSEARCH_ENDPOINT=\"$SERVERLESS_ENDPOINT\",
    OPENSEARCH_USERNAME=\"\",
    OPENSEARCH_PASSWORD=\"\"
  }"

echo "Lambda functions updated! Now run the re-indexing script."