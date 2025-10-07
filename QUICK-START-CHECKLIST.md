# ⚡ Quick Start Deployment Checklist

Use this alongside the COMPLETE-DEPLOYMENT-GUIDE.md for step-by-step instructions.

## 🎯 Phase 1: Verify Setup (15 mins)

### OpenSearch Access
```bash
# Test OpenSearch connection
curl -u test:Test123!@ -XGET "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/_cluster/health?pretty"
```
- [ ] Returns `200 OK` with cluster health
- [ ] Can access dashboard: https://search-georgia-law-vectors.../_dashboards

### Verify Data Ready
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server/data
cat georgia-code.json | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin))} statutes ready')"
```
- [ ] Shows "20 statutes ready"

---

## 📦 Phase 2: Create Deployment Packages (20 mins)

```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai/server

# Create deployment folder
mkdir -p lambda-deploy
cd lambda-deploy

# Copy files
cp ../lambda-law-embeddings.js .
cp ../lambda-law-search.js .
cp ../lambda-law-summarize.js .
cp -r ../data .

# Copy node modules (important!)
mkdir -p node_modules
cp -r ../node_modules/@opensearch-project ./node_modules/
cp -r ../node_modules/@aws-sdk ./node_modules/

# Create ZIPs
zip -r embeddings-lambda.zip lambda-law-embeddings.js data/ node_modules/
zip -r search-lambda.zip lambda-law-search.js node_modules/
zip -r summarize-lambda.zip lambda-law-summarize.js node_modules/

# Verify
ls -lh *.zip
```

- [ ] `embeddings-lambda.zip` created (~50MB)
- [ ] `search-lambda.zip` created (~30MB)
- [ ] `summarize-lambda.zip` created (~30MB)

---

## ☁️ Phase 3: Deploy Lambdas (30 mins)

### Lambda 1: georgia-law-embeddings
**Console:** https://console.aws.amazon.com/lambda

1. Create function → `georgia-law-embeddings` → Node.js 20.x
2. Upload `embeddings-lambda.zip`
3. Configuration:
   - Memory: `1024 MB`
   - Timeout: `900 seconds (15 min)`
4. Environment variables:
   ```
   OPENSEARCH_ENDPOINT = search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws
   OPENSEARCH_USERNAME = test
   OPENSEARCH_PASSWORD = Test123!@
   AWS_REGION = us-east-1
   ```
5. Permissions → Attach `AmazonBedrockFullAccess`

- [ ] Lambda created
- [ ] Code uploaded
- [ ] Settings configured
- [ ] Environment variables set
- [ ] Bedrock permission attached

### Lambda 2: georgia-law-search
Repeat with:
- Name: `georgia-law-search`
- ZIP: `search-lambda.zip`
- Memory: `512 MB`
- Timeout: `30 seconds`
- Same environment variables
- Same Bedrock permission

- [ ] Lambda created and configured

### Lambda 3: georgia-law-summarize
Repeat with:
- Name: `georgia-law-summarize`
- ZIP: `summarize-lambda.zip`
- Memory: `512 MB`
- Timeout: `60 seconds`
- Same environment variables
- Same Bedrock permission

- [ ] Lambda created and configured

---

## 🔄 Phase 4: Initialize Data (10 mins)

### Run Embeddings Lambda
1. Go to `georgia-law-embeddings` Lambda
2. Test tab → Create test event:
   ```json
   {}
   ```
3. Click "Test"
4. Wait 3-5 minutes

**Watch for:**
```
Processing 20 statutes...
Processing statute 1/20: 16-5-21
Processing statute 2/20: 16-5-20
...
Successfully processed 20 statutes
```

- [ ] Lambda executes without errors
- [ ] Logs show "20 statutes" processed
- [ ] No timeout errors

### Verify in OpenSearch
```bash
curl -u test:Test123!@ "https://search-georgia-law-vectors-cwzwhebzexax6m2hn33s32ewsy.aos.us-east-1.on.aws/georgia-law-vectors/_count?pretty"
```

- [ ] Returns `"count" : 20`

---

## 🌐 Phase 5: Create API Gateway (30 mins)

**Console:** https://console.aws.amazon.com/apigateway

### Create API
1. Create API → REST API → Build
2. Name: `georgia-law-api`
3. Click "Create"

- [ ] API created

### Enable CORS
1. Actions → Enable CORS
2. Check all methods → Enable

- [ ] CORS enabled

### Create Endpoints

**Resource: /laws**
1. Actions → Create Resource
2. Name: `laws`, Path: `/laws`
3. Enable CORS → Create

**Endpoint: /laws/search**
1. Select `/laws` → Create Resource
2. Name: `search` → Create
3. Create Method → POST
4. Lambda Function: `georgia-law-search`
5. Save → OK

- [ ] `/laws/search` created

**Endpoint: /laws/summarize**
1. Select `/laws` → Create Resource
2. Name: `summarize` → Create
3. Create Method → POST
4. Lambda: `georgia-law-summarize`

- [ ] `/laws/summarize` created

**Endpoint: /laws/upload**
1. Select `/laws` → Create Resource
2. Name: `upload` → Create
3. Create Method → POST
4. Lambda: `georgia-law-embeddings`

- [ ] `/laws/upload` created

### Deploy API
1. Actions → Deploy API
2. Stage: `[New Stage]` → `prod`
3. Deploy

**Copy your API URL:**
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

- [ ] API deployed
- [ ] API URL copied

---

## 🧪 Phase 6: Test System (15 mins)

### Test via curl

```bash
# Replace xxxxxxxxxx with your API ID
export API_URL="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"

