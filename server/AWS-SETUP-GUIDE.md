# AWS Configuration Setup Guide

## Current Status
✅ Environment variables are properly configured
❌ IAM permissions need to be set up

## Required Actions Before Pushing to Git

### 1. Apply IAM Policy to Your User

Your AWS user `JosephEsfandiari` needs the attached IAM policy. 

**Option A: Use AWS Console**
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Find user "JosephEsfandiari" 
3. Click "Add permissions" → "Attach existing policies directly"
4. Create a new policy using the JSON in `iam-policy.json`
5. Attach the policy to your user

**Option B: Use AWS CLI (if installed)**
```bash
aws iam put-user-policy \
  --user-name JosephEsfandiari \
  --policy-name LawAIAppPolicy \
  --policy-document file://iam-policy.json
```

### 2. Verify S3 Bucket Exists and is Accessible

Check if bucket `contractfiles1` exists in us-east-1:
- Go to [S3 Console](https://s3.console.aws.amazon.com/s3/)
- Look for bucket `contractfiles1`
- If it doesn't exist, create it in `us-east-1` region

### 3. Test Configuration

After applying IAM policy, test by starting the server:
```bash
node index.js
```

You should see successful AWS connection messages in the console output.

### 4. What Each Service Needs

**S3 (Required - File Storage):**
- ✅ Bucket: `contractfiles1` 
- ✅ Region: `us-east-1`
- ❌ Permissions: Need s3:GetObject, s3:PutObject, s3:DeleteObject

**Cognito (Required - Authentication):**
- ✅ User Pool: `us-east-1_1kLOdae9J`
- ✅ Client ID: `1p3ks3hsp9a9p2jogk8h9km9`
- ❌ Permissions: Need cognito-idp:AdminInitiateAuth, cognito-idp:GetUser

**Textract (Optional - PDF Text Extraction):**
- Currently disabled (`TEXTRACT_ENABLED=false`)
- Can enable later with proper permissions

**Bedrock (Optional - AI Analysis):**  
- Currently disabled (`BEDROCK_ENABLED=false`)
- Can enable later with proper permissions

## Security Check ✅

Your secrets are properly secured:
- ✅ `server/.env` is git-ignored
- ✅ No hardcoded credentials in source
- ✅ Template file `server/.env.example` has placeholders only

## Next Steps

1. **Apply the IAM policy** (most important)
2. **Verify bucket exists**
3. **Test by starting the server with `node index.js`**
4. **When server starts successfully, you're ready to push to Git**

The application will work with basic S3 and Cognito permissions. AI features (Textract/Bedrock) can be enabled later by setting the environment flags to `true`.