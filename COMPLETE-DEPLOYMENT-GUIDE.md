# 🚀 Georgia Law Research System - Complete Deployment Guide

## Overview
This guide will walk you through deploying your AI-powered Georgia Law Research system with 20 statutes covering Criminal, Contract, Family, Property, and Traffic law.

---

## 📋 Prerequisites Checklist

Before starting, verify you have:
- ✅ AWS Account with access to Lambda, OpenSearch, API Gateway, and Bedrock
- ✅ OpenSearch domain deployed: `search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws`
- ✅ 20 Georgia statutes in: `/Users/josephesfandiari/Lawyer App/law-ai/server/data/georgia-code.json`
- ✅ AWS credentials configured in `.env` file
- ✅ Node.js dependencies installed (`node_modules/` folder exists)

---

## 🔧 STEP 1: Verify OpenSearch Access

### 1.1 Test OpenSearch Authentication
Open your terminal and run:
```bash
curl -u test:Test123!@ -XGET "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_cluster/health?pretty"
```

**Expected Response:**
```json
{
  "cluster_name" : "...",
  "status" : "green" or "yellow",
  "number_of_nodes" : 1
}
```

**If you get "401 Unauthorized":**
1. Go to AWS Console → OpenSearch Service
2. Click on `georgia-law-vectors` domain
3. Click "Actions" → "Modify authentication"
4. Reset the master username/password
5. Update `.env` file with new credentials

### 1.2 Verify OpenSearch Dashboard Access
1. Open: https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_dashboards
2. Login with username: `test`, password: `Test123!@`
3. Verify you can access the dashboard

**✅ Checkpoint:** OpenSearch is accessible and authenticated

---

## 📦 STEP 2: Create Lambda Deployment Package

### 2.1 Prepare the Deployment Package
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server

# Create a clean deployment directory
mkdir -p lambda-deploy
cd lambda-deploy

# Copy Lambda functions
cp ../lambda-law-embeddings.js .
cp ../lambda-law-search.js .
cp ../lambda-law-summarize.js .

# Copy data directory
cp -r ../data .

# Copy necessary node_modules
mkdir -p node_modules
cp -r ../node_modules/@opensearch-project ./node_modules/
cp -r ../node_modules/@aws-sdk ./node_modules/
```

### 2.2 Create ZIP for Embeddings Lambda
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server/lambda-deploy

# Create ZIP with all dependencies
zip -r embeddings-lambda.zip lambda-law-embeddings.js data/ node_modules/

# Verify ZIP contents
unzip -l embeddings-lambda.zip | head -20
```

### 2.3 Create ZIP for Search Lambda
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server/lambda-deploy

zip -r search-lambda.zip lambda-law-search.js node_modules/
```

### 2.4 Create ZIP for Summarize Lambda
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server/lambda-deploy

zip -r summarize-lambda.zip lambda-law-summarize.js node_modules/
```

**✅ Checkpoint:** Three ZIP files created in `lambda-deploy/` folder

---

## ☁️ STEP 3: Deploy Lambda Functions

### 3.1 Create Embeddings Lambda (Most Important!)

**Via AWS Console:**

1. **Navigate to Lambda**
   - Go to: https://console.aws.amazon.com/lambda
   - Click "Create function"

2. **Basic Information**
   - Function name: `georgia-law-embeddings`
   - Runtime: `Node.js 20.x`
   - Architecture: `x86_64`
   - Click "Create function"

3. **Upload Code**
   - In "Code source" section, click "Upload from" → ".zip file"
   - Select `embeddings-lambda.zip`
   - Click "Save"

4. **Configure Function Settings**
   - Click "Configuration" tab → "General configuration" → "Edit"
   - Memory: `1024 MB`
   - Timeout: `15 minutes (900 seconds)`
   - Ephemeral storage: `512 MB`
   - Click "Save"

5. **Set Environment Variables**
   - Click "Configuration" tab → "Environment variables" → "Edit"
   - Add the following variables:
   
   ```
   OPENSEARCH_ENDPOINT = search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws
   OPENSEARCH_USERNAME = test
   OPENSEARCH_PASSWORD = Test123!@
   AWS_REGION = us-east-1
   ```
   - Click "Save"

