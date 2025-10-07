# Alternative: Simple Georgia Law Search (No OpenSearch)

If OpenSearch permissions are blocked, here's a simpler approach using DynamoDB and Lambda.

## Architecture:
- **DynamoDB**: Store statutes with keyword search
- **Lambda**: Simple search functions (no vector embeddings)
- **API Gateway**: REST endpoints
- **React**: Basic search interface

## Quick Setup:

### 1. Create DynamoDB Table:
```bash
aws dynamodb create-table \
  --table-name georgia-law-statutes \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,AttributeType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Upload Data:
```bash
cd server
node upload-georgia-code-simple.js  # (we'll create this)
```

### 3. Deploy Simple Lambda:
```bash
cd server
serverless deploy  # (will deploy simplified functions)
```

## Benefits:
- ✅ No special permissions needed
- ✅ Faster setup (5-10 minutes)
- ✅ Lower cost
- ✅ Still functional for law research

## Limitations:
- ❌ No AI semantic search
- ❌ No vector similarity
- ❌ Basic keyword matching only

Would you like me to implement this simpler approach?