# Test Search
curl -X POST $API_URL/laws/search \
  -H "Content-Type: application/json" \
  -d '{"query":"assault","practiceArea":"criminal","limit":5}'

# Test Summarize
curl -X POST $API_URL/laws/summarize \
  -H "Content-Type: application/json" \
  -d '{"statuteText":"A person commits theft by taking when...","question":"What is the penalty?"}'
```

- [ ] Search returns results
- [ ] Summarize returns AI analysis

---

## 🎨 Phase 7: Update Frontend (10 mins)

### Find API Configuration
Common locations:
- `src/App.js`
- `src/config.js`  
- `src/services/api.js`

### Update API URL
```javascript
// Replace this
const API_URL = 'http://localhost:3001';

// With your API Gateway URL
const API_URL = 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod';
```

- [ ] API URL updated in frontend
- [ ] Frontend saved

### Test Frontend
```bash
cd /Users/josephesfandiari/Lawyer\ App/law-ai
npm start
```

1. Open app in browser
2. Go to Georgia Law Research tab
3. Search for "assault"
4. Verify results appear

- [ ] Frontend connects to API
- [ ] Search returns results
- [ ] Statutes display correctly

---

## ✅ Final Verification

Run these tests:

### Search Tests
- [ ] Search "murder" → Returns murder statute
- [ ] Search "theft" → Returns theft statutes
- [ ] Search "divorce" → Returns divorce statute
- [ ] Filter by "Criminal" → Only criminal statutes
- [ ] Filter by "Family" → Only family law statutes

### AI Tests
- [ ] Click "Summarize" on a statute → AI generates summary
- [ ] Ask a question → AI provides relevant answer

### Quality Checks
- [ ] Each result shows O.C.G.A. citation
- [ ] Source URLs are clickable
- [ ] Practice area tags are correct
- [ ] Full text is readable

---

## 🎊 SUCCESS!

If all checkboxes are marked, your Georgia Law Research system is LIVE!

**What You've Built:**
- ✅ 20 Georgia statutes searchable with AI
- ✅ 5 practice areas (Criminal, Contract, Family, Property, Traffic)
- ✅ Natural language search
- ✅ AI-powered analysis with Claude
- ✅ Scalable AWS infrastructure
- ✅ Professional legal research tool

---

## 🆘 Quick Troubleshooting

**OpenSearch 401 Error:**
```bash
# Reset password in AWS Console
# OpenSearch → georgia-law-vectors → Actions → Modify authentication
```

**Lambda Timeout:**
- Increase timeout: Configuration → General → Edit → Timeout: 900 seconds

**No Search Results:**
- Re-run embeddings Lambda (Test button)
- Check CloudWatch logs for errors

**CORS Error:**
- API Gateway → Actions → Enable CORS → Redeploy

**Frontend Not Connecting:**
- Verify API URL is correct
- Check browser console for errors
- Test API with curl first

---

## 📞 Need Help?

See COMPLETE-DEPLOYMENT-GUIDE.md for detailed instructions on each step.

**Estimated Total Time:** 2-3 hours
**Difficulty:** Intermediate
**Cost:** ~$70-80/month (AWS)
