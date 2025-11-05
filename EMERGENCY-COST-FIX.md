# 🚨 EMERGENCY: $700 Bedrock Cost Issue - Action Plan

## Problem Identified
You're being charged for **multiple Claude models** that aren't in your code:
- Claude Sonnet 4.5: $585.74
- Claude Sonnet 4: $63.71  
- Claude 3.7 Sonnet: $37.80
- Claude 3.5 Sonnet: $1.30

## Root Causes
1. **Multiple deployed Lambda functions in us-west-2 calling Bedrock**
   - `georgia-law-summarize`
   - `georgia-law-embeddings`
   - `georgia-law-search`
   - `lawai-serverless-dev-api`

2. **Models don't match your code** - Someone changed model IDs in AWS Console or there are old deployments

3. **No rate limiting or cost controls**

## IMMEDIATE ACTIONS (DO NOW!)

### 1. Delete Unused Lambda Functions
```bash
# Delete the old serverless Lambda (likely the culprit)
aws lambda delete-function --function-name lawai-serverless-dev-api --region us-west-2

# Or disable it first to test
aws lambda update-function-configuration \
  --function-name lawai-serverless-dev-api \
  --region us-west-2 \
  --environment 'Variables={BEDROCK_ENABLED=false}'
```

### 2. Check What's Actually Deployed
```bash
# Get the actual code from deployed Lambda
aws lambda get-function --function-name georgia-law-summarize --region us-west-2

# Download and inspect it
aws lambda get-function --function-name georgia-law-summarize --region us-west-2 \
  --query 'Code.Location' --output text | xargs curl -o deployed-function.zip
```

### 3. Set Up Cost Alarms IMMEDIATELY
```bash
# Create CloudWatch alarm for Bedrock costs
aws cloudwatch put-metric-alarm \
  --alarm-name bedrock-daily-cost-alarm \
  --alarm-description "Alert if Bedrock costs exceed $50/day" \
  --metric-name EstimatedCharges \
  --namespace AWS/Bedrock \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --region us-east-1
```

### 4. Add Throttling to Lambda Functions
```bash
# Limit concurrent executions
aws lambda put-function-concurrency \
  --function-name georgia-law-summarize \
  --reserved-concurrent-executions 2 \
  --region us-west-2

aws lambda put-function-concurrency \
  --function-name georgia-law-search \
  --reserved-concurrent-executions 5 \
  --region us-west-2
```

### 5. Check API Gateway Usage
```bash
# See if API Gateway has usage plans/throttling
aws apigateway get-usage-plans --region us-west-2

# Check recent API calls
aws apigateway get-usage \
  --usage-plan-id YOUR_PLAN_ID \
  --start-date 2025-10-25 \
  --end-date 2025-10-26 \
  --region us-west-2
```

## Prevention Measures

### 1. Add Request Caching to Lambda
See `lambda-law-summarize-with-cache.js` (created separately)

### 2. Add Rate Limiting in Frontend
```javascript
// In LegalResearchPage.js
const [lastApiCall, setLastApiCall] = useState(0);
const MIN_API_INTERVAL = 2000; // 2 seconds between calls

const handleAnalyze = async (statute) => {
  const now = Date.now();
  if (now - lastApiCall < MIN_API_INTERVAL) {
    alert('Please wait before making another request');
    return;
  }
  setLastApiCall(now);
  // ... rest of function
};
```

### 3. Switch to Cheaper Models
- Use Claude 3.5 Haiku ($0.25/MTok input) instead of Sonnet ($3/MTok)
- Use smaller context windows
- Cache responses aggressively

### 4. Monitor AWS Costs Daily
```bash
# Get today's costs
aws ce get-cost-and-usage \
  --time-period Start=2025-10-25,End=2025-10-26 \
  --granularity DAILY \
  --metrics BlendedCost \
  --filter file://bedrock-filter.json
```

## Investigation Steps

1. **Check CloudWatch Logs for Oct 25:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/georgia-law-summarize \
  --start-time $(date -d '2025-10-25' +%s)000 \
  --end-time $(date -d '2025-10-26' +%s)000 \
  --region us-west-2
```

2. **Check who made the calls (CloudTrail):**
```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=InvokeModel \
  --start-time 2025-10-25T00:00:00Z \
  --end-time 2025-10-26T00:00:00Z \
  --region us-west-2
```

3. **List all Bedrock model invocations:**
```bash
aws bedrock-runtime list-model-invocation-jobs --region us-west-2
```

## Questions to Answer

1. **Did someone access your AWS Console on Oct 25?** Check CloudTrail
2. **Are there scheduled tasks?** Check EventBridge rules
3. **Is there a test script running?** Check your local machine for cron jobs
4. **Are the API endpoints public?** Check API Gateway CORS/auth settings

## Cost Breakdown Analysis

Given the costs:
- **$585 for Sonnet 4.5** = ~195M tokens (at ~$3/MTok)
- That's analyzing ~195,000 statute chunks or 19,500 full statute analyses
- OR someone ran the embeddings Lambda hundreds of times

## Likely Scenario

Based on the evidence, most likely one of these happened:
1. Someone clicked "Analyze" button repeatedly in your UI
2. A page with auto-refresh kept calling the API
3. The embeddings Lambda ran multiple times processing all statutes
4. Someone was manually testing different Claude models in AWS Console

## Next Steps After Emergency Fix

1. Review all deployed Lambda functions
2. Add authentication to API Gateway
3. Implement request caching
4. Set up cost monitoring dashboard
5. Use cheaper models (Haiku instead of Sonnet)
6. Add exponential backoff for retries
7. Implement user quotas
