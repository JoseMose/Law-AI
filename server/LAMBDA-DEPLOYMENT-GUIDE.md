# AWS Lambda Deployment Guide

Your AWS user `JosephEsfandiari` needs additional permissions for serverless deployment. Here are two options:

## Option 1: Add Required IAM Permissions (Recommended)

Add these policies to your AWS user `JosephEsfandiari`:

### CloudFormation Policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "lambda:*",
                "apigateway:*",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PassRole",
                "logs:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### Steps:
1. Go to AWS Console → IAM → Users → JosephEsfandiari
2. Click "Add permissions" → "Attach policies directly"
3. Create custom policy with the JSON above
4. Then run: `cd server && serverless deploy`

## Option 2: Manual Lambda Setup (Alternative)

If you can't add CloudFormation permissions, you can create the Lambda manually:

### Steps:
1. **Create Lambda Function**:
   - Go to AWS Console → Lambda
   - Create function → Author from scratch
   - Name: `law-ai-backend`
   - Runtime: Node.js 18.x
   - Role: Use existing role with S3, Cognito, Textract, Bedrock permissions

2. **Upload Code**:
   ```bash
   cd server
   zip -r law-ai-backend.zip . -x "node_modules/*" ".env"
   npm install --production
   zip -r law-ai-backend.zip node_modules
   ```
   - Upload the zip file to Lambda

3. **Set Environment Variables** in Lambda:
   - AWS_REGION: us-east-1
   - COGNITO_CLIENT_ID: 1p3ks3hsp9a9p2jogk8h9km9
   - COGNITO_CLIENT_SECRET: 152qllbnetkfmtfsec80jb5rlfm3cjg6m5hh8pqndt6e8q4rjgs
   - COGNITO_USER_POOL_ID: us-east-1_1kLOdae9J
   - S3_BUCKET_NAME: contractfiles1

4. **Create API Gateway**:
   - Go to API Gateway → Create API → REST API
   - Create resource `{proxy+}` with ANY method
   - Integration: Lambda Function → `law-ai-backend`
   - Deploy API and note the endpoint URL

5. **Update Frontend**:
   - Set `REACT_APP_API_URL` in Amplify to your API Gateway URL
   - Remove `REACT_APP_BACKEND_DISABLED=true`

## Recommendation
Try Option 1 first - it's much easier and handles all the infrastructure automatically.