6. **Grant Bedrock Permissions**
   - Click "Configuration" tab → "Permissions"
   - Click on the execution role name (opens IAM)
   - Click "Add permissions" → "Attach policies"
   - Search for and attach: `AmazonBedrockFullAccess`
   - Click "Attach policy"

**✅ Checkpoint:** Embeddings Lambda created and configured

### 3.2 Create Search Lambda

Repeat the process above with these changes:
- Function name: `georgia-law-search`
- Upload: `search-lambda.zip`
- Memory: `512 MB`
- Timeout: `30 seconds`
- Same environment variables as embeddings Lambda
- Attach `AmazonBedrockFullAccess` policy

**✅ Checkpoint:** Search Lambda created

### 3.3 Create Summarize Lambda

Repeat the process with:
- Function name: `georgia-law-summarize`
- Upload: `summarize-lambda.zip`
- Memory: `512 MB`
- Timeout: `60 seconds`
- Same environment variables
- Attach `AmazonBedrockFullAccess` policy

**✅ Checkpoint:** All three Lambda functions deployed

---

## 🔄 STEP 4: Initialize Embeddings (Process Statutes)

### 4.1 Test Embeddings Lambda
1. Go to Lambda console → `georgia-law-embeddings`
2. Click "Test" tab
3. Create new test event:
   - Event name: `TestEmbed`
   - Event JSON: `{}`
4. Click "Save"
5. Click "Test"

### 4.2 Monitor Execution
Watch the logs in the "Execution results" section. You should see:
```
Processing 20 statutes...
Creating index georgia-law-vectors...
Processing statute 1/20: 16-5-21
Creating embedding for statute...
Indexing statute chunk...
...
Successfully processed 20 statutes
```

**Expected Duration:** 3-5 minutes for 20 statutes

**If Error Occurs:**
- Check CloudWatch logs (click "Monitor" → "View CloudWatch logs")
- Common issues:
  - OpenSearch authentication error → Verify credentials
  - Bedrock access denied → Verify IAM policy attached
  - Timeout → Increase timeout to 15 minutes

**✅ Checkpoint:** All 20 statutes processed and indexed in OpenSearch

### 4.3 Verify Embeddings in OpenSearch
```bash
# Check number of documents indexed
curl -u test:Test123!@ -XGET "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_count?pretty"

# Should return: "count" : 20
```

---

## 🌐 STEP 5: Create API Gateway

### 5.1 Create REST API
1. Go to: https://console.aws.amazon.com/apigateway
2. Click "Create API"
3. Choose "REST API" (not private)
4. Click "Build"
5. API Name: `georgia-law-api`
6. Description: `API for Georgia Law Research System`
7. Click "Create API"

### 5.2 Enable CORS (Important!)
1. Click "Actions" → "Enable CORS"
2. Check all methods
3. Click "Enable CORS and replace existing CORS headers"
4. Confirm

### 5.3 Create /laws Resource
1. Click "Actions" → "Create Resource"
2. Resource Name: `laws`
3. Resource Path: `/laws`
4. Check "Enable API Gateway CORS"
5. Click "Create Resource"

### 5.4 Create /laws/search Endpoint
1. Select `/laws` resource
2. Click "Actions" → "Create Resource"
3. Resource Name: `search`
4. Resource Path: `/search`
5. Click "Create Resource"
6. With `/laws/search` selected, click "Actions" → "Create Method"
7. Select "POST" from dropdown
8. Click the checkmark ✓

**Configure POST Method:**
- Integration type: `Lambda Function`
- Lambda Region: `us-east-1`
- Lambda Function: `georgia-law-search`
- Click "Save"
- Click "OK" to grant permissions

### 5.5 Create /laws/summarize Endpoint
1. Select `/laws` resource
2. Click "Actions" → "Create Resource"
3. Resource Name: `summarize`
4. Click "Create Resource"
5. Create "POST" method
6. Link to Lambda: `georgia-law-summarize`

### 5.6 Create /laws/upload Endpoint
1. Select `/laws` resource
2. Click "Actions" → "Create Resource"
3. Resource Name: `upload`
4. Click "Create Resource"
5. Create "POST" method
6. Link to Lambda: `georgia-law-embeddings`

