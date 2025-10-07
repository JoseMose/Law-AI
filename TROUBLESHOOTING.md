# 🔧 Troubleshooting Guide - Georgia Law Research System

## Quick Diagnostics

Run these commands to check system health:

```bash
# 1. Check OpenSearch
curl -u test:Test123!@ "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_cluster/health?pretty"

# 2. Check document count
curl -u test:Test123!@ "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_count?pretty"

# 3. Check AWS credentials
aws sts get-caller-identity

# 4. Test API Gateway (replace with your URL)
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/laws/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":1}'
```

---

## Common Issues & Solutions

### 1. OpenSearch Authentication Failed (401 Error)

**Symptoms:**
- Error: "Response Error: 401 Unauthorized"
- Cannot access OpenSearch dashboard
- Lambda logs show authentication failures

**Diagnosis:**
```bash
curl -u test:Test123!@ "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_cluster/health"
# If returns 401, credentials are wrong
```

**Solutions:**

**Option A: Reset via AWS Console**
1. Go to AWS Console → OpenSearch Service
2. Select `georgia-law-vectors` domain
3. Click "Actions" → "Modify authentication"
4. Enter new master username/password
5. Wait 10-15 minutes for update
6. Update `.env` file with new credentials
7. Redeploy Lambda functions

**Option B: Reset via AWS CLI**
```bash
aws opensearch update-domain-config \
  --domain-name georgia-law-vectors \
  --advanced-security-options \
  'MasterUserOptions={MasterUserName=admin,MasterUserPassword=NewSecurePass123!}'
```

**Verify Fix:**
```bash
curl -u admin:NewSecurePass123! "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_cluster/health?pretty"
```

---

### 2. Lambda Function Timeout

**Symptoms:**
- Lambda execution exceeds configured timeout
- Error: "Task timed out after X seconds"
- Embeddings Lambda fails mid-processing

**Diagnosis:**
Check CloudWatch logs:
1. AWS Lambda → Select function → Monitor → View CloudWatch logs
2. Look for "Task timed out" messages
3. Check execution duration vs. configured timeout

**Solutions:**

**For Embeddings Lambda:**
```
Required: 15 minutes (900 seconds) for 20 statutes
Current: Check Configuration → General → Timeout
```

**Fix:**
1. AWS Lambda → `georgia-law-embeddings`
2. Configuration → General configuration → Edit
3. Set Timeout: `900 seconds`
4. Set Memory: `1024 MB` (more memory = faster execution)
5. Save

**For Search/Summarize Lambdas:**
- Search: 30 seconds usually sufficient
- Summarize: 60 seconds for AI processing

**Optimize if still timing out:**
```javascript
// In lambda code, add retry logic
const maxRetries = 3;
for (let i = 0; i < maxRetries; i++) {
  try {
    result = await processFunction();
    break;
  } catch (error) {
    if (i === maxRetries - 1) throw error;
    await sleep(1000 * (i + 1)); // Exponential backoff
  }
}
```

---

### 3. AWS Bedrock Access Denied

**Symptoms:**
- Error: "User is not authorized to perform: bedrock:InvokeModel"
- Lambda can't access Bedrock models
- No AI responses generated

**Diagnosis:**
```bash
# Check if Bedrock is accessible
aws bedrock list-foundation-models --region us-east-1 | grep -i "claude\|titan"
```

**Solutions:**

**Step 1: Verify Bedrock Model Access**
1. Go to AWS Bedrock console
2. Click "Model access" in left sidebar
3. Check if these models are enabled:
   - `amazon.titan-embed-text-v1` (for embeddings)
   - `anthropic.claude-3-opus-20240229-v1:0` (for AI)
4. If not enabled, click "Manage model access" → Enable models

**Step 2: Add IAM Permissions**
1. AWS Lambda → Select function → Configuration → Permissions
2. Click on the execution role name
3. Click "Add permissions" → "Attach policies"
4. Search: `AmazonBedrockFullAccess`
5. Select and attach

**Alternative: Create Custom Policy**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-opus-20240229-v1:0"
      ]
    }
  ]
}
```

**Verify Fix:**
Test Lambda function with a simple invoke.

---

### 4. No Search Results Returned

**Symptoms:**
- Search query returns empty array
- `{ "results": [], "total": 0 }`
- OpenSearch index appears empty

**Diagnosis:**
```bash
# Check if documents exist
curl -u test:Test123!@ \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_count?pretty"

# Should return: "count" : 20
# If "count" : 0, embeddings weren't created
```

**Solutions:**

**Step 1: Re-run Embeddings Lambda**
1. AWS Lambda → `georgia-law-embeddings`
2. Click "Test" button
3. Wait 3-5 minutes for completion
4. Check logs for "Successfully processed 20 statutes"

**Step 2: Verify Data File**
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server
cat data/georgia-code.json | python3 -c "import json,sys; print(len(json.load(sys.stdin)), 'statutes')"
```

