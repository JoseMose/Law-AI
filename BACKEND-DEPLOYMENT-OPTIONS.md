# Deploy Backend to AWS Lambda

Your Law-AI application currently uses a Node.js Express server that's designed to run locally. For AWS Amplify deployment, you'll need to deploy the backend separately. Here are your options:

## Option 1: AWS Lambda + API Gateway (Recommended)

### Steps:
1. **Install Amplify CLI**: `npm install -g @aws-amplify/cli`
2. **Initialize Amplify**: `amplify init`
3. **Add API**: `amplify add api` (choose REST API)
4. **Deploy**: `amplify push`

### Advantages:
- Serverless (no server management)
- Auto-scaling
- Cost-effective (pay per use)
- Integrates seamlessly with Amplify

## Option 2: AWS Elastic Beanstalk

Deploy your existing Express server to Elastic Beanstalk:

### Steps:
1. **Install EB CLI**: `pip install awsebcli`
2. **Initialize**: `eb init` in `/server` directory
3. **Deploy**: `eb create` and `eb deploy`
4. **Update frontend**: Set `REACT_APP_API_URL` to your EB URL

## Option 3: Frontend-Only Mode (Quick Fix)

For immediate deployment, disable backend features:

### Environment Variables in Amplify Console:
```
REACT_APP_BACKEND_DISABLED=true
```

This will hide server-dependent features until you deploy the backend.

---

## Current Status

Your Amplify deployment is failing because:
- Frontend tries to connect to `localhost:3001` 
- This URL doesn't exist in the cloud environment
- Backend is not deployed to AWS yet

**Next Step**: Choose one of the options above to deploy your backend functionality.