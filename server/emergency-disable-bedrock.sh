#!/bin/bash

# Emergency script to disable Bedrock-calling Lambda functions
# Run this IMMEDIATELY to stop the bleeding

set -e

echo "🚨 EMERGENCY: Disabling Bedrock Lambda functions to stop costs"
echo ""

REGION="us-west-2"

# Function to disable a Lambda
disable_lambda() {
    FUNCTION_NAME=$1
    echo "Disabling $FUNCTION_NAME..."
    
    # Set reserved concurrency to 0 (prevents any executions)
    aws lambda put-function-concurrency \
        --function-name "$FUNCTION_NAME" \
        --reserved-concurrent-executions 0 \
        --region "$REGION" 2>/dev/null && \
        echo "✅ $FUNCTION_NAME disabled" || \
        echo "❌ Could not disable $FUNCTION_NAME"
}

# Disable all Bedrock-using functions
disable_lambda "georgia-law-summarize"
disable_lambda "georgia-law-search"
disable_lambda "georgia-law-embeddings"
disable_lambda "lawai-serverless-dev-api"

echo ""
echo "✅ All Bedrock Lambda functions have been throttled to 0 concurrent executions"
echo "This means they CANNOT run and will not incur any more Bedrock charges"
echo ""
echo "To re-enable a function later:"
echo "aws lambda delete-function-concurrency --function-name FUNCTION_NAME --region us-west-2"
echo ""
echo "Next steps:"
echo "1. Review EMERGENCY-COST-FIX.md"
echo "2. Check CloudWatch logs to see what happened on Oct 25"
echo "3. Set up cost alarms"
echo "4. Add rate limiting before re-enabling"