**Step 3: Check Index Mapping**
```bash
curl -u test:Test123!@ \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_mapping?pretty"
```

**Step 4: Manual Index Check**
```bash
# Get a sample document
curl -u test:Test123!@ \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_search?pretty&size=1"
```

**If still empty, delete and recreate:**
```bash
# Delete index
curl -u test:Test123!@ -XDELETE \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors"

# Re-run embeddings Lambda to recreate with data
```

---

### 5. CORS Errors in Browser

**Symptoms:**
- Browser console shows: "Access-Control-Allow-Origin" error
- Network tab shows "OPTIONS" request failed
- Frontend can't connect to API

**Diagnosis:**
Open browser developer tools (F12):
```
Console error: "has been blocked by CORS policy"
Network tab: Look for failed OPTIONS preflight requests
```

**Solutions:**

**Step 1: Enable CORS in API Gateway**
1. AWS API Gateway → Select `georgia-law-api`
2. Click on a resource (e.g., `/laws/search`)
3. Actions → Enable CORS
4. Access-Control-Allow-Origin: `*` (or your domain)
5. Access-Control-Allow-Headers: Include all needed headers
6. Click "Enable CORS and replace existing CORS headers"

**Step 2: Redeploy API**
1. Actions → Deploy API
2. Select stage: `prod`
3. Click "Deploy"

**Step 3: Verify Lambda Response Headers**
Check Lambda functions return proper CORS headers:
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  },
  body: JSON.stringify(result)
};
```

**Step 4: Test with curl**
```bash
curl -i -X OPTIONS https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/laws/search

# Should return headers with:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: POST, OPTIONS
```

---

### 6. Slow Response Times

**Symptoms:**
- Search takes > 5 seconds
- UI feels sluggish
- Users complain about performance

**Diagnosis:**
```bash
# Test API response time
time curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/laws/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","limit":5}'
```

**Solutions:**

**Optimize Lambda:**
1. Increase memory (more CPU with more RAM):
   - Configuration → General → Memory: 1024 MB or 1536 MB
2. Enable provisioned concurrency (eliminates cold starts):
   - Configuration → Concurrency → Provisioned concurrency: 1-2

**Optimize OpenSearch:**
1. Upgrade instance type:
   - t3.small → t3.medium (2x performance)
2. Add more nodes for parallel processing
3. Use index caching

**Enable API Gateway Caching:**
1. API Gateway → Stages → prod
2. Settings → Enable API cache
3. Cache capacity: 0.5 GB
4. Cache TTL: 300 seconds (5 minutes)

**Frontend Optimizations:**
```javascript
// Debounce search input
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const debouncedSearch = debounce(searchFunction, 500);
```

---

### 7. Lambda "Out of Memory" Error

**Symptoms:**
- Error: "Runtime exited with error: out of memory"
- Lambda execution fails randomly
- Embeddings Lambda crashes

**Diagnosis:**
Check CloudWatch logs for memory usage:
```
Memory Used: 1024 MB of 1024 MB
```

**Solutions:**

**Increase Lambda Memory:**
1. AWS Lambda → Select function
2. Configuration → General configuration → Edit
3. Memory: Increase to 1536 MB or 2048 MB
4. Save

**Optimize Code:**
```javascript
// Process statutes in batches instead of all at once
const batchSize = 5;
for (let i = 0; i < statutes.length; i += batchSize) {
  const batch = statutes.slice(i, i + batchSize);
  await processBatch(batch);
  
  // Clear memory between batches
  if (global.gc) global.gc();
}
```

**Monitor Memory:**
Add logging to Lambda:
```javascript
console.log('Memory usage:', process.memoryUsage());
```

---

### 8. Incorrect Search Results

**Symptoms:**
- Search for "assault" returns divorce statutes
- Results don't match query
- Semantic search seems broken

**Diagnosis:**
```bash
# Test a simple search
curl -X POST https://YOUR-API/laws/search \
  -d '{"query":"murder","practiceArea":"criminal","limit":3}' | jq
```

**Solutions:**

**Check Embedding Quality:**
The issue is likely in how embeddings were created.

**Re-index with better chunking:**
```javascript
// In lambda-law-embeddings.js
// Ensure full statute text is used for embeddings
async function createEmbedding(text) {
  // Use complete statute text, not truncated
  const fullText = text.substring(0, 8000); // Titan limit
  // ... create embedding
}
```

**Verify Practice Area Filters:**
```javascript
// In lambda-law-search.js
// Ensure filter is applied correctly
if (practiceArea && practiceArea !== 'all') {
  searchQuery.query.bool.filter = [
    { term: { practice_area: practiceArea } }
  ];
}
```

**Test Individual Statutes:**
```bash
# Search for a specific statute
curl -u test:Test123!@ \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match": { "section_name": "murder" }
    }
  }'
