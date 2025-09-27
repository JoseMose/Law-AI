#!/bin/bash
# Script to create Lambda deployment package

echo "Creating Lambda deployment package..."

# Create temp directory
mkdir -p temp-deploy
cd temp-deploy

# Copy source files (exclude .env for security)
cp ../lambda.js .
cp ../index.js .
cp ../package.json .
cp -r ../data .

# Install production dependencies
npm install --production

# Create deployment zip
zip -r ../law-ai-backend.zip .

# Cleanup
cd ..
rm -rf temp-deploy

echo "✅ Deployment package created: law-ai-backend.zip"
echo ""
echo "Next steps:"
echo "1. Go to AWS Console → Lambda"
echo "2. Create function → Author from scratch" 
echo "3. Name: law-ai-backend, Runtime: Node.js 18.x"
echo "4. Upload law-ai-backend.zip"
echo "5. Set Handler to: lambda.handler"
echo "6. Add environment variables from .env file"
echo "7. Create API Gateway integration"