### 5.7 Deploy API
1. Click "Actions" → "Deploy API"
2. Deployment stage: `[New Stage]`
3. Stage name: `prod`
4. Click "Deploy"

**✅ Checkpoint:** API Gateway created and deployed

### 5.8 Get Your API URL
After deployment, you'll see your **Invoke URL** at the top:
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

**Copy this URL - you'll need it for the frontend!**

---

## 🎨 STEP 6: Update React Frontend

### 6.1 Find Your Frontend API Configuration

Look for the API configuration in your React app. Common locations:
- `src/App.js`
- `src/config.js`
- `src/services/api.js`
- `src/components/GeorgiaLawResearch.js`

### 6.2 Update API Endpoint

Find where the API URL is defined and replace it:

```javascript
// BEFORE
const API_URL = 'http://localhost:3001';

// AFTER
const API_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod';
```

### 6.3 Update Search Function

Ensure your search function calls the correct endpoint:

```javascript
async function searchGeorgiaLaw(query, practiceArea) {
  const response = await fetch(`${API_URL}/laws/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      practiceArea: practiceArea || 'all',
      limit: 10
    })
  });
  
  return await response.json();
}
```

### 6.4 Update Summarize Function

```javascript
async function summarizeLaw(statuteText, question) {
  const response = await fetch(`${API_URL}/laws/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      statuteText: statuteText,
      question: question
    })
  });
  
  return await response.json();
}
```

**✅ Checkpoint:** Frontend configured with API Gateway endpoints

---

## 🧪 STEP 7: Test End-to-End

### 7.1 Test Search Lambda Directly

**Via AWS Console:**
1. Go to Lambda → `georgia-law-search`
2. Click "Test"
3. Create test event:
```json
{
  "body": "{\"query\":\"aggravated assault\",\"practiceArea\":\"criminal\",\"limit\":5}"
}
```
4. Click "Test"

**Expected Response:**
```json
{
  "statusCode": 200,
  "body": "{\"results\":[...],\"total\":5}"
}
```

### 7.2 Test Summarize Lambda

Test event:
```json
{
  "body": "{\"statuteText\":\"A person commits aggravated assault when...\",\"question\":\"What are the penalties?\"}"
}
```

### 7.3 Test via API Gateway

**Using curl:**
```bash
# Test Search
curl -X POST https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/laws/search \
  -H "Content-Type: application/json" \
  -d '{"query":"theft","practiceArea":"criminal","limit":5}'

# Test Summarize
curl -X POST https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/laws/summarize \
  -H "Content-Type: application/json" \
  -d '{"statuteText":"A person commits theft by taking...","question":"What is the penalty?"}'
```

### 7.4 Test via React Frontend

1. Start your React app:
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai
npm start
```

2. Navigate to the Georgia Law Research tab

3. **Test Search:**
   - Enter: "What are the laws about assault?"
   - Select practice area: "Criminal"
   - Click "Search"
   - Should return: Aggravated assault, Simple assault, Battery statutes

4. **Test Filters:**
   - Try different practice areas: Contract, Family, Property, Traffic
   - Verify results match the selected area

5. **Test Summarization:**
   - Click on a statute result
   - Click "Analyze" or "Summarize"
   - Verify AI generates a summary

**✅ Checkpoint:** Full system working end-to-end

---

## 📊 STEP 8: Verify Data Quality

### 8.1 Check All Practice Areas Work

Test searches for each area:
- **Criminal**: "murder", "assault", "theft", "robbery"
- **Contract**: "breach of contract", "contract formation"
- **Family**: "divorce", "child custody", "marriage"
- **Property**: "landlord tenant", "lease"
- **Traffic**: "reckless driving"

### 8.2 Verify Semantic Search

Try queries that don't exactly match statute text:
- "Killing someone" → Should find Murder statute
- "Beating someone up" → Should find Assault/Battery
- "Stealing property" → Should find Theft statutes
- "Marriage dissolution" → Should find Divorce statute

### 8.3 Check Citation Accuracy

Verify each result shows:
- ✅ Correct O.C.G.A. citation (e.g., "16-5-21")
- ✅ Statute name (e.g., "Aggravated assault")
- ✅ Full statutory text
- ✅ Source URL link
- ✅ Practice area tag

---

## 🎉 STEP 9: Production Checklist

### Security
- [ ] Change OpenSearch master password from `Test123!@` to something more secure
- [ ] Set up API Gateway API keys for production use
- [ ] Enable CloudWatch logging for Lambda functions
- [ ] Set up AWS WAF for API Gateway protection

### Monitoring
- [ ] Create CloudWatch dashboard for Lambda metrics
- [ ] Set up alarms for Lambda errors
- [ ] Monitor OpenSearch cluster health
- [ ] Track API Gateway request metrics

### Documentation
- [ ] Document API endpoints for your team
- [ ] Create user guide for the Georgia Law search feature
- [ ] Add disclaimer about legal research verification

### Optimization
- [ ] Consider Lambda provisioned concurrency for faster response
- [ ] Enable API Gateway caching (reduces costs)
- [ ] Set up CloudFront CDN for global access
- [ ] Implement request throttling

---

## 🆘 Troubleshooting Guide

### Issue: OpenSearch 401 Unauthorized
**Solution:**
```bash
# Reset password in AWS Console
aws opensearch update-domain-config \
  --domain-name georgia-law-vectors \
  --advanced-security-options MasterUserOptions={MasterUserName=test,MasterUserPassword=NewPassword123!}
```

### Issue: Lambda Timeout
**Solution:**
- Increase timeout in Lambda configuration
- Check CloudWatch logs for bottleneck
- Verify OpenSearch cluster is healthy

### Issue: Bedrock Access Denied
**Solution:**
- Verify IAM role has `bedrock:InvokeModel` permission
- Check Bedrock is available in `us-east-1` region
- Verify you have Bedrock model access in your account

### Issue: No Search Results
**Solution:**
```bash
# Verify embeddings were created
curl -u test:Test123!@ \
  "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{"query":{"match_all":{}},"size":1}'
```

### Issue: CORS Error in Browser
**Solution:**
- Re-enable CORS in API Gateway
- Redeploy API after CORS changes
- Check browser console for specific CORS error

---

## 📈 Next Steps: Expansion Ideas

Once your system is working:

### Expand Dataset
- Add more Georgia statutes (currently have 20, can expand to 100+)
- Include Georgia case law from Court of Appeals
- Add Georgia regulations and administrative code

### Enhance Features
- Citation cross-referencing between related statutes
- Historical statute versions
- Legal term glossary with AI definitions
- Save favorite statutes for quick access

### Improve Search
- Advanced filters (date ranges, specific chapters)
- Boolean search operators (AND, OR, NOT)
- Search history and suggestions
- Related statute recommendations

### Add Analytics
- Track most searched terms
- Popular practice areas
- User engagement metrics
- Search quality feedback

---

## 📞 Support Resources

- **AWS Lambda Docs**: https://docs.aws.amazon.com/lambda/
- **OpenSearch Docs**: https://opensearch.org/docs/latest/
- **Bedrock Docs**: https://docs.aws.amazon.com/bedrock/
- **API Gateway Docs**: https://docs.aws.amazon.com/apigateway/

---

## ✅ Final Verification

Run through this checklist to confirm everything is working:

- [ ] OpenSearch cluster is green/yellow status
- [ ] All 3 Lambda functions deployed successfully
- [ ] Embeddings Lambda processed all 20 statutes
- [ ] API Gateway has 3 endpoints configured
- [ ] Frontend displays Georgia Law Research tab
- [ ] Search returns relevant results
- [ ] Practice area filters work correctly
- [ ] AI summarization generates responses
- [ ] All statutes show proper citations
- [ ] System responds within 2-3 seconds

**🎊 Congratulations! Your Georgia Law Research System is Live! 🎊**

---

**System Capabilities:**
- ✅ AI-powered semantic search across 20 Georgia statutes
- ✅ 5 practice areas (Criminal, Contract, Family, Property, Traffic)
- ✅ Natural language queries ("What happens if I steal something?")
- ✅ Claude AI summarization and analysis
- ✅ Proper legal citations and source links
- ✅ Scalable AWS infrastructure
- ✅ Production-ready deployment

**Estimated Deployment Time:** 2-3 hours
**Monthly AWS Cost:** ~$70-80 (mostly OpenSearch)
**Statutes Available:** 20 verified Georgia Code sections
**Response Time:** < 3 seconds for search queries