```

---

### 9. API Gateway Returns 403 Forbidden

**Symptoms:**
- API calls return 403 status
- Error: "Missing Authentication Token"
- Can't access any endpoints

**Diagnosis:**
```bash
curl -i https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/laws/search
# Check status code and error message
```

**Solutions:**

**Check API Deployment:**
1. API Gateway → Stages → prod
2. Verify "Invoke URL" is correct
3. Redeploy if needed: Actions → Deploy API

**Verify Endpoint Paths:**
Make sure you're calling the correct paths:
- ✅ `/prod/laws/search` (correct)
- ❌ `/laws/search` (missing stage)
- ❌ `/prod/search` (missing /laws)

**Check Lambda Permissions:**
1. API Gateway → Resources → POST method
2. Integration Request → Should show Lambda function
3. If broken, reconnect: Change integration → Lambda Function

**Test Endpoint Exists:**
```bash
# List all resources
aws apigateway get-resources --rest-api-id YOUR-API-ID
```

---

### 10. Frontend Not Connecting to API

**Symptoms:**
- React app shows no results
- Network tab shows no API calls
- Console shows no errors

**Diagnosis:**
1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Verify API URL is correct

**Solutions:**

**Check API URL Configuration:**
```javascript
// Find in your React code
const API_URL = 'https://...';
console.log('API URL:', API_URL); // Add this for debugging
```

**Test API URL Directly:**
```bash
# Copy the URL from your code and test
curl https://YOUR-URL-FROM-CODE/laws/search
```

**Check Environment Variables:**
If using .env files:
```bash
# In React app root
cat .env
# or
cat .env.production
```

**Verify Build:**
```bash
# Rebuild React app
cd /Users/josephesfandiari/Lawyer\ App/law-ai
npm run build

# Check if API URL is in build
grep -r "execute-api" build/
```

**Add Error Handling:**
```javascript
async function searchLaw(query) {
  try {
    const response = await fetch(`${API_URL}/laws/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}
```

---

## Advanced Debugging

### Enable Detailed Lambda Logging

Add to Lambda functions:
```javascript
console.log('Event:', JSON.stringify(event, null, 2));
console.log('Environment:', {
  OPENSEARCH_ENDPOINT: process.env.OPENSEARCH_ENDPOINT,
  AWS_REGION: process.env.AWS_REGION
});

try {
  // ... your code
  console.log('Success:', result);
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  throw error;
}
```

### View CloudWatch Logs
```bash
# Get recent logs
aws logs tail /aws/lambda/georgia-law-search --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/georgia-law-search \
  --filter-pattern "ERROR"
```

### Test Lambda Locally
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server

# Install dependencies
npm install

# Set environment variables
export OPENSEARCH_ENDPOINT="search-georgia-law-vectors-..."
export OPENSEARCH_USERNAME="test"
export OPENSEARCH_PASSWORD="Test123!@"

# Run test
node test-embeddings.js
```

---

## Emergency Fixes

### Complete System Reset

If everything is broken, start fresh:

```bash
# 1. Delete OpenSearch index
curl -u test:Test123!@ -XDELETE \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors"

# 2. Delete all Lambda functions
aws lambda delete-function --function-name georgia-law-embeddings
aws lambda delete-function --function-name georgia-law-search
aws lambda delete-function --function-name georgia-law-summarize

# 3. Delete API Gateway
aws apigateway delete-rest-api --rest-api-id YOUR-API-ID

# 4. Start deployment from scratch
# Follow COMPLETE-DEPLOYMENT-GUIDE.md from Step 2
```

---

## Getting Help

### Check AWS Service Health
https://health.aws.amazon.com/health/status

### AWS Support
- Basic support: Included with all accounts
- Developer support: $29/month
- Business support: $100/month

### Community Resources
- AWS Forums: https://forums.aws.amazon.com/
- Stack Overflow: Tag questions with `aws-lambda`, `opensearch`, `aws-bedrock`
- GitHub Issues: Check AWS SDK repositories

### Useful AWS CLI Commands
```bash
# Check Lambda function
aws lambda get-function --function-name georgia-law-search

# View Lambda logs
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/georgia

# Check API Gateway
aws apigateway get-rest-apis

# Check OpenSearch domain
aws opensearch describe-domain --domain-name georgia-law-vectors

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

---

## Prevention Best Practices

1. **Always test after changes:**
   - Redeploy → Test with curl → Test in browser

2. **Monitor CloudWatch:**
   - Set up alarms for errors
   - Review logs regularly

3. **Use version control:**
   - Commit working code to git
   - Tag successful deployments

4. **Document changes:**
   - Keep notes on configuration changes
   - Update .env.example when adding variables

5. **Regular backups:**
   - Export OpenSearch data monthly
   - Save Lambda code versions
   - Document API Gateway config

---

**Last Updated:** October 6, 2025  
**System Version:** 1.0  
**Support:** Refer to COMPLETE-DEPLOYMENT-GUIDE.md for detailed instructions
